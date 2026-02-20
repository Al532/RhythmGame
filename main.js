// ===== Tunable constants =====
const PATTERN_LENGTH = 16;
const REPS_PER_PATTERN = 2;
const APP_VERSION = window.APP_VERSION;
const LEVEL_DEFAULT = 1;
const LEVEL_MIN = 1;
const LEVEL_MAX = 10;
const BPM_LEVEL1_DEFAULT = 60;
const BPM_LEVEL10_DEFAULT = 120;
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
const MAX_SCORE_DEFAULT = 10;
const MAX_SCORE_MIN = 1;
const MAX_SCORE_MAX = 10;
const SCORE_RECOVERY_PER_SECOND_DEFAULT = 1;
const SCORE_RECOVERY_PER_SECOND_MIN = 0;
const SCORE_RECOVERY_PER_SECOND_MAX = 1;


const FIRST_HIT_INDICES = [1, 2, 3];
const FIRST_HIT_WEIGHTS_LEVEL1_DEFAULT = [0, 10, 0];
const FIRST_HIT_WEIGHTS_LEVEL10_DEFAULT = [10, 5, 10];
const JUMP_VALUES = [1, 2, 3, 4, 5];
const JUMP_WEIGHTS_LEVEL1_DEFAULT = [0, 10, 0, 10, 0];
const JUMP_WEIGHTS_LEVEL10_DEFAULT = [1, 5, 10, 2, 4];

const DRUM_GAIN = {
  snare: 0.5,
  kick: 0.54,
  hihat: 0.22,
  cymbal: 0.13
};

const DRUM_TUNING = {
  snare: { decay: 0.1, bpFreq: 2800, bpQ: 1.7 },
  kick: { startFreq: 120, endFreq: 50, decay: 0.15 },
  hihat: { decay: 0.03, hpFreq: 5500 },
  cymbal: { hpFreq: 4200 }
};

const START_COUNTIN_BEATS = 4;
const PATTERNS_PER_LEVEL = 2;
const SCORE_REGEN_INTERVAL_MS = 50;

const PHASE = {
  LISTEN: 'LISTEN',
  TAP: 'TAP',
  CALIBRATION: 'CALIBRATION'
};

const FX_PHASE = {
  LISTEN: 'listen',
  TAP: 'tap'
};


const STORAGE_KEYS = {
  level: 'rhythmTrainer.level',
  bpmLevel1: 'rhythmTrainer.bpmLevel1',
  bpmLevel10: 'rhythmTrainer.bpmLevel10',
  weightFirstLevel1: 'rhythmTrainer.weightFirstLevel1',
  weightFirstLevel10: 'rhythmTrainer.weightFirstLevel10',
  weightJumpLevel1: 'rhythmTrainer.weightJumpLevel1',
  weightJumpLevel10: 'rhythmTrainer.weightJumpLevel10',
  latencyOffsetMs: 'rhythmTrainer.latencyOffsetMs',
  hitTolerance: 'rhythmTrainer.hitTolerance',
  hitWindowMs: 'rhythmTrainer.hitWindowMs',
  scoreRecoveryPerSecond: 'rhythmTrainer.scoreRecoveryPerSecond',
  maxScore: 'rhythmTrainer.maxScore'
};

function getInterpolationFactor(level = LEVEL_DEFAULT) {
  return (level - LEVEL_MIN) / (LEVEL_MAX - LEVEL_MIN);
}

function interpolateLinear(from, to, factor) {
  return from + ((to - from) * factor);
}

function interpolateRounded(from, to, factor) {
  return Math.round(interpolateLinear(from, to, factor));
}

function parseStoredArray(key, expectedLength) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== expectedLength) return null;
    const numbers = parsed.map((value) => Number(value));
    if (numbers.some((value) => !Number.isFinite(value))) return null;
    return numbers;
  } catch (_error) {
    return null;
  }
}

function saveArraySetting(key, values) {
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch (_error) {
    // Ignore storage errors
  }
}

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
  startScreen: document.getElementById('startScreen'),
  gameScreen: document.getElementById('gameScreen'),
  resultScreen: document.getElementById('resultScreen'),
  startGame: document.getElementById('startGame'),
  stopGame: document.getElementById('stopGame'),
  backToMenu: document.getElementById('backToMenu'),
  startLevel: document.getElementById('startLevel'),
  startLevelValue: document.getElementById('startLevelValue'),
  gameLevelValue: document.getElementById('gameLevelValue'),
  resultTitle: document.getElementById('resultTitle'),
  resultText: document.getElementById('resultText'),
  bpmLevel1: document.getElementById('bpmLevel1'),
  bpmLevel1Value: document.getElementById('bpmLevel1Value'),
  bpmLevel10: document.getElementById('bpmLevel10'),
  bpmLevel10Value: document.getElementById('bpmLevel10Value'),
  bpmValue: document.getElementById('bpmValue'),
  latency: document.getElementById('latency'),
  latencyValue: document.getElementById('latencyValue'),
  hitTolerance: document.getElementById('hitTolerance'),
  hitToleranceDisplay: document.getElementById('hitToleranceDisplay'),
  hitWindow: document.getElementById('hitWindow'),
  hitWindowDisplay: document.getElementById('hitWindowDisplay'),
  scoreRecoveryPerSecond: document.getElementById('scoreRecoveryPerSecond'),
  scoreRecoveryPerSecondValue: document.getElementById('scoreRecoveryPerSecondValue'),
  maxScore: document.getElementById('maxScore'),
  clearCache: document.getElementById('clearCache'),
  calibration: document.getElementById('calibration'),
  appVersion: document.getElementById('appVersion'),
  calibrationResult: document.getElementById('calibrationResult'),
  testLog: document.getElementById('testLog'),
  tapZone: document.getElementById('tapZone'),
  tapZoneLabel: document.getElementById('tapZoneLabel'),
  fxCanvas: document.getElementById('fxCanvas'),
  endpointInputs: [
    { input: document.getElementById('weightFirst2Level1'), value: document.getElementById('weightFirst2Level1Value'), key: 'first', level: 1, index: 0 },
    { input: document.getElementById('weightFirst2Level10'), value: document.getElementById('weightFirst2Level10Value'), key: 'first', level: 10, index: 0 },
    { input: document.getElementById('weightFirst3Level1'), value: document.getElementById('weightFirst3Level1Value'), key: 'first', level: 1, index: 1 },
    { input: document.getElementById('weightFirst3Level10'), value: document.getElementById('weightFirst3Level10Value'), key: 'first', level: 10, index: 1 },
    { input: document.getElementById('weightFirst4Level1'), value: document.getElementById('weightFirst4Level1Value'), key: 'first', level: 1, index: 2 },
    { input: document.getElementById('weightFirst4Level10'), value: document.getElementById('weightFirst4Level10Value'), key: 'first', level: 10, index: 2 },
    { input: document.getElementById('weightJump1Level1'), value: document.getElementById('weightJump1Level1Value'), key: 'jump', level: 1, index: 0 },
    { input: document.getElementById('weightJump1Level10'), value: document.getElementById('weightJump1Level10Value'), key: 'jump', level: 10, index: 0 },
    { input: document.getElementById('weightJump2Level1'), value: document.getElementById('weightJump2Level1Value'), key: 'jump', level: 1, index: 1 },
    { input: document.getElementById('weightJump2Level10'), value: document.getElementById('weightJump2Level10Value'), key: 'jump', level: 10, index: 1 },
    { input: document.getElementById('weightJump3Level1'), value: document.getElementById('weightJump3Level1Value'), key: 'jump', level: 1, index: 2 },
    { input: document.getElementById('weightJump3Level10'), value: document.getElementById('weightJump3Level10Value'), key: 'jump', level: 10, index: 2 },
    { input: document.getElementById('weightJump4Level1'), value: document.getElementById('weightJump4Level1Value'), key: 'jump', level: 1, index: 3 },
    { input: document.getElementById('weightJump4Level10'), value: document.getElementById('weightJump4Level10Value'), key: 'jump', level: 10, index: 3 },
    { input: document.getElementById('weightJump5Level1'), value: document.getElementById('weightJump5Level1Value'), key: 'jump', level: 1, index: 4 },
    { input: document.getElementById('weightJump5Level10'), value: document.getElementById('weightJump5Level10Value'), key: 'jump', level: 10, index: 4 }
  ]
};


