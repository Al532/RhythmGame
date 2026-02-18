// ===== Tunable constants =====
const PATTERN_LENGTH = 16;
const REPS_PER_PATTERN = 4;
const BPM_DEFAULT = 60;
const BPM_MIN = 40;
const BPM_MAX = 120;
const INPUT_LATENCY_DEFAULT_MS = 50;
const SCHED_LOOKAHEAD_MS = 120;
const SCHED_INTERVAL_MS = 25;

const FIRST_HIT_INDICES = [0, 1, 2, 3];
const FIRST_HIT_WEIGHTS = [4, 1.5, 3, 1.5];
const JUMP_VALUES = [1, 2, 3, 4, 5];
const JUMP_WEIGHTS = [1 / 3, 4, 4, 1 / 3, 1 / 3];

const DRUM_GAIN = {
  snare: 0.42,
  kick: 0.6,
  hihat: 0.22
};

const DRUM_TUNING = {
  snare: { decay: 0.1, bpFreq: 2200, bpQ: 1.5 },
  kick: { startFreq: 120, endFreq: 50, decay: 0.15 },
  hihat: { decay: 0.03, hpFreq: 5500 }
};

const PHASE = {
  LISTEN: 'LISTEN',
  TAP: 'TAP'
};

const ui = {
  steps: document.getElementById('steps'),
  playhead: document.getElementById('playhead'),
  phaseLabel: document.getElementById('phaseLabel'),
  patternCount: document.getElementById('patternCount'),
  scoreValue: document.getElementById('scoreValue'),
  scoreBar: document.getElementById('scoreBar'),
  bpm: document.getElementById('bpm'),
  bpmValue: document.getElementById('bpmValue'),
  latency: document.getElementById('latency'),
  latencyValue: document.getElementById('latencyValue'),
  startStop: document.getElementById('startStop'),
  tapZone: document.getElementById('tapZone')
};

const state = {
  audioCtx: null,
  noiseBuffer: null,
  isRunning: false,
  bpm: BPM_DEFAULT,
  latencyOffsetMs: INPUT_LATENCY_DEFAULT_MS,

  patternNumber: 1,
  pattern: [],
  repetition: 1,
  phase: PHASE.LISTEN,
  liveRepetition: 1,
  livePhase: PHASE.LISTEN,

  currentMeasureStart: 0,
  nextMeasureTime: 0,
  scheduleTimer: null,

  tapTimes: [],
  score: 5,
  lastFlash: null
};

const stepEls = [];
for (let i = 0; i < PATTERN_LENGTH; i += 1) {
  const el = document.createElement('div');
  el.className = 'step';
  ui.steps.appendChild(el);
  stepEls.push(el);
}

