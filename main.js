// ===== Tunable constants =====
const PATTERN_LENGTH = 16;
const REPS_PER_PATTERN = 2;
const BPM_DEFAULT = 90;
const BPM_MIN = 40;
const BPM_MAX = 120;
const INPUT_LATENCY_DEFAULT_MS = 15;
const INPUT_LATENCY_MIN_MS = 0;
const INPUT_LATENCY_MAX_MS = 400;
const HIT_TOLERANCE_DEFAULT = 50;
const HIT_TOLERANCE_MIN = 0;
const HIT_TOLERANCE_MAX = 100;
const HIT_WINDOW_DEFAULT_MS = 250;
const HIT_WINDOW_MAX_MS = 250;
const CALIBRATION_BPM = 60;
const CALIBRATION_BEATS = 16;
const CALIBRATION_MAX_DELAY_MS = 500;
const SCHED_LOOKAHEAD_MS = 120;
const SCHED_INTERVAL_MS = 25;
const MAX_SCORE = 5;

const FIRST_HIT_INDICES = [1, 2, 3];
const FIRST_HIT_WEIGHTS_DEFAULT = [5, 10, 5];
const JUMP_VALUES = [1, 2, 3, 4, 5];
const JUMP_WEIGHTS_DEFAULT = [1, 10, 10, 1, 1];

const DRUM_GAIN = {
  snare: 0.42,
  kick: 0.6,
  hihat: 0.22,
  cymbal: 0.18
};

const DRUM_TUNING = {
  snare: { decay: 0.1, bpFreq: 2200, bpQ: 1.5 },
  kick: { startFreq: 120, endFreq: 50, decay: 0.15 },
  hihat: { decay: 0.03, hpFreq: 5500 },
  cymbal: { hpFreq: 4200 }
};

const START_COUNTIN_BEATS = 4;

const PHASE = {
  LISTEN: 'LISTEN',
  TAP: 'TAP',
  CALIBRATION: 'CALIBRATION'
};