const state = {
  audioCtx: null,
  noiseBuffer: null,
  masterGain: null,
  activeVoices: new Set(),
  isRunning: false,
  screen: 'start',
  isCalibrating: false,
  level: LEVEL_DEFAULT,
  liveLevel: LEVEL_DEFAULT,
  liveBpm: interpolateRounded(BPM_LEVEL1_DEFAULT, BPM_LEVEL10_DEFAULT, getInterpolationFactor(LEVEL_DEFAULT)),
  bpmLevel1: BPM_LEVEL1_DEFAULT,
  bpmLevel10: BPM_LEVEL10_DEFAULT,
  bpm: interpolateRounded(BPM_LEVEL1_DEFAULT, BPM_LEVEL10_DEFAULT, getInterpolationFactor(LEVEL_DEFAULT)),
  latencyOffsetMs: INPUT_LATENCY_DEFAULT_MS,
  hitTolerance: HIT_TOLERANCE_DEFAULT,
  hitWindowMs: HIT_WINDOW_DEFAULT_MS,
  scoreRecoveryPerSecond: SCORE_RECOVERY_PER_SECOND_DEFAULT,

  firstHitWeightsLevel1: [...FIRST_HIT_WEIGHTS_LEVEL1_DEFAULT],
  firstHitWeightsLevel10: [...FIRST_HIT_WEIGHTS_LEVEL10_DEFAULT],
  jumpWeightsLevel1: [...JUMP_WEIGHTS_LEVEL1_DEFAULT],
  jumpWeightsLevel10: [...JUMP_WEIGHTS_LEVEL10_DEFAULT],
  firstHitWeights: [...FIRST_HIT_WEIGHTS_LEVEL1_DEFAULT],
  jumpWeights: [...JUMP_WEIGHTS_LEVEL1_DEFAULT],

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
  maxScore: MAX_SCORE_DEFAULT,
  score: MAX_SCORE_DEFAULT,
  displayedScore: MAX_SCORE_DEFAULT,
  displayedScoreTarget: MAX_SCORE_DEFAULT,
  scoreRecoveryFrame: null,
  scoreStepTimer: null,
  scoreRegenTimer: null,
  listenSaturationStartTimer: null,
  listenSaturationEndTimer: null,
  visualPhase: 0,
  visualFxFrame: null,
  visualFxLastTimestamp: null,
  visualHue: 220,

  calibrationTargets: [],
  calibrationMatched: new Set(),
  calibrationDelays: [],
  calibrationTimer: null,

  logEvents: [],
  tapMeasureStart: 0,
  tapMeasureBpm: interpolateRounded(BPM_LEVEL1_DEFAULT, BPM_LEVEL10_DEFAULT, getInterpolationFactor(LEVEL_DEFAULT)),
  tapPattern: null,
  isIntroduction: false,
  completedPatternsInLevel: 0,
  startLevel: LEVEL_DEFAULT,
  pendingBpmDisplayUpdate: false,
  fxEngine: null,
  fxWebglEnabled: false
};


function createCssOnlyFxFallback() {
  return {
    setBpm() {},
    setLevel() {},
    setPhase() {},
    pulseHit() {},
    setSafeMode() {},
    resize() {},
    destroy() {}
  };
}

function isSafeFxPreferred() {
  const reduceMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduceContrast = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-contrast: less)').matches;
  return reduceMotion || reduceContrast || document.body.classList.contains('fx-low');
}

function normalizePhaseForFx(phase) {
  return phase === PHASE.TAP ? FX_PHASE.TAP : FX_PHASE.LISTEN;
}

function updateFxEngineState() {
  if (!state.fxEngine) return;
  const activeBpm = state.isRunning ? state.liveBpm : state.bpm;
  const activeLevel = state.isRunning ? state.liveLevel : state.level;
  const activePhase = normalizePhaseForFx(state.livePhase);
  state.fxEngine.setBpm(activeBpm);
  state.fxEngine.setLevel(activeLevel);
  state.fxEngine.setPhase(activePhase);
}

function applyFxMode({ webglEnabled }) {
  state.fxWebglEnabled = webglEnabled;
  document.body.classList.toggle('fx-webgl-enabled', webglEnabled);
  document.body.classList.toggle('fx-css-only', !webglEnabled);
}

async function initializeFxEngine() {
  const fallback = createCssOnlyFxFallback();
  const canvas = ui.fxCanvas;
  if (!canvas) {
    state.fxEngine = fallback;
    applyFxMode({ webglEnabled: false });
    return;
  }

  try {
    const fxModule = await import(window.withAppVersion('./fx-webgl.js'));
    const engine = fxModule?.createWebglFx?.({ canvas, safeMode: isSafeFxPreferred() }) ?? null;

    if (!engine) {
      state.fxEngine = fallback;
      applyFxMode({ webglEnabled: false });
      return;
    }

    state.fxEngine = engine;
    applyFxMode({ webglEnabled: true });
    state.fxEngine.setSafeMode(isSafeFxPreferred());
    updateFxEngineState();
    state.fxEngine.resize(window.innerWidth, window.innerHeight);
  } catch (_error) {
    state.fxEngine = fallback;
    applyFxMode({ webglEnabled: false });
  }
}

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

function getSubdivDur(bpm = state.bpm) {
  return (60 / bpm) / 4;
}

function getSubdivMs(bpm = state.bpm) {
  return getSubdivDur(bpm) * 1000;
}

function getHitToleranceMs(bpm = state.bpm) {
  const beatMs = 60000 / bpm;
  const minToleranceMs = beatMs / 8;
  const maxToleranceMs = beatMs / 4;
  return minToleranceMs + ((state.hitTolerance / 100) * (maxToleranceMs - minToleranceMs));
}

