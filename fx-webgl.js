const FX_VERTEX_SHADER_WEBGL1 = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = (aPosition + 1.0) * 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FX_FRAGMENT_SHADER_SHARED = `
precision mediump float;

varying vec2 vUv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_bpm;
uniform float u_level;
uniform float u_phase;
uniform float u_hitPulse;
uniform float u_beatPulse;
uniform float u_safeMode;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i += 1) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 centered = (vUv - 0.5) * vec2(u_resolution.x / max(1.0, u_resolution.y), 1.0);
  float safeMix = clamp(u_safeMode, 0.0, 1.0);
  float speedFactor = mix(1.0, 0.55, safeMix);
  float radius = length(centered);
  float time = u_time * speedFactor;

  float beatsPerSecond = max(0.1, u_bpm / 60.0);
  float beatWave = 0.5 + 0.5 * sin((time * 6.2831853 * beatsPerSecond) + (radius * 8.0));

  float angle = atan(centered.y, centered.x);
  float levelMix = clamp((u_level - 1.0) / 9.0, 0.0, 1.0);
  float segments = mix(4.0, 12.0, levelMix);
  float segAngle = 6.2831853 / segments;
  float kaleido = abs(mod(angle + (segAngle * 0.5), segAngle) - (segAngle * 0.5));

  vec2 warpUv = vec2(kaleido, radius * (2.1 + (levelMix * 2.3)));
  warpUv += vec2(time * (0.2 + 0.18 * levelMix), -time * 0.18);
  float nebula = fbm(warpUv * 2.0);
  float nebulaLayer = fbm((warpUv * 3.7) + vec2(2.3, -1.7));
  float starField = pow(noise((centered * 110.0) + vec2(time * 9.0, time * 3.0)), 14.0);

  vec3 listenColor = vec3(0.09, 0.19, 0.38);
  vec3 tapColor = vec3(0.06, 0.39, 0.22);
  vec3 phaseColor = mix(listenColor, tapColor, clamp(u_phase, 0.0, 1.0));

  vec3 accent = mix(vec3(0.26, 0.58, 0.96), vec3(0.65, 0.30, 0.92), levelMix);
  vec3 nebulaColor = mix(vec3(0.08, 0.10, 0.20), accent, clamp((nebula * 0.9) + (nebulaLayer * 0.7), 0.0, 1.0));
  vec3 kaleidoColor = accent * (0.18 + 0.35 * smoothstep(0.42, 0.0, kaleido + radius * 0.05));

  float pulseEnergy = max(u_hitPulse, u_beatPulse * 0.55);
  float pulseGlow = exp(-radius * (3.0 + (pulseEnergy * 2.0))) * pulseEnergy;
  float vignette = smoothstep(1.15, 0.18, radius);

  vec3 color = (phaseColor * 0.38)
    + (nebulaColor * (0.58 + 0.22 * beatWave))
    + (kaleidoColor * (0.35 + 0.25 * u_beatPulse))
    + (accent * pulseGlow * 0.85)
    + vec3(starField * (0.35 + 0.35 * u_beatPulse));

  float contrast = mix(1.0, 0.72, safeMix);
  color = mix(vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))), color, contrast);
  color *= vignette;

  gl_FragColor = vec4(color, 0.72);
}
`;

const FX_FRAGMENT_SHADER_WEBGL1 = FX_FRAGMENT_SHADER_SHARED;