function weightedChoice(values, weights) {
  const total = weights.reduce((sum, n) => sum + n, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (let i = 0; i < values.length; i += 1) {
    acc += weights[i];
    if (r <= acc) return values[i];
  }
  return values[values.length - 1];
}

function generatePattern() {
  const p = Array(PATTERN_LENGTH).fill(0);
  let pos = weightedChoice(FIRST_HIT_INDICES, FIRST_HIT_WEIGHTS);
  while (pos < 15) {
    p[pos] = 1;
    pos += weightedChoice(JUMP_VALUES, JUMP_WEIGHTS);
  }
  p[15] = 0;
  return p;
}

function getSubdivDur() {
  return (60 / state.bpm) / 4;
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

function scheduleMeasure(measureStart, phase, repetition) {
  const subdivDur = getSubdivDur();

  setTimeout(() => {
    state.livePhase = phase;
    state.liveRepetition = repetition;
    updateStaticUI();
  }, Math.max(0, (measureStart - state.audioCtx.currentTime) * 1000));

  if (phase === PHASE.TAP) {
    state.tapTimes = [];
    state.score = 5;
    updateScoreUI();
  }

  for (let idx = 0; idx < PATTERN_LENGTH; idx += 1) {
    const eventTime = measureStart + (idx * subdivDur);

    if (phase === PHASE.LISTEN && state.pattern[idx] === 1) {
      playSnare(eventTime);
    }

    if (idx === 0 || idx === 8) playKick(eventTime);
    if (idx === 4 || idx === 12) playHiHat(eventTime);
  }

  setTimeout(() => {
    if (phase === PHASE.TAP) finishTapPhase(measureStart);
  }, Math.max(0, ((measureStart + getMeasureDur()) - state.audioCtx.currentTime) * 1000 + 20));
}

function finishTapPhase(measureStart) {
  const subdivDur = getSubdivDur();
  const hitSet = new Set();
  state.pattern.forEach((v, i) => {
    if (v === 1 && i !== 15) hitSet.add(i);
  });

  const tappedSet = new Set();
  let extras = 0;

  for (const t of state.tapTimes) {
    const adj = t - (state.latencyOffsetMs / 1000);
    const idx = Math.round((adj - measureStart) / subdivDur);

    if (idx < 0 || idx > 15 || idx === 15 || tappedSet.has(idx)) {
      extras += 1;
      continue;
    }
    tappedSet.add(idx);
  }

  let missed = 0;
  hitSet.forEach((i) => {
    if (!tappedSet.has(i)) missed += 1;
  });

  const penalty = missed + extras;
  state.score = Math.max(0, 5 - penalty);
  updateScoreUI();
  flashScore();
}

function flashScore() {
  ui.scoreBar.style.filter = 'brightness(1.35)';
  clearTimeout(state.lastFlash);
  state.lastFlash = setTimeout(() => {
    ui.scoreBar.style.filter = 'none';
  }, 160);
}

function scheduleLoop() {
  if (!state.isRunning || !state.audioCtx) return;

  const now = state.audioCtx.currentTime;
  while (state.nextMeasureTime < now + (SCHED_LOOKAHEAD_MS / 1000)) {
    state.currentMeasureStart = state.nextMeasureTime;

    scheduleMeasure(state.nextMeasureTime, state.phase, state.repetition);

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
  if (!state.audioCtx) return;

  state.isRunning = true;
  state.patternNumber = 1;
  state.pattern = generatePattern();
  state.repetition = 1;
  state.phase = PHASE.LISTEN;
  state.liveRepetition = 1;
  state.livePhase = PHASE.LISTEN;
  state.tapTimes = [];
  state.score = 5;
  state.currentMeasureStart = state.audioCtx.currentTime + 0.08;
  state.nextMeasureTime = state.currentMeasureStart;

  if (state.scheduleTimer) clearInterval(state.scheduleTimer);
  state.scheduleTimer = setInterval(scheduleLoop, SCHED_INTERVAL_MS);
  updateScoreUI();
  updateStaticUI();
  ui.startStop.textContent = 'Stop';
  requestAnimationFrame(drawLoop);
}

function stopEngine() {
  state.isRunning = false;
  if (state.scheduleTimer) {
    clearInterval(state.scheduleTimer);
    state.scheduleTimer = null;
  }
  state.tapTimes = [];
  state.livePhase = PHASE.LISTEN;
  state.liveRepetition = 1;
  ui.playhead.style.transform = 'translateX(0%)';
  stepEls.forEach((el) => el.classList.remove('current'));
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

function drawLoop() {
  if (!state.isRunning || !state.audioCtx) return;

  const t = state.audioCtx.currentTime;
  const subdivDur = getSubdivDur();
  const measurePos = (t - state.currentMeasureStart) / subdivDur;
  const idx = Math.max(0, Math.min(15, Math.floor(measurePos)));

  const frac = ((t - state.currentMeasureStart) / getMeasureDur());
  const clampedFrac = Math.max(0, Math.min(1, frac));
  ui.playhead.style.transform = `translateX(${clampedFrac * 100}%)`;

  stepEls.forEach((el, i) => {
    el.classList.toggle('current', i === idx);
  });

  requestAnimationFrame(drawLoop);
}

function updateScoreUI() {
  ui.scoreValue.textContent = String(state.score);
  ui.scoreBar.style.height = `${(state.score / 5) * 100}%`;
}

function updateStaticUI() {
  ui.phaseLabel.textContent = `${state.livePhase} (${state.liveRepetition}/4)`;
  ui.patternCount.textContent = `#${state.patternNumber}`;
  ui.tapZone.classList.toggle('active', state.livePhase === PHASE.TAP && state.isRunning);
}

function recordTap() {
  if (!state.audioCtx || !state.isRunning || state.livePhase !== PHASE.TAP) return;

  const tapTime = state.audioCtx.currentTime;
  state.tapTimes.push(tapTime);
  playSnare(tapTime);
  ui.tapZone.classList.add('pressed');
  setTimeout(() => ui.tapZone.classList.remove('pressed'), 120);
}

ui.bpm.min = String(BPM_MIN);
ui.bpm.max = String(BPM_MAX);
ui.bpm.value = String(BPM_DEFAULT);
ui.bpmValue.textContent = String(BPM_DEFAULT);
ui.latency.value = String(INPUT_LATENCY_DEFAULT_MS);
ui.latencyValue.textContent = String(INPUT_LATENCY_DEFAULT_MS);

ui.bpm.addEventListener('input', (e) => {
  state.bpm = Number(e.target.value);
  ui.bpmValue.textContent = String(state.bpm);
});

ui.latency.addEventListener('input', (e) => {
  state.latencyOffsetMs = Number(e.target.value);
  ui.latencyValue.textContent = String(state.latencyOffsetMs);
});

ui.startStop.addEventListener('click', toggleEngine);

ui.tapZone.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  unlockAudio();
  recordTap();
});

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();

  if (!state.isRunning) {
    toggleEngine();
    return;
  }

  unlockAudio();
  recordTap();
});

window.addEventListener('pointerdown', unlockAudio, { once: true });
updateStaticUI();
updateScoreUI();