function getMinHitWindowMs(bpm = state.bpm) {
  return Math.round(getSubdivMs(bpm));
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

function syncInterpolatedSettings({ updateBpmDisplay = true } = {}) {
  const factor = getInterpolationFactor(state.level);
  state.bpm = interpolateRounded(state.bpmLevel1, state.bpmLevel10, factor);
  state.firstHitWeights = state.firstHitWeightsLevel1.map((weight, index) => {
    return interpolateLinear(weight, state.firstHitWeightsLevel10[index], factor);
  });
  state.jumpWeights = state.jumpWeightsLevel1.map((weight, index) => {
    return interpolateLinear(weight, state.jumpWeightsLevel10[index], factor);
  });

  if (updateBpmDisplay) {
    ui.bpmValue.textContent = String(state.bpm);
    state.pendingBpmDisplayUpdate = false;
  }

  updateFxEngineState();
}

function applyPersistedSettings() {
  state.startLevel = LEVEL_DEFAULT;
  state.level = LEVEL_DEFAULT;

  const storedBpmLevel1 = loadStoredNumber(STORAGE_KEYS.bpmLevel1);
  if (storedBpmLevel1 !== null) {
    state.bpmLevel1 = clamp(Math.round(storedBpmLevel1), BPM_MIN, BPM_MAX);
  }

  const storedBpmLevel10 = loadStoredNumber(STORAGE_KEYS.bpmLevel10);
  if (storedBpmLevel10 !== null) {
    state.bpmLevel10 = clamp(Math.round(storedBpmLevel10), BPM_MIN, BPM_MAX);
  }

  const storedFirstLevel1 = parseStoredArray(STORAGE_KEYS.weightFirstLevel1, FIRST_HIT_WEIGHTS_LEVEL1_DEFAULT.length);
  if (storedFirstLevel1) {
    state.firstHitWeightsLevel1 = storedFirstLevel1.map((weight) => clamp(weight, 0, 10));
  }

  const storedFirstLevel10 = parseStoredArray(STORAGE_KEYS.weightFirstLevel10, FIRST_HIT_WEIGHTS_LEVEL10_DEFAULT.length);
  if (storedFirstLevel10) {
    state.firstHitWeightsLevel10 = storedFirstLevel10.map((weight) => clamp(weight, 0, 10));
  }

  const storedJumpLevel1 = parseStoredArray(STORAGE_KEYS.weightJumpLevel1, JUMP_WEIGHTS_LEVEL1_DEFAULT.length);
  if (storedJumpLevel1) {
    state.jumpWeightsLevel1 = storedJumpLevel1.map((weight) => clamp(weight, 0, 10));
  }

  const storedJumpLevel10 = parseStoredArray(STORAGE_KEYS.weightJumpLevel10, JUMP_WEIGHTS_LEVEL10_DEFAULT.length);
  if (storedJumpLevel10) {
    state.jumpWeightsLevel10 = storedJumpLevel10.map((weight) => clamp(weight, 0, 10));
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

  const storedScoreRecoveryPerSecond = loadStoredNumber(STORAGE_KEYS.scoreRecoveryPerSecond);
  if (storedScoreRecoveryPerSecond !== null) {
    state.scoreRecoveryPerSecond = clamp(
      Number(storedScoreRecoveryPerSecond.toFixed(1)),
      SCORE_RECOVERY_PER_SECOND_MIN,
      SCORE_RECOVERY_PER_SECOND_MAX
    );
  }

  const storedMaxScore = loadStoredNumber(STORAGE_KEYS.maxScore);
  if (storedMaxScore !== null) {
    state.maxScore = clamp(Math.round(storedMaxScore), MAX_SCORE_MIN, MAX_SCORE_MAX);
  }

  syncInterpolatedSettings();
}

function getMeasureDur() {
  return getSubdivDur() * PATTERN_LENGTH;
}

function unlockAudio() {
  if (!state.audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new Ctx();
    state.noiseBuffer = createNoiseBuffer(state.audioCtx, 1.0);
    state.masterGain = state.audioCtx.createGain();
    state.masterGain.gain.setValueAtTime(1, state.audioCtx.currentTime);
    state.masterGain.connect(state.audioCtx.destination);
  }

  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
}

function getAudioOutputNode() {
  return state.masterGain ?? state.audioCtx?.destination;
}

function setAudioMuted(isMuted) {
  if (!state.audioCtx || !state.masterGain) return;
  const now = state.audioCtx.currentTime;
  state.masterGain.gain.cancelScheduledValues(now);
  state.masterGain.gain.setValueAtTime(isMuted ? 0.0001 : 1, now);
}

function trackVoice(node) {
  if (!node || typeof node.stop !== 'function') return node;
  state.activeVoices.add(node);
  if ('onended' in node) {
    node.onended = () => {
      state.activeVoices.delete(node);
    };
  }
  return node;
}

function cancelScheduledVoices() {
  if (!state.audioCtx) return;
  const hardStopAt = state.audioCtx.currentTime + 0.09;
  state.activeVoices.forEach((voice) => {
    try {
      voice.stop(hardStopAt);
    } catch (_error) {
      // Ignore nodes already stopped.
    }
  });
  state.activeVoices.clear();
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
  const source = trackVoice(ctx.createBufferSource());
  source.buffer = state.noiseBuffer;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(DRUM_TUNING.snare.bpFreq, time);
  bp.Q.setValueAtTime(DRUM_TUNING.snare.bpQ, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(DRUM_GAIN.snare, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + DRUM_TUNING.snare.decay);

  source.connect(bp).connect(gain).connect(getAudioOutputNode());
  source.start(time);
  source.stop(time + DRUM_TUNING.snare.decay + 0.02);
}

function playKick(time) {
  const ctx = state.audioCtx;
  const osc = trackVoice(ctx.createOscillator());
  osc.type = 'sine';
  osc.frequency.setValueAtTime(DRUM_TUNING.kick.startFreq, time);
  osc.frequency.exponentialRampToValueAtTime(DRUM_TUNING.kick.endFreq, time + DRUM_TUNING.kick.decay);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(DRUM_GAIN.kick, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + DRUM_TUNING.kick.decay);

  osc.connect(gain).connect(getAudioOutputNode());
  osc.start(time);
  osc.stop(time + DRUM_TUNING.kick.decay + 0.02);
}

function playHiHat(time) {
  const ctx = state.audioCtx;
  const src = trackVoice(ctx.createBufferSource());
  src.buffer = state.noiseBuffer;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(DRUM_TUNING.hihat.hpFreq, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(DRUM_GAIN.hihat, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + DRUM_TUNING.hihat.decay);

  src.connect(hp).connect(gain).connect(getAudioOutputNode());
  src.start(time);
  src.stop(time + DRUM_TUNING.hihat.decay + 0.01);
}

function playCymbalCrescendo(startTime, endTime) {
  const ctx = state.audioCtx;
  const src = trackVoice(ctx.createBufferSource());
  src.buffer = state.noiseBuffer;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(DRUM_TUNING.cymbal.hpFreq, startTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(DRUM_GAIN.cymbal, endTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime + 0.04);

  src.connect(hp).connect(gain).connect(getAudioOutputNode());
  src.start(startTime);
  src.stop(endTime + 0.05);
}


function appendLog(message) {
  state.logEvents.push(message);
  ui.testLog.textContent = state.logEvents.length > 0
    ? state.logEvents.join('\n')
    : 'Les patterns, erreurs et timings seront affichés ici.';
}

function resetLog() {
  state.logEvents = [];
  ui.testLog.textContent = 'Les patterns, erreurs et timings seront affichés ici.';
}

function formatSeconds(seconds) {
  return `${seconds.toFixed(3)}s`;
}

function formatPattern(pattern) {
  return pattern.map((value) => (value === 1 ? 'x' : '.')).join('');
}

function formatErrorMs(ms) {
  const rounded = Math.round(ms);
  if (rounded === 0) return '0 ms';
  if (rounded > 0) return `${rounded} ms late`;
  return `${Math.abs(rounded)} ms early`;
}

function showStartScreen() {
  state.screen = 'start';
  ui.startScreen.classList.remove('hidden');
  ui.gameScreen.classList.add('hidden');
  ui.resultScreen.classList.add('hidden');
}

function showGameScreen() {
  state.screen = 'game';
  ui.startScreen.classList.add('hidden');
  ui.gameScreen.classList.remove('hidden');
  ui.resultScreen.classList.add('hidden');
}

function showResultScreen(title, text) {
  state.screen = 'result';
  ui.resultTitle.textContent = title;
  ui.resultText.textContent = text;
  ui.startScreen.classList.add('hidden');
  ui.gameScreen.classList.add('hidden');
  ui.resultScreen.classList.remove('hidden');
}

function setScore(nextScore, reason) {
  const clampedScore = clamp(nextScore, 0, state.maxScore);
  if (clampedScore === state.score) return;
  state.score = clampedScore;
  animateDisplayedScoreTo(state.score);

  if (state.score <= 0) {
    stopEngine();
    showResultScreen('Game Over', `You reached level ${state.level}.`);
  }
}

function consumeScorePoint(reason) {
  if (state.score <= 0) return;
  setScore(state.score - 1, reason);
}

function prepareTapPhase(measureStart, patternForMeasure, bpmForMeasure) {
  state.expectedHits = [];
  state.expectedIndex = 0;
  state.tapMeasureStart = measureStart;
  state.tapMeasureBpm = bpmForMeasure;
  state.tapPattern = [...patternForMeasure];
  const subdivDur = getSubdivDur(bpmForMeasure);

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

  appendLog(
    `[TAP start] lvl=${state.liveLevel} rep=${state.liveRepetition}/${REPS_PER_PATTERN} bpm=${bpmForMeasure} start=${formatSeconds(measureStart)} pattern=${formatPattern(patternForMeasure)}`
  );

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
      appendLog(
        `[MISS] note[${hit.idx + 1}] target=${formatSeconds(hit.targetTime)} now=${formatSeconds(adjustedNow)} delta=${formatErrorMs((adjustedNow - hit.targetTime) * 1000)}`
      );
      consumeScorePoint(`missed note[${hit.idx + 1}]`);
    }
  });

  advanceExpectedIndex();
}


function clearListenSaturationTimers() {
  if (state.listenSaturationStartTimer !== null) {
    clearTimeout(state.listenSaturationStartTimer);
    state.listenSaturationStartTimer = null;
  }

  if (state.listenSaturationEndTimer !== null) {
    clearTimeout(state.listenSaturationEndTimer);
    state.listenSaturationEndTimer = null;
  }
}

function scheduleListenSaturationRelease(measureStart, bpmForMeasure) {
  clearListenSaturationTimers();

  const subdivDur = getSubdivDur(bpmForMeasure);
  const subdivDurMs = subdivDur * 1000;
  const releaseDurationMs = Math.max(0, 2 * subdivDurMs);
  ui.tapZone.style.setProperty('--tap-sat-transition-ms', `${Math.round(releaseDurationMs)}ms`);

  const releaseStartMs = Math.max(0, ((measureStart + (14 * subdivDur)) - state.audioCtx.currentTime) * 1000);
  const releaseEndMs = releaseStartMs + releaseDurationMs;

  state.listenSaturationStartTimer = setTimeout(() => {
    ui.tapZone.classList.add('listen-release');
    state.listenSaturationStartTimer = null;
  }, releaseStartMs);

  state.listenSaturationEndTimer = setTimeout(() => {
    ui.tapZone.classList.remove('listen-muted', 'listen-release');
    ui.tapZone.style.setProperty('--tap-sat-transition-ms', '0ms');
    state.listenSaturationEndTimer = null;
  }, releaseEndMs);
}

function scheduleMeasure(measureStart, phase, repetition, patternForMeasure, levelForMeasure, bpmForMeasure) {
  const subdivDur = getSubdivDur(bpmForMeasure);
  const phaseStartTime = measureStart;

  setTimeout(() => {
    state.isIntroduction = false;
    state.liveLevel = levelForMeasure;
    state.liveBpm = bpmForMeasure;
    state.livePhase = phase;
    state.liveRepetition = repetition;
    if (state.pendingBpmDisplayUpdate && phase === PHASE.LISTEN && repetition === 1) {
      ui.bpmValue.textContent = String(state.bpm);
      state.pendingBpmDisplayUpdate = false;
    }

    updateStaticUI();
    state.fxEngine?.setBpm(bpmForMeasure);
    state.fxEngine?.setLevel(levelForMeasure);
    state.fxEngine?.setPhase(normalizePhaseForFx(phase));

    if (phase === PHASE.TAP) {
      clearListenSaturationTimers();
      ui.tapZone.classList.remove('listen-muted', 'listen-release');
      ui.tapZone.style.setProperty('--tap-sat-transition-ms', '0ms');
      stopScoreRecoveryAnimation();
      prepareTapPhase(measureStart, patternForMeasure, bpmForMeasure);
    } else if (phase === PHASE.LISTEN) {
      appendLog(
        `[LISTEN start] lvl=${levelForMeasure} rep=${repetition}/${REPS_PER_PATTERN} bpm=${bpmForMeasure} start=${formatSeconds(measureStart)} pattern=${formatPattern(patternForMeasure)}`
      );
      ui.tapZone.classList.add('listen-muted');
      ui.tapZone.classList.remove('listen-release');
      ui.tapZone.style.setProperty('--tap-sat-transition-ms', '0ms');
      scheduleListenSaturationRelease(measureStart, bpmForMeasure);
    }
  }, Math.max(0, (phaseStartTime - state.audioCtx.currentTime) * 1000));

  for (let idx = 0; idx < PATTERN_LENGTH; idx += 1) {
    const eventTime = measureStart + (idx * subdivDur);

    if (patternForMeasure[idx] === 1) {
      playSnare(eventTime);

      const feedbackDelayMs = Math.max(0, ((eventTime - state.audioCtx.currentTime) * 1000) + state.latencyOffsetMs);
      setTimeout(() => {
        if (!state.isRunning) return;
        if (state.livePhase === PHASE.LISTEN) {
          triggerTapZoneFeedback({ vibrate: true });
        }
      }, feedbackDelayMs);
    }

    if (idx % 4 === 0) playKick(eventTime);
  }

  if (phase === PHASE.LISTEN) {
    playCymbalCrescendo(measureStart + (14 * subdivDur), measureStart + (16 * subdivDur));
  }
}


function triggerShortVibration(durationMs = 10) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(Math.max(1, Math.round(durationMs)));
}

function triggerTapZoneFeedback({ vibrate = false } = {}) {
  ui.tapZone.classList.add('pressed');
  setTimeout(() => ui.tapZone.classList.remove('pressed'), 120);

  if (vibrate) {
    triggerShortVibration(10);
  }
}

function stopScoreRecoveryAnimation() {
  if (state.scoreRecoveryFrame !== null) {
    cancelAnimationFrame(state.scoreRecoveryFrame);
    state.scoreRecoveryFrame = null;
  }
}

function stopScoreStepAnimation() {
  if (state.scoreStepTimer !== null) {
    clearInterval(state.scoreStepTimer);
    state.scoreStepTimer = null;
  }
}

function animateDisplayedScoreTo(targetScore) {
  const clampedTarget = clamp(targetScore, 0, state.maxScore);
  state.displayedScoreTarget = clampedTarget;

  if (Math.abs(state.displayedScore - state.displayedScoreTarget) < 0.001) {
    state.displayedScore = state.displayedScoreTarget;
    updateScoreUI();
    return;
  }

  if (state.scoreRecoveryFrame !== null) return;

  let lastTimestamp = null;
  const animationSpeedPerSecond = 4;

  const step = (timestamp) => {
    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
    }

    const deltaSeconds = Math.max(0, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;
    const maxStep = animationSpeedPerSecond * deltaSeconds;
    const distance = state.displayedScoreTarget - state.displayedScore;

    if (Math.abs(distance) <= Math.max(maxStep, 0.001)) {
      state.displayedScore = state.displayedScoreTarget;
      updateScoreUI();
      state.scoreRecoveryFrame = null;
      return;
    }

    state.displayedScore += Math.sign(distance) * maxStep;
    updateScoreUI();
    state.scoreRecoveryFrame = requestAnimationFrame(step);
  };

  state.scoreRecoveryFrame = requestAnimationFrame(step);
}

function stopScoreRegeneration() {
  if (state.scoreRegenTimer !== null) {
    clearInterval(state.scoreRegenTimer);
    state.scoreRegenTimer = null;
  }
}

function startScoreRegeneration() {
  stopScoreRegeneration();
  const regenStepSeconds = SCORE_REGEN_INTERVAL_MS / 1000;
  state.scoreRegenTimer = setInterval(() => {
    if (!state.isRunning) return;
    if (state.score >= state.maxScore) return;
    const recoveredScore = state.scoreRecoveryPerSecond * regenStepSeconds;
    if (recoveredScore <= 0) return;
    setScore(state.score + recoveredScore, 'score regeneration');
  }, SCORE_REGEN_INTERVAL_MS);
}

function scheduleLoop() {
  if (!state.isRunning || !state.audioCtx) return;

  markLiveMisses();

  const now = state.audioCtx.currentTime;
  while (state.nextMeasureTime < now + (SCHED_LOOKAHEAD_MS / 1000)) {
    const measureDur = getMeasureDur();
    state.currentMeasureStart = state.nextMeasureTime;

    const patternForMeasure = [...state.pattern];
    const levelForMeasure = state.level;
    const bpmForMeasure = state.bpm;
    scheduleMeasure(state.nextMeasureTime, state.phase, state.repetition, patternForMeasure, levelForMeasure, bpmForMeasure);

    if (state.phase === PHASE.LISTEN) {
      state.phase = PHASE.TAP;
    } else {
      state.phase = PHASE.LISTEN;
      state.repetition += 1;
      if (state.repetition > REPS_PER_PATTERN) {
        state.repetition = 1;
        state.patternNumber += 1;
        state.completedPatternsInLevel += 1;

        if (state.completedPatternsInLevel >= PATTERNS_PER_LEVEL) {
          state.completedPatternsInLevel = 0;
          if (state.level >= LEVEL_MAX) {
            stopEngine();
            showResultScreen('Victory!', 'You finished level 10.');
            return;
          }
          const previousLevel = state.level;
          state.level += 1;
          syncInterpolatedSettings({ updateBpmDisplay: false });
          state.pendingBpmDisplayUpdate = true;
          appendLog(`[LEVEL UP] ${previousLevel} -> ${state.level} | nextBpm=${state.bpm}`);
        }

        state.pattern = generatePattern();
        appendLog(`[NEW pattern] lvl=${state.level} pattern=${formatPattern(state.pattern)}`);
      }
    }

    state.nextMeasureTime += measureDur;
    updateStaticUI();
  }
}

function startEngine() {
  if (!state.audioCtx || state.isCalibrating || state.isRunning) return;

  setAudioMuted(false);
  state.isRunning = true;
  state.level = state.startLevel;
  state.liveLevel = state.startLevel;
  syncInterpolatedSettings();
  state.liveBpm = state.bpm;
  state.patternNumber = 1;
  state.completedPatternsInLevel = 0;
  state.pattern = generatePattern();
  state.repetition = 1;
  state.phase = PHASE.LISTEN;
  state.liveRepetition = 1;
  state.livePhase = PHASE.LISTEN;
  state.fxEngine?.setPhase(FX_PHASE.LISTEN);
  state.expectedHits = [];
  state.tapPattern = null;
  state.tapMeasureBpm = state.liveBpm;
  state.score = state.maxScore;
  state.displayedScore = state.maxScore;
  state.displayedScoreTarget = state.maxScore;
  state.isIntroduction = true;

  // Introduction : phase d'entrée uniquement avec la hi-hat avant le début du jeu.
  const countInStart = state.audioCtx.currentTime + 0.08;
  const beatDur = 60 / state.bpm;
  for (let beat = 0; beat < START_COUNTIN_BEATS; beat += 1) {
    playHiHat(countInStart + (beat * beatDur));
  }
  [10, 14].forEach((idx) => {
    playHiHat(countInStart + ((idx / 4) * beatDur));
  });

  state.currentMeasureStart = countInStart + (START_COUNTIN_BEATS * beatDur);
  state.nextMeasureTime = state.currentMeasureStart;

  resetLog();
  appendLog(
    `[GAME start] lvl=${state.level} bpm=${state.bpm} latency=${state.latencyOffsetMs}ms hitWindow=${state.hitWindowMs}ms tolerance=${Math.round(getHitToleranceMs(state.bpm))}ms`
  );

  if (state.scheduleTimer) clearInterval(state.scheduleTimer);
  state.scheduleTimer = setInterval(scheduleLoop, SCHED_INTERVAL_MS);
  startScoreRegeneration();
  updateScoreUI();
  updateStaticUI();
}

function stopEngine() {
  state.isRunning = false;
  state.isIntroduction = false;
  cancelScheduledVoices();
  if (state.scheduleTimer) {
    clearInterval(state.scheduleTimer);
    state.scheduleTimer = null;
  }

  stopScoreRecoveryAnimation();
  stopScoreRegeneration();
  stopScoreStepAnimation();
  clearListenSaturationTimers();
  state.expectedHits = [];
  state.tapPattern = null;
  state.tapMeasureBpm = state.liveBpm;
  state.livePhase = PHASE.LISTEN;
  state.fxEngine?.setPhase(FX_PHASE.LISTEN);
  state.liveRepetition = 1;
  ui.tapZone.classList.remove('active', 'listen-muted', 'listen-release');
  ui.tapZone.style.setProperty('--tap-sat-transition-ms', '0ms');
  updateStaticUI();
}

function stopCalibration({ clearMessage = false } = {}) {
  if (!state.isCalibrating) return;

  state.isCalibrating = false;
  state.livePhase = PHASE.LISTEN;
  state.fxEngine?.setPhase(FX_PHASE.LISTEN);
  if (state.calibrationTimer !== null) {
    clearTimeout(state.calibrationTimer);
    state.calibrationTimer = null;
  }
  state.calibrationTargets = [];
  state.calibrationMatched = new Set();
  state.calibrationDelays = [];
  cancelScheduledVoices();
  if (clearMessage) {
    ui.calibrationResult.textContent = 'Calibration arrêtée.';
  }
  updateStaticUI();
}


function updateScoreUI() {
  const ratio = clamp(state.displayedScore / state.maxScore, 0, 1);
  const hue = Math.round(ratio * 120);
  ui.tapZone.style.setProperty('--fill-height', `${Math.round(ratio * 100)}%`);
  ui.tapZone.style.setProperty('--score-color', `hsl(${hue} 80% 45%)`);
}

function updateVisualLayerVariables({ amplitude, inTapPhase, phasePulse, bpmForVisuals }) {
  const reducedFx = amplitude < 1;
  const bpmFactor = clamp((Math.max(40, bpmForVisuals) - 40) / 120, 0, 1);
  const levelFactor = clamp((state.liveLevel - 1) / 9, 0, 1);
  const tapBoost = inTapPhase ? 1 : 0;

  const ambientOpacity = clamp(0.28 + (0.16 * levelFactor) + (0.18 * bpmFactor) + (0.22 * tapBoost) + (phasePulse * 0.04), 0.2, 0.88) * (reducedFx ? 0.68 : 1);
  const ambientScale = clamp(0.96 + (0.08 * levelFactor) + (0.07 * bpmFactor) + (0.05 * tapBoost) + (phasePulse * 0.015), 0.92, 1.2);
  const noiseOpacity = clamp(0.014 + (0.02 * bpmFactor) + (0.015 * tapBoost) + (0.008 * levelFactor), 0.01, 0.08) * (reducedFx ? 0.72 : 1);
  const tapRingOpacity = inTapPhase
    ? clamp(0.1 + (0.25 * bpmFactor) + (0.18 * levelFactor) + (Math.max(0, phasePulse) * 0.12), 0.08, 0.78)
    : 0;
  const tapRingScale = clamp(0.9 + (0.08 * bpmFactor) + (0.06 * levelFactor) + (Math.max(0, phasePulse) * 0.03), 0.88, 1.08);

  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--ambient-layer-opacity', ambientOpacity.toFixed(3));
  rootStyle.setProperty('--ambient-layer-scale', ambientScale.toFixed(3));
  rootStyle.setProperty('--noise-opacity', noiseOpacity.toFixed(3));
  rootStyle.setProperty('--tap-ring-opacity', tapRingOpacity.toFixed(3));
  rootStyle.setProperty('--tap-ring-scale', tapRingScale.toFixed(3));
}

function updateVisualFx(timestamp, { force = false } = {}) {
  const safeTimestamp = Number.isFinite(timestamp) ? timestamp : performance.now();
  if (state.visualFxLastTimestamp === null) {
    state.visualFxLastTimestamp = safeTimestamp;
  }

  const deltaSeconds = Math.max(0, (safeTimestamp - state.visualFxLastTimestamp) / 1000);
  state.visualFxLastTimestamp = safeTimestamp;

  const bpmForVisuals = state.isRunning ? state.liveBpm : state.bpm;
  const beatsPerSecond = Math.max(0, bpmForVisuals / 60);
  state.visualPhase = (state.visualPhase + (deltaSeconds * beatsPerSecond)) % 1;

  const hue = (state.visualPhase * 360) % 360;
  state.visualHue = hue;
  const reducedFx = document.body.classList.contains('fx-low');
  const amplitude = reducedFx ? 0.35 : 1;
  const phasePulse = Math.sin(state.visualPhase * Math.PI * 2);
  const inTapPhase = state.livePhase === PHASE.TAP && state.isRunning;
  const saturationBoost = ((inTapPhase ? 12 : 7) + (phasePulse * (inTapPhase ? 8 : 5))) * amplitude;
  const lightnessBoost = ((inTapPhase ? 8 : 4) + (phasePulse * (inTapPhase ? 5 : 3))) * amplitude;

  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--hue-primary', `${hue.toFixed(2)}deg`);
  rootStyle.setProperty('--hue-secondary', `${((hue + 120) % 360).toFixed(2)}deg`);
  rootStyle.setProperty('--hue-accent', `${((hue + 240) % 360).toFixed(2)}deg`);
  rootStyle.setProperty('--phase-sat-boost', `${saturationBoost.toFixed(2)}%`);
  rootStyle.setProperty('--phase-light-boost', `${lightnessBoost.toFixed(2)}%`);
  updateVisualLayerVariables({ amplitude, inTapPhase, phasePulse, bpmForVisuals });

  if (!force && state.visualFxFrame !== null) {
    state.visualFxFrame = requestAnimationFrame((nextTimestamp) => updateVisualFx(nextTimestamp));
  }
}

function startVisualFxLoop() {
  if (state.visualFxFrame !== null) return;
  state.visualFxLastTimestamp = null;
  state.visualFxFrame = requestAnimationFrame((timestamp) => updateVisualFx(timestamp));
}

function getTapZoneLabel() {
  if (!state.isRunning) return '';
  if (state.isIntroduction) return 'READY?';
  if (state.livePhase === PHASE.LISTEN) return 'LISTEN...';
  if (state.livePhase === PHASE.TAP) return 'TAP!';
  return '';
}

function updateStaticUI() {
  const isTapActive = (state.livePhase === PHASE.TAP || state.isCalibrating) && (state.isRunning || state.isCalibrating);
  ui.tapZone.classList.toggle('active', isTapActive);
  ui.tapZoneLabel.textContent = getTapZoneLabel();
  ui.gameLevelValue.textContent = String(state.isRunning ? state.liveLevel : state.level);
  document.body.classList.toggle('tap-phase', state.livePhase === PHASE.TAP && state.isRunning);
}

function getOldestPatternNoteWithinSubdiv(adjustedTapTime) {
  const windowSec = getSubdivDur(state.tapMeasureBpm);
  const pattern = state.tapPattern ?? state.pattern;
  const expectedHitByIdx = new Map(state.expectedHits.map((hit) => [hit.idx, hit]));

  for (let idx = 0; idx < pattern.length; idx += 1) {
    if (pattern[idx] !== 1 || idx === 15) continue;

    const expectedHit = expectedHitByIdx.get(idx);
    if (expectedHit && isHitJudged(expectedHit)) continue;

    const noteTime = state.tapMeasureStart + (idx * getSubdivDur(state.tapMeasureBpm));
    const distance = Math.abs(adjustedTapTime - noteTime);
    if (distance <= windowSec) {
      return { idx, noteTime };
    }
  }

  return null;
}

function getClosestSubdivIndex(adjustedTapTime) {
  const subdivDur = getSubdivDur(state.tapMeasureBpm);
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

  setAudioMuted(false);
  showGameScreen();
  state.isCalibrating = true;
  state.livePhase = PHASE.CALIBRATION;
  state.fxEngine?.setPhase(FX_PHASE.LISTEN);
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
  state.calibrationTimer = setTimeout(() => {
    state.calibrationTimer = null;
    state.isCalibrating = false;
    state.livePhase = PHASE.LISTEN;
    state.fxEngine?.setPhase(FX_PHASE.LISTEN);
    applyCalibrationResult();
    cancelScheduledVoices();
    updateStaticUI();
    showStartScreen();
  }, calibrationDurationMs);
}

function recordTap() {
  if (!state.audioCtx) return;

  let pulseIntensity = 0.55;
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
      const toleranceSec = getHitToleranceMs(state.liveBpm) / 1000;
      const errorSec = adjustedTapTime - hit.targetTime;

      if (Math.abs(errorSec) <= toleranceSec) {
        hit.correct = true;
        pulseIntensity = 1;
        appendLog(
          `[OK] note[${hit.idx + 1}] tap=${formatSeconds(adjustedTapTime)} target=${formatSeconds(hit.targetTime)} delta=${formatErrorMs(errorSec * 1000)}`
        );
      } else {
        hit.correct = false;
        pulseIntensity = 0.35;
        appendLog(
          `[ERR timing] note[${hit.idx + 1}] tap=${formatSeconds(adjustedTapTime)} target=${formatSeconds(hit.targetTime)} delta=${formatErrorMs(errorSec * 1000)}`
        );
        consumeScorePoint(`wrong timing note[${hit.idx + 1}] (${formatErrorMs(errorSec * 1000)})`);
      }
    } else {
      let scoreReason = '';
      const nearbyNote = getOldestPatternNoteWithinSubdiv(adjustedTapTime);

      if (nearbyNote) {
        const errorMs = (adjustedTapTime - nearbyNote.noteTime) * 1000;
        appendLog(
          `[ERR timing] note[${nearbyNote.idx + 1}] tap=${formatSeconds(adjustedTapTime)} target=${formatSeconds(nearbyNote.noteTime)} delta=${formatErrorMs(errorMs)}`
        );
        scoreReason = `wrong timing note[${nearbyNote.idx + 1}] (${formatErrorMs(errorMs)})`;
      } else {
        const closestIndex = getClosestSubdivIndex(adjustedTapTime);
        appendLog(
          `[ERR false] tap=${formatSeconds(adjustedTapTime)} closestSubdiv=${closestIndex + 1}`
        );
        scoreReason = `false note entered[${closestIndex + 1}]`;
      }
      consumeScorePoint(scoreReason);
      pulseIntensity = 0.28;
    }
  } else {
    return;
  }

  triggerTapZoneFeedback({ vibrate: true });
  state.fxEngine?.pulseHit(pulseIntensity);

}