const STORAGE_KEYS = {
  bpm: 'rhythmTrainer.bpm',
  latencyOffsetMs: 'rhythmTrainer.latencyOffsetMs',
  hitTolerance: 'rhythmTrainer.hitTolerance',
  hitWindowMs: 'rhythmTrainer.hitWindowMs'
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function saveSetting(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch (_error) {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

function loadStoredNumber(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

const ui = {
  bpm: document.getElementById('bpm'),
  bpmValue: document.getElementById('bpmValue'),
  latency: document.getElementById('latency'),
  latencyValue: document.getElementById('latencyValue'),
  hitTolerance: document.getElementById('hitTolerance'),
  hitToleranceDisplay: document.getElementById('hitToleranceDisplay'),
  hitWindow: document.getElementById('hitWindow'),
  hitWindowDisplay: document.getElementById('hitWindowDisplay'),
  clearCache: document.getElementById('clearCache'),
  calibration: document.getElementById('calibration'),
  calibrationResult: document.getElementById('calibrationResult'),
  testLog: document.getElementById('testLog'),
  startStop: document.getElementById('startStop'),
  tapZone: document.getElementById('tapZone'),
  probabilityInputs: [
    { input: document.getElementById('weightFirst2'), value: document.getElementById('weightFirst2Value'), group: 'first', index: 0 },
    { input: document.getElementById('weightFirst3'), value: document.getElementById('weightFirst3Value'), group: 'first', index: 1 },
    { input: document.getElementById('weightFirst4'), value: document.getElementById('weightFirst4Value'), group: 'first', index: 2 },
    { input: document.getElementById('weightJump1'), value: document.getElementById('weightJump1Value'), group: 'jump', index: 0 },
    { input: document.getElementById('weightJump2'), value: document.getElementById('weightJump2Value'), group: 'jump', index: 1 },
    { input: document.getElementById('weightJump3'), value: document.getElementById('weightJump3Value'), group: 'jump', index: 2 },
    { input: document.getElementById('weightJump4'), value: document.getElementById('weightJump4Value'), group: 'jump', index: 3 },
    { input: document.getElementById('weightJump5'), value: document.getElementById('weightJump5Value'), group: 'jump', index: 4 }
  ]
};

const state = {
  audioCtx: null,
  noiseBuffer: null,
  isRunning: false,
  isCalibrating: false,
  bpm: BPM_DEFAULT,
  latencyOffsetMs: INPUT_LATENCY_DEFAULT_MS,
  hitTolerance: HIT_TOLERANCE_DEFAULT,
  hitWindowMs: HIT_WINDOW_DEFAULT_MS,

  firstHitWeights: [...FIRST_HIT_WEIGHTS_DEFAULT],
  jumpWeights: [...JUMP_WEIGHTS_DEFAULT],

  patternNumber: 1,
  pattern: [],
  repetition: 1,
  phase: PHASE.LISTEN,
  liveRepetition: 1,
  livePhase: PHASE.LISTEN,

  currentMeasureStart: 0,
  nextMeasureTime: 0,
  scheduleTimer: null,

  expectedHits: [],
  expectedIndex: 0,
  score: MAX_SCORE,
  scoreRecoveryFrame: null,

  calibrationTargets: [],
  calibrationMatched: new Set(),
  calibrationDelays: [],

  logEvents: [],
  tapMeasureStart: 0,
  tapPattern: null
};

function weightedChoice(values, weights) {
  const safeWeights = weights.map((weight) => Math.max(0, Number(weight) || 0));
  const total = safeWeights.reduce((sum, n) => sum + n, 0);
  if (total <= 0) return values[0];

  const r = Math.random() * total;
  let acc = 0;
  for (let i = 0; i < values.length; i += 1) {
    acc += safeWeights[i];
    if (r <= acc) return values[i];
  }
  return values[values.length - 1];
}

function generatePattern() {
  const p = Array(PATTERN_LENGTH).fill(0);
  let pos = weightedChoice(FIRST_HIT_INDICES, state.firstHitWeights);
  while (pos < 15) {
    p[pos] = 1;
    pos += weightedChoice(JUMP_VALUES, state.jumpWeights);
  }
  p[15] = 0;
  return p;
}

function getSubdivDur() {
  return (60 / state.bpm) / 4;
}

function getSubdivMs() {
  return getSubdivDur() * 1000;
}

function getHitToleranceMs() {
  const beatMs = 60000 / state.bpm;
  const minToleranceMs = beatMs / 8;
  const maxToleranceMs = beatMs / 4;
  return minToleranceMs + ((state.hitTolerance / 100) * (maxToleranceMs - minToleranceMs));
}

function getMinHitWindowMs() {
  return Math.round(getSubdivMs());
}

function formatPatternForLog(pattern) {
  return pattern
    .map((value, idx) => {
      const marker = value === 1 ? '!' : "'";
      const spacer = (idx + 1) % 4 === 0 && idx < pattern.length - 1 ? ' ' : '';
      return `${marker}${spacer}`;
    })
    .join('');
}

function updateHitToleranceUI() {
  const toleranceMs = Math.round(getHitToleranceMs());
  ui.hitToleranceDisplay.textContent = `${state.hitTolerance} (${toleranceMs} ms)`;
}

function updateHitWindowUI() {
  const minHitWindowMs = getMinHitWindowMs();
  const effectiveMax = Math.max(HIT_WINDOW_MAX_MS, minHitWindowMs);
  state.hitWindowMs = clamp(state.hitWindowMs, minHitWindowMs, effectiveMax);
  ui.hitWindow.min = String(minHitWindowMs);
  ui.hitWindow.max = String(effectiveMax);
  ui.hitWindow.value = String(state.hitWindowMs);
  ui.hitWindowDisplay.textContent = String(state.hitWindowMs);
}

function applyPersistedSettings() {
  const storedBpm = loadStoredNumber(STORAGE_KEYS.bpm);
  if (storedBpm !== null) {
    state.bpm = clamp(Math.round(storedBpm), BPM_MIN, BPM_MAX);
  }

  const storedLatency = loadStoredNumber(STORAGE_KEYS.latencyOffsetMs);
  if (storedLatency !== null) {
    state.latencyOffsetMs = clamp(Math.round(storedLatency), INPUT_LATENCY_MIN_MS, INPUT_LATENCY_MAX_MS);
  }

  const storedTolerance = loadStoredNumber(STORAGE_KEYS.hitTolerance);
  if (storedTolerance !== null) {
    state.hitTolerance = clamp(Math.round(storedTolerance), HIT_TOLERANCE_MIN, HIT_TOLERANCE_MAX);
  }

  const storedHitWindowMs = loadStoredNumber(STORAGE_KEYS.hitWindowMs);
  if (storedHitWindowMs !== null) {
    state.hitWindowMs = Math.round(storedHitWindowMs);
  }
}

function getMeasureDur() {
  return getSubdivDur() * PATTERN_LENGTH;
}

function unlockAudio() {
  if (!state.audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new Ctx();
    state.noiseBuffer = createNoiseBuffer(state.audioCtx, 1.0);
  }

  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
}

function createNoiseBuffer(ctx, seconds) {
  const sampleCount = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i += 1) {
    data[i] = (Math.random() * 2) - 1;
  }
  return buffer;
}

function playSnare(time) {
  const ctx = state.audioCtx;
  const source = ctx.createBufferSource();
  source.buffer = state.noiseBuffer;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(DRUM_TUNING.snare.bpFreq, time);
  bp.Q.setValueAtTime(DRUM_TUNING.snare.bpQ, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(DRUM_GAIN.snare, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + DRUM_TUNING.snare.decay);

  source.connect(bp).connect(gain).connect(ctx.destination);
  source.start(time);
  source.stop(time + DRUM_TUNING.snare.decay + 0.02);
}

function playKick(time) {
  const ctx = state.audioCtx;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(DRUM_TUNING.kick.startFreq, time);
  osc.frequency.exponentialRampToValueAtTime(DRUM_TUNING.kick.endFreq, time + DRUM_TUNING.kick.decay);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(DRUM_GAIN.kick, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + DRUM_TUNING.kick.decay);

  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + DRUM_TUNING.kick.decay + 0.02);
}

function playHiHat(time) {
  const ctx = state.audioCtx;
  const src = ctx.createBufferSource();
  src.buffer = state.noiseBuffer;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(DRUM_TUNING.hihat.hpFreq, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(DRUM_GAIN.hihat, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + DRUM_TUNING.hihat.decay);

  src.connect(hp).connect(gain).connect(ctx.destination);
  src.start(time);
  src.stop(time + DRUM_TUNING.hihat.decay + 0.01);
}

function playCymbalCrescendo(startTime, endTime) {
  const ctx = state.audioCtx;
  const src = ctx.createBufferSource();
  src.buffer = state.noiseBuffer;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(DRUM_TUNING.cymbal.hpFreq, startTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(DRUM_GAIN.cymbal, endTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime + 0.04);

  src.connect(hp).connect(gain).connect(ctx.destination);
  src.start(startTime);
  src.stop(endTime + 0.05);
}


function appendLog(message) {
  state.logEvents.push(message);
  ui.testLog.textContent = state.logEvents.length > 0
    ? state.logEvents.join('\n')
    : "Le log des erreurs s'affichera ici pendant la phase TAP.";
}

function resetLog() {
  state.logEvents = [];
  ui.testLog.textContent = "Le log des erreurs s'affichera ici pendant la phase TAP.";
}

function formatErrorMs(ms) {
  const rounded = Math.round(ms);
  if (rounded === 0) return '0 ms';
  if (rounded > 0) return `${rounded} ms late`;
  return `${Math.abs(rounded)} ms early`;
}

function consumeScorePoint() {
  if (state.score <= 0) return;
  state.score -= 1;
  updateScoreUI();
  flashScore();
}

function prepareTapPhase(measureStart, patternForMeasure) {
  state.expectedHits = [];
  state.expectedIndex = 0;
  state.tapMeasureStart = measureStart;
  state.tapPattern = [...patternForMeasure];
  const subdivDur = getSubdivDur();

  if (state.logEvents.length > 0) appendLog('______');
  appendLog(formatPatternForLog(patternForMeasure));

  patternForMeasure.forEach((value, idx) => {
    if (value !== 1 || idx === 15) return;
    const targetTime = measureStart + (idx * subdivDur);
    state.expectedHits.push({
      idx,
      targetTime,
      consumed: false,
      validated: false,
      correct: false,
      missed: false
    });

  });

  state.score = MAX_SCORE;
  updateScoreUI();
}


function isHitJudged(hit) {
  return Boolean(hit.consumed || hit.validated || hit.missed);
}

function advanceExpectedIndex() {
  while (state.expectedIndex < state.expectedHits.length && isHitJudged(state.expectedHits[state.expectedIndex])) {
    state.expectedIndex += 1;
  }
}

function getClosestCandidateFromExpectedWindow(adjustedTapTime) {
  if (state.expectedHits.length === 0) return null;

  advanceExpectedIndex();

  const from = Math.max(0, state.expectedIndex - 2);
  const to = Math.min(state.expectedHits.length - 1, state.expectedIndex + 2);
  let closestHit = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = from; i <= to; i += 1) {
    const hit = state.expectedHits[i];
    if (isHitJudged(hit)) continue;

    const distance = Math.abs(adjustedTapTime - hit.targetTime);
    if (!closestHit || distance < bestDistance || (distance === bestDistance && hit.targetTime < closestHit.targetTime)) {
      bestDistance = distance;
      closestHit = hit;
    }
  }

  if (!closestHit) return null;
  return { hit: closestHit, distanceSec: bestDistance };
}

function markLiveMisses() {
  if (!state.audioCtx || state.livePhase !== PHASE.TAP) return;

  const adjustedNow = state.audioCtx.currentTime - (state.latencyOffsetMs / 1000);
  // Keep auto-miss timing aligned with the user-configurable hit window.
  const missDelaySec = state.hitWindowMs / 1000;

  state.expectedHits.forEach((hit) => {
    if (isHitJudged(hit)) return;
    if (adjustedNow > hit.targetTime + missDelaySec) {
      hit.consumed = true;
      hit.missed = true;
      consumeScorePoint();
      appendLog(`note[${hit.idx + 1}] missed`);
    }
  });

  advanceExpectedIndex();
}


function scheduleMeasure(measureStart, phase, repetition, patternForMeasure) {
  const subdivDur = getSubdivDur();
  const phaseStartTime = phase === PHASE.TAP ? measureStart - subdivDur : measureStart;

  setTimeout(() => {
    state.livePhase = phase;
    state.liveRepetition = repetition;
    updateStaticUI();

    if (phase === PHASE.TAP) {
      stopScoreRecoveryAnimation();
      prepareTapPhase(measureStart, patternForMeasure);
    } else if (phase === PHASE.LISTEN) {
      startListenScoreRecovery(getMeasureDur() * 1000);
    }
  }, Math.max(0, (phaseStartTime - state.audioCtx.currentTime) * 1000));

  for (let idx = 0; idx < PATTERN_LENGTH; idx += 1) {
    const eventTime = measureStart + (idx * subdivDur);

    if (patternForMeasure[idx] === 1) {
      playSnare(eventTime);
    }

    if (idx % 4 === 0) playKick(eventTime);
  }

  if (phase === PHASE.LISTEN) {
    playCymbalCrescendo(measureStart + (14 * subdivDur), measureStart + (16 * subdivDur));
  }
}

function flashScore() {
  ui.tapZone.classList.remove('loss-flash');
  // Force restart of the short loss animation on consecutive misses.
  void ui.tapZone.offsetWidth;
  ui.tapZone.classList.add('loss-flash');
}

function stopScoreRecoveryAnimation() {
  if (state.scoreRecoveryFrame !== null) {
    cancelAnimationFrame(state.scoreRecoveryFrame);
    state.scoreRecoveryFrame = null;
  }
}

function startListenScoreRecovery(durationMs) {
  stopScoreRecoveryAnimation();

  const fromScore = clamp(state.score, 0, MAX_SCORE);
  if (fromScore >= MAX_SCORE || durationMs <= 0) {
    state.score = MAX_SCORE;
    updateScoreUI();
    return;
  }

  const startTime = performance.now();

  const tick = (now) => {
    if (!state.isRunning || state.livePhase !== PHASE.LISTEN) {
      state.scoreRecoveryFrame = null;
      return;
    }

    const progress = clamp((now - startTime) / durationMs, 0, 1);
    state.score = fromScore + ((MAX_SCORE - fromScore) * progress);
    updateScoreUI();

    if (progress < 1) {
      state.scoreRecoveryFrame = requestAnimationFrame(tick);
      return;
    }

    state.score = MAX_SCORE;
    state.scoreRecoveryFrame = null;
    updateScoreUI();
  };

  state.scoreRecoveryFrame = requestAnimationFrame(tick);
}

function scheduleLoop() {
  if (!state.isRunning || !state.audioCtx) return;

  markLiveMisses();

  const now = state.audioCtx.currentTime;
  while (state.nextMeasureTime < now + (SCHED_LOOKAHEAD_MS / 1000)) {
    state.currentMeasureStart = state.nextMeasureTime;

    const patternForMeasure = [...state.pattern];
    scheduleMeasure(state.nextMeasureTime, state.phase, state.repetition, patternForMeasure);

    if (state.phase === PHASE.LISTEN) {
      state.phase = PHASE.TAP;
    } else {
      state.phase = PHASE.LISTEN;
      state.repetition += 1;
      if (state.repetition > REPS_PER_PATTERN) {
        state.repetition = 1;
        state.patternNumber += 1;
        state.pattern = generatePattern();
      }
    }

    state.nextMeasureTime += getMeasureDur();
    updateStaticUI();
  }
}

function startEngine() {
  if (!state.audioCtx || state.isCalibrating) return;

  state.isRunning = true;
  state.patternNumber = 1;
  state.pattern = generatePattern();
  state.repetition = 1;
  state.phase = PHASE.LISTEN;
  state.liveRepetition = 1;
  state.livePhase = PHASE.LISTEN;
  state.expectedHits = [];
  state.tapPattern = null;
  state.score = 0;
  const countInStart = state.audioCtx.currentTime + 0.08;
  const beatDur = 60 / state.bpm;
  for (let beat = 0; beat < START_COUNTIN_BEATS; beat += 1) {
    playHiHat(countInStart + (beat * beatDur));
  }

  state.currentMeasureStart = countInStart + (START_COUNTIN_BEATS * beatDur);
  state.nextMeasureTime = state.currentMeasureStart;

  resetLog();

  if (state.scheduleTimer) clearInterval(state.scheduleTimer);
  state.scheduleTimer = setInterval(scheduleLoop, SCHED_INTERVAL_MS);
  updateScoreUI();
  updateStaticUI();
  ui.startStop.textContent = 'Stop';
}

function stopEngine() {
  state.isRunning = false;
  if (state.scheduleTimer) {
    clearInterval(state.scheduleTimer);
    state.scheduleTimer = null;
  }

  stopScoreRecoveryAnimation();
  state.expectedHits = [];
  state.tapPattern = null;
  state.livePhase = PHASE.LISTEN;
  state.liveRepetition = 1;
  ui.tapZone.classList.remove('active');
  ui.startStop.textContent = 'Start';
  updateStaticUI();
}

function toggleEngine() {
  unlockAudio();
  if (state.isRunning) {
    stopEngine();
    return;
  }
  startEngine();
}


function updateScoreUI() {
  const ratio = clamp(state.score / MAX_SCORE, 0, 1);
  const hue = Math.round(ratio * 120);
  ui.tapZone.style.setProperty('--fill-height', `${Math.round(ratio * 100)}%`);
  ui.tapZone.style.setProperty('--score-color', `hsl(${hue} 80% 45%)`);
}

function updateStaticUI() {
  const isTapActive = (state.livePhase === PHASE.TAP || state.isCalibrating) && (state.isRunning || state.isCalibrating);
  ui.tapZone.classList.toggle('active', isTapActive);
  document.body.classList.toggle('tap-phase', state.livePhase === PHASE.TAP && state.isRunning);
}

function getOldestPatternNoteWithinSubdiv(adjustedTapTime) {
  const windowSec = getSubdivDur();
  const pattern = state.tapPattern ?? state.pattern;
  const expectedHitByIdx = new Map(state.expectedHits.map((hit) => [hit.idx, hit]));

  for (let idx = 0; idx < pattern.length; idx += 1) {
    if (pattern[idx] !== 1 || idx === 15) continue;

    const expectedHit = expectedHitByIdx.get(idx);
    if (expectedHit && isHitJudged(expectedHit)) continue;

    const noteTime = state.tapMeasureStart + (idx * getSubdivDur());
    const distance = Math.abs(adjustedTapTime - noteTime);
    if (distance <= windowSec) {
      return { idx, noteTime };
    }
  }

  return null;
}

function getClosestSubdivIndex(adjustedTapTime) {
  const subdivDur = getSubdivDur();
  if (subdivDur <= 0) return 0;
  const relative = (adjustedTapTime - state.tapMeasureStart) / subdivDur;
  const rounded = Math.round(relative);
  return Math.max(0, Math.min(PATTERN_LENGTH - 1, rounded));
}

function recordCalibrationTap(tapTime) {
  const maxDelaySec = CALIBRATION_MAX_DELAY_MS / 1000;
  let closestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  state.calibrationTargets.forEach((targetTime, idx) => {
    if (state.calibrationMatched.has(idx)) return;
    const distance = Math.abs(tapTime - targetTime);
    if (distance <= maxDelaySec && distance < bestDistance) {
      bestDistance = distance;
      closestIndex = idx;
    }
  });

  if (closestIndex === -1) return;

  state.calibrationMatched.add(closestIndex);
  const delayMs = (tapTime - state.calibrationTargets[closestIndex]) * 1000;
  if (Math.abs(delayMs) <= CALIBRATION_MAX_DELAY_MS) {
    state.calibrationDelays.push(delayMs);
  }
}

function applyCalibrationResult() {
  if (state.calibrationDelays.length === 0) {
    ui.calibrationResult.textContent = 'Calibration terminée: aucune saisie valide détectée.';
    return;
  }

  const avgDelayMs = state.calibrationDelays.reduce((sum, value) => sum + value, 0) / state.calibrationDelays.length;
  const clampedLatency = Math.max(0, Math.min(INPUT_LATENCY_MAX_MS, Math.round(avgDelayMs / 5) * 5));

  state.latencyOffsetMs = clampedLatency;
  ui.latency.value = String(clampedLatency);
  ui.latencyValue.textContent = String(clampedLatency);
  saveSetting(STORAGE_KEYS.latencyOffsetMs, state.latencyOffsetMs);
  ui.calibrationResult.textContent = `Calibration terminée: délai moyen ${avgDelayMs.toFixed(1)} ms (${state.calibrationDelays.length}/${CALIBRATION_BEATS} temps).`;
}

function startCalibration() {
  unlockAudio();
  if (!state.audioCtx || state.isRunning || state.isCalibrating) return;

  state.isCalibrating = true;
  state.livePhase = PHASE.CALIBRATION;
  state.calibrationTargets = [];
  state.calibrationMatched = new Set();
  state.calibrationDelays = [];

  const beatDur = 60 / CALIBRATION_BPM;
  const startTime = state.audioCtx.currentTime + 0.2;

  for (let beat = 0; beat < CALIBRATION_BEATS; beat += 1) {
    const eventTime = startTime + (beat * beatDur);
    state.calibrationTargets.push(eventTime);
    playSnare(eventTime);
    if (beat % 4 === 0) playKick(eventTime);
  }

  ui.calibrationResult.textContent = 'Calibration en cours... tapez sur chaque temps.';
  updateStaticUI();

  const calibrationDurationMs = (CALIBRATION_BEATS * beatDur * 1000) + 300;
  setTimeout(() => {
    state.isCalibrating = false;
    state.livePhase = PHASE.LISTEN;
    applyCalibrationResult();
    updateStaticUI();
  }, calibrationDurationMs);
}

function recordTap() {
  if (!state.audioCtx) return;

  const tapTime = state.audioCtx.currentTime;

  if (state.isCalibrating) {
    recordCalibrationTap(tapTime);
  } else if (state.isRunning && state.livePhase === PHASE.TAP) {
    const adjustedTapTime = tapTime - (state.latencyOffsetMs / 1000);
    const candidate = getClosestCandidateFromExpectedWindow(adjustedTapTime);
    const hitWindowSec = state.hitWindowMs / 1000;

    if (candidate && candidate.distanceSec <= hitWindowSec) {
      const hit = candidate.hit;
      hit.consumed = true;
      hit.validated = true;
      advanceExpectedIndex();
      const toleranceSec = getHitToleranceMs() / 1000;
      const errorSec = adjustedTapTime - hit.targetTime;

      if (Math.abs(errorSec) <= toleranceSec) {
        hit.correct = true;
      } else {
        hit.correct = false;
        consumeScorePoint();
        appendLog(`note[${hit.idx + 1}] wrong timing (${formatErrorMs(errorSec * 1000)})`);
      }
    } else {
      consumeScorePoint();
      const nearbyNote = getOldestPatternNoteWithinSubdiv(adjustedTapTime);

      if (nearbyNote) {
        const errorMs = (adjustedTapTime - nearbyNote.noteTime) * 1000;
        appendLog(`note[${nearbyNote.idx + 1}] wrong timing (${formatErrorMs(errorMs)})`);
      } else {
        const closestIndex = getClosestSubdivIndex(adjustedTapTime);
        appendLog(`false note entered[${closestIndex + 1}]`);
      }
    }
  } else {
    return;
  }

  ui.tapZone.classList.add('pressed');
  setTimeout(() => ui.tapZone.classList.remove('pressed'), 120);

}


function clearLocalCache() {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.bpm);
    window.localStorage.removeItem(STORAGE_KEYS.latencyOffsetMs);
    window.localStorage.removeItem(STORAGE_KEYS.hitTolerance);
    window.localStorage.removeItem(STORAGE_KEYS.hitWindowMs);
  } catch (_error) {
    // Ignore storage errors
  }

  state.bpm = BPM_DEFAULT;
  state.latencyOffsetMs = INPUT_LATENCY_DEFAULT_MS;
  state.hitTolerance = HIT_TOLERANCE_DEFAULT;
  state.hitWindowMs = HIT_WINDOW_DEFAULT_MS;

  ui.bpm.value = String(state.bpm);
  ui.bpmValue.textContent = String(state.bpm);
  ui.latency.value = String(state.latencyOffsetMs);
  ui.latencyValue.textContent = String(state.latencyOffsetMs);
  ui.hitTolerance.value = String(state.hitTolerance);
  updateHitWindowUI();
  updateHitToleranceUI();
  ui.calibrationResult.textContent = 'Paramètres réinitialisés.';
}

function bindProbabilityControls() {
  ui.probabilityInputs.forEach(({ input, value, group, index }) => {
    const sync = () => {
      const weight = Number(input.value);
      value.textContent = String(weight);
      if (group === 'first') {
        state.firstHitWeights[index] = weight;
      } else {
        state.jumpWeights[index] = weight;
      }
    };

    input.addEventListener('input', sync);
    sync();
  });
}

ui.bpm.min = String(BPM_MIN);
ui.bpm.max = String(BPM_MAX);
applyPersistedSettings();

ui.bpm.value = String(state.bpm);
ui.bpmValue.textContent = String(state.bpm);
ui.latency.min = String(INPUT_LATENCY_MIN_MS);
ui.latency.max = String(INPUT_LATENCY_MAX_MS);
ui.latency.value = String(state.latencyOffsetMs);
ui.latencyValue.textContent = String(state.latencyOffsetMs);
ui.hitTolerance.min = String(HIT_TOLERANCE_MIN);
ui.hitTolerance.max = String(HIT_TOLERANCE_MAX);
ui.hitTolerance.value = String(state.hitTolerance);

ui.bpm.addEventListener('input', (e) => {
  state.bpm = clamp(Number(e.target.value), BPM_MIN, BPM_MAX);
  ui.bpmValue.textContent = String(state.bpm);
  saveSetting(STORAGE_KEYS.bpm, state.bpm);
  updateHitWindowUI();
  updateHitToleranceUI();
});

ui.latency.addEventListener('input', (e) => {
  state.latencyOffsetMs = clamp(Number(e.target.value), INPUT_LATENCY_MIN_MS, INPUT_LATENCY_MAX_MS);
  ui.latency.value = String(state.latencyOffsetMs);
  ui.latencyValue.textContent = String(state.latencyOffsetMs);
  saveSetting(STORAGE_KEYS.latencyOffsetMs, state.latencyOffsetMs);
});

ui.hitWindow.addEventListener('input', (e) => {
  const minHitWindowMs = getMinHitWindowMs();
  const effectiveMax = Math.max(HIT_WINDOW_MAX_MS, minHitWindowMs);
  state.hitWindowMs = clamp(Math.round(Number(e.target.value)), minHitWindowMs, effectiveMax);
  updateHitWindowUI();
  saveSetting(STORAGE_KEYS.hitWindowMs, state.hitWindowMs);
  updateHitToleranceUI();
});

ui.hitTolerance.addEventListener('input', (e) => {
  state.hitTolerance = clamp(Number(e.target.value), HIT_TOLERANCE_MIN, HIT_TOLERANCE_MAX);
  saveSetting(STORAGE_KEYS.hitTolerance, state.hitTolerance);
  updateHitToleranceUI();
});

ui.startStop.addEventListener('click', toggleEngine);
ui.calibration.addEventListener('click', startCalibration);
ui.clearCache.addEventListener('click', clearLocalCache);
ui.tapZone.addEventListener('animationend', () => {
  ui.tapZone.classList.remove('loss-flash');
});

ui.tapZone.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  unlockAudio();
  recordTap();
});

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();

  if (!state.isRunning && !state.isCalibrating) {
    toggleEngine();
    return;
  }

  unlockAudio();
  recordTap();
});

window.addEventListener('pointerdown', unlockAudio, { once: true });
bindProbabilityControls();
updateHitWindowUI();
updateHitToleranceUI();
updateStaticUI();
updateScoreUI();