const FX_VERTEX_SHADER_WEBGL2 = `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = (aPosition + 1.0) * 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FX_FRAGMENT_SHADER_WEBGL2 = `#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 outColor;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_bpm;
uniform float u_level;
uniform float u_phase;
uniform float u_hitPulse;
uniform float u_beatPulse;
uniform float u_safeMode;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i += 1) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 centered = (vUv - 0.5) * vec2(u_resolution.x / max(1.0, u_resolution.y), 1.0);
  float safeMix = clamp(u_safeMode, 0.0, 1.0);
  float speedFactor = mix(1.0, 0.55, safeMix);
  float radius = length(centered);
  float time = u_time * speedFactor;

  float beatsPerSecond = max(0.1, u_bpm / 60.0);
  float beatWave = 0.5 + 0.5 * sin((time * 6.2831853 * beatsPerSecond) + (radius * 8.0));

  float angle = atan(centered.y, centered.x);
  float levelMix = clamp((u_level - 1.0) / 9.0, 0.0, 1.0);
  float segments = mix(4.0, 12.0, levelMix);
  float segAngle = 6.2831853 / segments;
  float kaleido = abs(mod(angle + (segAngle * 0.5), segAngle) - (segAngle * 0.5));

  vec2 warpUv = vec2(kaleido, radius * (2.1 + (levelMix * 2.3)));
  warpUv += vec2(time * (0.2 + 0.18 * levelMix), -time * 0.18);
  float nebula = fbm(warpUv * 2.0);
  float nebulaLayer = fbm((warpUv * 3.7) + vec2(2.3, -1.7));
  float starField = pow(noise((centered * 110.0) + vec2(time * 9.0, time * 3.0)), 14.0);

  vec3 listenColor = vec3(0.09, 0.19, 0.38);
  vec3 tapColor = vec3(0.06, 0.39, 0.22);
  vec3 phaseColor = mix(listenColor, tapColor, clamp(u_phase, 0.0, 1.0));

  vec3 accent = mix(vec3(0.26, 0.58, 0.96), vec3(0.65, 0.30, 0.92), levelMix);
  vec3 nebulaColor = mix(vec3(0.08, 0.10, 0.20), accent, clamp((nebula * 0.9) + (nebulaLayer * 0.7), 0.0, 1.0));
  vec3 kaleidoColor = accent * (0.18 + 0.35 * smoothstep(0.42, 0.0, kaleido + radius * 0.05));

  float pulseEnergy = max(u_hitPulse, u_beatPulse * 0.55);
  float pulseGlow = exp(-radius * (3.0 + (pulseEnergy * 2.0))) * pulseEnergy;
  float vignette = smoothstep(1.15, 0.18, radius);

  vec3 color = (phaseColor * 0.38)
    + (nebulaColor * (0.58 + 0.22 * beatWave))
    + (kaleidoColor * (0.35 + 0.25 * u_beatPulse))
    + (accent * pulseGlow * 0.85)
    + vec3(starField * (0.35 + 0.35 * u_beatPulse));

  float contrast = mix(1.0, 0.72, safeMix);
  color = mix(vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))), color, contrast);
  color *= vignette;

  outColor = vec4(color, 0.72);
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export function createWebglFx({ canvas, safeMode = false }) {
  if (!canvas) return null;

  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true })
    || canvas.getContext('webgl', { alpha: true, antialias: true });
  if (!gl) return null;

  const isWebgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const program = createProgram(
    gl,
    isWebgl2 ? FX_VERTEX_SHADER_WEBGL2 : FX_VERTEX_SHADER_WEBGL1,
    isWebgl2 ? FX_FRAGMENT_SHADER_WEBGL2 : FX_FRAGMENT_SHADER_WEBGL1
  );
  if (!program) return null;

  const vertices = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    1, 1
  ]);

  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  if (positionLocation === -1) {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    return null;
  }

  const uniforms = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    time: gl.getUniformLocation(program, 'u_time'),
    bpm: gl.getUniformLocation(program, 'u_bpm'),
    level: gl.getUniformLocation(program, 'u_level'),
    phase: gl.getUniformLocation(program, 'u_phase'),
    hitPulse: gl.getUniformLocation(program, 'u_hitPulse'),
    beatPulse: gl.getUniformLocation(program, 'u_beatPulse'),
    safeMode: gl.getUniformLocation(program, 'u_safeMode')
  };

  let width = 1;
  let height = 1;
  let destroyed = false;
  let rafId = null;

  const state = {
    bpm: 90,
    bpmCurrent: 90,
    level: 1,
    levelCurrent: 1,
    phase: 0,
    phaseTarget: 0,
    hitPulse: 0,
    beatPulse: 0,
    safeMode: Boolean(safeMode),
    safeModeCurrent: safeMode ? 1 : 0,
    beatIndex: -1,
    startedAt: performance.now()
  };

  function resize(nextWidth, nextHeight) {
    const safeWidth = Math.max(1, Math.floor(nextWidth || 1));
    const safeHeight = Math.max(1, Math.floor(nextHeight || 1));
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    width = safeWidth;
    height = safeHeight;

    canvas.width = Math.floor(safeWidth * dpr);
    canvas.height = Math.floor(safeHeight * dpr);
    canvas.style.width = `${safeWidth}px`;
    canvas.style.height = `${safeHeight}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function frame(now) {
    if (destroyed) return;

    const elapsed = (now - state.startedAt) / 1000;
    state.safeModeCurrent += ((state.safeMode ? 1 : 0) - state.safeModeCurrent) * 0.05;
    state.phase += (state.phaseTarget - state.phase) * 0.08;
    state.bpmCurrent += (state.bpm - state.bpmCurrent) * 0.07;
    state.levelCurrent += (state.level - state.levelCurrent) * 0.05;
    state.hitPulse *= 0.88;
    state.beatPulse *= 0.9;

    const beatsPerSecond = Math.max(0.1, state.bpmCurrent / 60);
    const currentBeat = Math.floor(elapsed * beatsPerSecond);
    if (currentBeat !== state.beatIndex) {
      state.beatIndex = currentBeat;
      const beatIntensity = state.safeMode ? 0.32 : 0.62;
      state.beatPulse = Math.max(state.beatPulse, beatIntensity);
    }

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform1f(uniforms.time, elapsed);
    gl.uniform1f(uniforms.bpm, state.bpmCurrent);
    gl.uniform1f(uniforms.level, state.levelCurrent);
    gl.uniform1f(uniforms.phase, state.phase);
    gl.uniform1f(uniforms.hitPulse, state.hitPulse);
    gl.uniform1f(uniforms.beatPulse, state.beatPulse);
    gl.uniform1f(uniforms.safeMode, state.safeModeCurrent);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    rafId = requestAnimationFrame(frame);
  }

  resize(window.innerWidth, window.innerHeight);
  rafId = requestAnimationFrame(frame);

  return {
    setBpm(bpm) {
      state.bpm = Math.max(1, Number(bpm) || state.bpm);
    },
    setLevel(level) {
      state.level = Math.max(1, Math.min(10, Number(level) || state.level));
    },
    setPhase(phase) {
      state.phaseTarget = phase === 'tap' ? 1 : 0;
    },
    pulseHit(intensity = 1) {
      const safeIntensity = Math.max(0, Math.min(1.5, Number(intensity) || 0));
      const intensityCap = state.safeMode ? 0.65 : 1.2;
      state.hitPulse = Math.max(state.hitPulse, Math.min(intensityCap, safeIntensity));
    },
    setSafeMode(enabled) {
      state.safeMode = Boolean(enabled);
    },
    resize,
    destroy() {
      destroyed = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    }
  };
}