function clearLocalCache() {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.level);
    window.localStorage.removeItem(STORAGE_KEYS.bpmLevel1);
    window.localStorage.removeItem(STORAGE_KEYS.bpmLevel10);
    window.localStorage.removeItem(STORAGE_KEYS.weightFirstLevel1);
    window.localStorage.removeItem(STORAGE_KEYS.weightFirstLevel10);
    window.localStorage.removeItem(STORAGE_KEYS.weightJumpLevel1);
    window.localStorage.removeItem(STORAGE_KEYS.weightJumpLevel10);
    window.localStorage.removeItem(STORAGE_KEYS.latencyOffsetMs);
    window.localStorage.removeItem(STORAGE_KEYS.hitTolerance);
    window.localStorage.removeItem(STORAGE_KEYS.hitWindowMs);
    window.localStorage.removeItem(STORAGE_KEYS.scoreRecoveryPerSecond);
    window.localStorage.removeItem(STORAGE_KEYS.maxScore);
  } catch (_error) {
    // Ignore storage errors
  }

  state.startLevel = LEVEL_DEFAULT;
  state.level = LEVEL_DEFAULT;
  state.bpmLevel1 = BPM_LEVEL1_DEFAULT;
  state.bpmLevel10 = BPM_LEVEL10_DEFAULT;
  state.firstHitWeightsLevel1 = [...FIRST_HIT_WEIGHTS_LEVEL1_DEFAULT];
  state.firstHitWeightsLevel10 = [...FIRST_HIT_WEIGHTS_LEVEL10_DEFAULT];
  state.jumpWeightsLevel1 = [...JUMP_WEIGHTS_LEVEL1_DEFAULT];
  state.jumpWeightsLevel10 = [...JUMP_WEIGHTS_LEVEL10_DEFAULT];
  syncInterpolatedSettings();
  state.latencyOffsetMs = INPUT_LATENCY_DEFAULT_MS;
  state.hitTolerance = HIT_TOLERANCE_DEFAULT;
  state.hitWindowMs = HIT_WINDOW_DEFAULT_MS;
  state.scoreRecoveryPerSecond = SCORE_RECOVERY_PER_SECOND_DEFAULT;
  state.maxScore = MAX_SCORE_DEFAULT;
  state.score = state.maxScore;
  state.displayedScore = state.maxScore;
  state.displayedScoreTarget = state.maxScore;

  ui.startLevel.value = String(state.startLevel);
  ui.startLevelValue.textContent = String(state.startLevel);
  ui.bpmLevel1.value = String(state.bpmLevel1);
  ui.bpmLevel1Value.textContent = String(state.bpmLevel1);
  ui.bpmLevel10.value = String(state.bpmLevel10);
  ui.bpmLevel10Value.textContent = String(state.bpmLevel10);

  ui.endpointInputs.forEach(({ input, value, key, level, index }) => {
    const source = key === 'first'
      ? (level === 1 ? state.firstHitWeightsLevel1 : state.firstHitWeightsLevel10)
      : (level === 1 ? state.jumpWeightsLevel1 : state.jumpWeightsLevel10);
    const weight = source[index];
    input.value = String(weight);
    value.textContent = String(weight);
  });

  ui.latency.value = String(state.latencyOffsetMs);
  ui.latencyValue.textContent = String(state.latencyOffsetMs);
  ui.hitTolerance.value = String(state.hitTolerance);
  ui.scoreRecoveryPerSecond.value = String(state.scoreRecoveryPerSecond);
  ui.scoreRecoveryPerSecondValue.textContent = state.scoreRecoveryPerSecond.toFixed(1);
  ui.maxScore.value = String(state.maxScore);
  updateHitWindowUI();
  updateHitToleranceUI();
  ui.calibrationResult.textContent = 'Paramètres réinitialisés.';
}

function bindEndpointControls() {
  ui.endpointInputs.forEach(({ input, value, key, level, index }) => {
    const source = key === 'first'
      ? (level === 1 ? state.firstHitWeightsLevel1 : state.firstHitWeightsLevel10)
      : (level === 1 ? state.jumpWeightsLevel1 : state.jumpWeightsLevel10);
    input.value = String(source[index]);
    value.textContent = String(source[index]);

    const sync = () => {
      const weight = clamp(Number(input.value), 0, 10);
      input.value = String(weight);
      value.textContent = String(weight);
      if (key === 'first') {
        if (level === 1) {
          state.firstHitWeightsLevel1[index] = weight;
          saveArraySetting(STORAGE_KEYS.weightFirstLevel1, state.firstHitWeightsLevel1);
        } else {
          state.firstHitWeightsLevel10[index] = weight;
          saveArraySetting(STORAGE_KEYS.weightFirstLevel10, state.firstHitWeightsLevel10);
        }
      } else {
        if (level === 1) {
          state.jumpWeightsLevel1[index] = weight;
          saveArraySetting(STORAGE_KEYS.weightJumpLevel1, state.jumpWeightsLevel1);
        } else {
          state.jumpWeightsLevel10[index] = weight;
          saveArraySetting(STORAGE_KEYS.weightJumpLevel10, state.jumpWeightsLevel10);
        }
      }

      syncInterpolatedSettings();
      updateHitWindowUI();
      updateHitToleranceUI();
    };

    input.addEventListener('input', sync);
    sync();
  });
}

ui.startLevel.min = String(LEVEL_MIN);
ui.startLevel.max = String(LEVEL_MAX);
ui.bpmLevel1.min = String(BPM_MIN);
ui.bpmLevel1.max = String(BPM_MAX);
ui.bpmLevel10.min = String(BPM_MIN);
ui.bpmLevel10.max = String(BPM_MAX);
applyPersistedSettings();

ui.startLevel.value = String(state.startLevel);
ui.startLevelValue.textContent = String(state.startLevel);
ui.bpmLevel1.value = String(state.bpmLevel1);
ui.bpmLevel1Value.textContent = String(state.bpmLevel1);
ui.bpmLevel10.value = String(state.bpmLevel10);
ui.bpmLevel10Value.textContent = String(state.bpmLevel10);
ui.latency.min = String(INPUT_LATENCY_MIN_MS);
ui.latency.max = String(INPUT_LATENCY_MAX_MS);
ui.latency.value = String(state.latencyOffsetMs);
ui.latencyValue.textContent = String(state.latencyOffsetMs);
ui.hitTolerance.min = String(HIT_TOLERANCE_MIN);
ui.hitTolerance.max = String(HIT_TOLERANCE_MAX);
ui.hitTolerance.value = String(state.hitTolerance);
ui.scoreRecoveryPerSecond.min = String(SCORE_RECOVERY_PER_SECOND_MIN);
ui.scoreRecoveryPerSecond.max = String(SCORE_RECOVERY_PER_SECOND_MAX);
ui.scoreRecoveryPerSecond.value = String(state.scoreRecoveryPerSecond);
ui.scoreRecoveryPerSecondValue.textContent = state.scoreRecoveryPerSecond.toFixed(1);
ui.maxScore.value = String(state.maxScore);

ui.startLevel.addEventListener('input', (e) => {
  state.startLevel = clamp(Math.round(Number(e.target.value)), LEVEL_MIN, LEVEL_MAX);
  ui.startLevelValue.textContent = String(state.startLevel);
  saveSetting(STORAGE_KEYS.level, state.startLevel);
});

ui.bpmLevel1.addEventListener('input', (e) => {
  state.bpmLevel1 = clamp(Math.round(Number(e.target.value)), BPM_MIN, BPM_MAX);
  ui.bpmLevel1Value.textContent = String(state.bpmLevel1);
  saveSetting(STORAGE_KEYS.bpmLevel1, state.bpmLevel1);
  syncInterpolatedSettings();
  updateHitWindowUI();
  updateHitToleranceUI();
});

ui.bpmLevel10.addEventListener('input', (e) => {
  state.bpmLevel10 = clamp(Math.round(Number(e.target.value)), BPM_MIN, BPM_MAX);
  ui.bpmLevel10Value.textContent = String(state.bpmLevel10);
  saveSetting(STORAGE_KEYS.bpmLevel10, state.bpmLevel10);
  syncInterpolatedSettings();
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

ui.scoreRecoveryPerSecond.addEventListener('input', (e) => {
  state.scoreRecoveryPerSecond = clamp(Number(Number(e.target.value).toFixed(1)), SCORE_RECOVERY_PER_SECOND_MIN, SCORE_RECOVERY_PER_SECOND_MAX);
  ui.scoreRecoveryPerSecond.value = String(state.scoreRecoveryPerSecond);
  ui.scoreRecoveryPerSecondValue.textContent = state.scoreRecoveryPerSecond.toFixed(1);
  saveSetting(STORAGE_KEYS.scoreRecoveryPerSecond, state.scoreRecoveryPerSecond);
});

ui.maxScore.addEventListener('input', (e) => {
  const digits = String(e.target.value).replace(/\D+/g, '');
  const parsed = digits === '' ? state.maxScore : Number(digits);
  state.maxScore = clamp(Math.round(parsed), MAX_SCORE_MIN, MAX_SCORE_MAX);
  ui.maxScore.value = String(state.maxScore);
  state.score = clamp(state.score, 0, state.maxScore);
  state.displayedScore = clamp(state.displayedScore, 0, state.maxScore);
  state.displayedScoreTarget = clamp(state.displayedScoreTarget, 0, state.maxScore);
  saveSetting(STORAGE_KEYS.maxScore, state.maxScore);
  updateScoreUI();
});

ui.startGame.addEventListener('click', () => {
  unlockAudio();
  showGameScreen();
  startEngine();
});

ui.stopGame.addEventListener('click', () => {
  stopCalibration({ clearMessage: true });
  stopEngine();
  showStartScreen();
});

ui.backToMenu.addEventListener('click', () => {
  showStartScreen();
});

ui.calibration.addEventListener('click', startCalibration);
ui.clearCache.addEventListener('click', clearLocalCache);
ui.tapZone.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  unlockAudio();
  recordTap();
});

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();

  if (!state.isRunning || state.isCalibrating) return;
  unlockAudio();
  recordTap();
});

window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('resize', () => {
  state.fxEngine?.resize(window.innerWidth, window.innerHeight);
});
window.addEventListener('beforeunload', () => {
  state.fxEngine?.destroy();
});

bindEndpointControls();
startVisualFxLoop();
updateHitWindowUI();
updateHitToleranceUI();
updateStaticUI();
updateScoreUI();
updateVisualFx(performance.now(), { force: true });
showStartScreen();
ui.appVersion.textContent = `v${APP_VERSION}`;
initializeFxEngine();
