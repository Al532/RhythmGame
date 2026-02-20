const FX_VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = (aPosition + 1.0) * 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FX_BASE_FRAGMENT_SHADER = `
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
uniform float u_effectBoost;

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

  float pulseEnergy = max(u_hitPulse, u_beatPulse * 0.55) + (u_effectBoost * 0.3);
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

  gl_FragColor = vec4(color, 1.0);
}
`;

const FX_POST_FRAGMENT_SHADER = `
precision mediump float;

varying vec2 vUv;
uniform sampler2D u_scene;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_postIntensity;
uniform float u_bloomStrength;
uniform float u_chromaticStrength;
uniform float u_noiseStrength;
uniform float u_enableBloom;
uniform float u_enableChromatic;
uniform float u_limiter;
uniform float u_effectBoost;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 sampleScene(vec2 uv) {
  return texture2D(u_scene, clamp(uv, 0.0, 1.0)).rgb;
}

void main() {
  vec2 texel = 1.0 / max(u_resolution, vec2(1.0));
  float finalIntensity = min(2.0, u_postIntensity * (1.0 + (u_effectBoost * 0.45)));
  vec2 caOffset = texel * u_chromaticStrength * finalIntensity * 1.35 * u_enableChromatic;

  vec3 base = sampleScene(vUv);
  vec3 chroma;
  chroma.r = sampleScene(vUv + caOffset).r;
  chroma.g = base.g;
  chroma.b = sampleScene(vUv - caOffset).b;

  vec3 bloom = vec3(0.0);
  if (u_enableBloom > 0.5) {
    bloom += sampleScene(vUv + vec2(texel.x, 0.0));
    bloom += sampleScene(vUv - vec2(texel.x, 0.0));
    bloom += sampleScene(vUv + vec2(0.0, texel.y));
    bloom += sampleScene(vUv - vec2(0.0, texel.y));
    bloom += sampleScene(vUv + texel * 2.0);
    bloom += sampleScene(vUv - texel * 2.0);
    bloom /= 6.0;
    float bright = smoothstep(0.62, 1.05, max(max(base.r, base.g), base.b));
    bloom *= bright * u_bloomStrength * finalIntensity;
  }

  float noise = (hash21(gl_FragCoord.xy + vec2(u_time * 60.0, -u_time * 17.0)) - 0.5) * u_noiseStrength * finalIntensity;

  vec3 color = mix(base, chroma, clamp(u_enableChromatic * 0.8, 0.0, 1.0));
  color += bloom;
  color += noise;

  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float cap = max(0.35, u_limiter);
  float compression = min(1.0, cap / max(0.0001, lum));
  color *= mix(1.0, compression, 0.85);

  gl_FragColor = vec4(color, 0.72);
}
`;

const FX_PRESETS = {
  minimal: { bloom: 0.14, chromatic: 0.16, noise: 0.008 },
  neon: { bloom: 0.3, chromatic: 0.35, noise: 0.012 },
  insane: { bloom: 0.52, chromatic: 0.75, noise: 0.024 }
};

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

function createRenderTarget(gl, width, height) {
  const framebuffer = gl.createFramebuffer();
  const texture = gl.createTexture();
  if (!framebuffer || !texture) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(framebuffer);
    return null;
  }

  return { framebuffer, texture, width, height };
}

function ensureRenderTarget(gl, target, width, height) {
  if (!target) return createRenderTarget(gl, width, height);
  if (target.width === width && target.height === height) return target;

  gl.bindTexture(gl.TEXTURE_2D, target.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  target.width = width;
  target.height = height;
  return target;
}

export function createWebglFx({ canvas, safeMode = false, preset = 'minimal', intensity = 0.8 }) {
  if (!canvas) return null;

  const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
  if (!gl) return null;

  const baseProgram = createProgram(gl, FX_VERTEX_SHADER, FX_BASE_FRAGMENT_SHADER);
  const postProgram = createProgram(gl, FX_VERTEX_SHADER, FX_POST_FRAGMENT_SHADER);
  if (!baseProgram || !postProgram) return null;

  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(baseProgram);
    gl.deleteProgram(postProgram);
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const basePositionLocation = gl.getAttribLocation(baseProgram, 'aPosition');
  const postPositionLocation = gl.getAttribLocation(postProgram, 'aPosition');
  if (basePositionLocation === -1 || postPositionLocation === -1) {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(baseProgram);
    gl.deleteProgram(postProgram);
    return null;
  }

  const baseUniforms = {
    resolution: gl.getUniformLocation(baseProgram, 'u_resolution'),
    time: gl.getUniformLocation(baseProgram, 'u_time'),
    bpm: gl.getUniformLocation(baseProgram, 'u_bpm'),
    level: gl.getUniformLocation(baseProgram, 'u_level'),
    phase: gl.getUniformLocation(baseProgram, 'u_phase'),
    hitPulse: gl.getUniformLocation(baseProgram, 'u_hitPulse'),
    beatPulse: gl.getUniformLocation(baseProgram, 'u_beatPulse'),
    safeMode: gl.getUniformLocation(baseProgram, 'u_safeMode'),
    effectBoost: gl.getUniformLocation(baseProgram, 'u_effectBoost')
  };

  const postUniforms = {
    scene: gl.getUniformLocation(postProgram, 'u_scene'),
    resolution: gl.getUniformLocation(postProgram, 'u_resolution'),
    time: gl.getUniformLocation(postProgram, 'u_time'),
    postIntensity: gl.getUniformLocation(postProgram, 'u_postIntensity'),
    bloomStrength: gl.getUniformLocation(postProgram, 'u_bloomStrength'),
    chromaticStrength: gl.getUniformLocation(postProgram, 'u_chromaticStrength'),
    noiseStrength: gl.getUniformLocation(postProgram, 'u_noiseStrength'),
    enableBloom: gl.getUniformLocation(postProgram, 'u_enableBloom'),
    enableChromatic: gl.getUniformLocation(postProgram, 'u_enableChromatic'),
    limiter: gl.getUniformLocation(postProgram, 'u_limiter'),
    effectBoost: gl.getUniformLocation(postProgram, 'u_effectBoost')
  };

  let width = 1;
  let height = 1;
  let renderTarget = null;
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
    beatBoost: 0,
    perfectBoost: 0,
    safeMode: Boolean(safeMode),
    safeModeCurrent: safeMode ? 1 : 0,
    beatIndex: -1,
    startedAt: performance.now(),
    preset: FX_PRESETS[preset] ? preset : 'minimal',
    postIntensity: Math.max(0, Math.min(1.5, Number(intensity) || 0.8)),
    limiter: 1.0,
    noiseEnabled: true,
    fpsAverage: 60,
    lowFpsMode: false
  };

  function setViewportAndTarget(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

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
    renderTarget = ensureRenderTarget(gl, renderTarget, canvas.width, canvas.height);
  }

  let lastFrameTime = performance.now();

  function frame(now) {
    if (destroyed) return;

    const elapsed = (now - state.startedAt) / 1000;
    const frameDeltaMs = Math.max(1, now - lastFrameTime);
    lastFrameTime = now;
    const fpsInstant = 1000 / frameDeltaMs;
    state.fpsAverage = (state.fpsAverage * 0.92) + (fpsInstant * 0.08);

    if (!state.lowFpsMode && state.fpsAverage < 45) state.lowFpsMode = true;
    else if (state.lowFpsMode && state.fpsAverage > 54) state.lowFpsMode = false;

    state.safeModeCurrent += ((state.safeMode ? 1 : 0) - state.safeModeCurrent) * 0.05;
    state.phase += (state.phaseTarget - state.phase) * 0.08;
    state.bpmCurrent += (state.bpm - state.bpmCurrent) * 0.07;
    state.levelCurrent += (state.level - state.levelCurrent) * 0.05;
    state.hitPulse *= 0.88;
    state.beatPulse *= 0.9;
    state.beatBoost *= 0.78;
    state.perfectBoost *= 0.76;

    const beatsPerSecond = Math.max(0.1, state.bpmCurrent / 60);
    const currentBeat = Math.floor(elapsed * beatsPerSecond);
    if (currentBeat !== state.beatIndex) {
      state.beatIndex = currentBeat;
      state.beatPulse = Math.max(state.beatPulse, state.safeMode ? 0.32 : 0.58);
      state.beatBoost = Math.max(state.beatBoost, 0.35);
    }

    const effectBoost = Math.min(state.limiter, Math.max(state.hitPulse, state.beatBoost, state.perfectBoost));
    const preset = FX_PRESETS[state.preset] || FX_PRESETS.minimal;
    const expensiveAllowed = !state.lowFpsMode && state.safeModeCurrent < 0.65;

    // Pass 1: base scene into intermediate texture
    setViewportAndTarget(renderTarget?.framebuffer ?? null);
    gl.disable(gl.BLEND);
    gl.useProgram(baseProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(basePositionLocation);
    gl.vertexAttribPointer(basePositionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(baseUniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(baseUniforms.time, elapsed);
    gl.uniform1f(baseUniforms.bpm, state.bpmCurrent);
    gl.uniform1f(baseUniforms.level, state.levelCurrent);
    gl.uniform1f(baseUniforms.phase, state.phase);
    gl.uniform1f(baseUniforms.hitPulse, state.hitPulse);
    gl.uniform1f(baseUniforms.beatPulse, state.beatPulse);
    gl.uniform1f(baseUniforms.safeMode, state.safeModeCurrent);
    gl.uniform1f(baseUniforms.effectBoost, effectBoost);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Pass 2: post-process fullscreen quad to canvas
    setViewportAndTarget(null);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(postProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(postPositionLocation);
    gl.vertexAttribPointer(postPositionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderTarget.texture);
    gl.uniform1i(postUniforms.scene, 0);
    gl.uniform2f(postUniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(postUniforms.time, elapsed);
    gl.uniform1f(postUniforms.postIntensity, state.postIntensity);
    gl.uniform1f(postUniforms.bloomStrength, preset.bloom);
    gl.uniform1f(postUniforms.chromaticStrength, preset.chromatic);
    gl.uniform1f(postUniforms.noiseStrength, state.noiseEnabled ? preset.noise : 0);
    gl.uniform1f(postUniforms.enableBloom, expensiveAllowed ? 1 : 0);
    gl.uniform1f(postUniforms.enableChromatic, expensiveAllowed ? 1 : 0.35);
    gl.uniform1f(postUniforms.limiter, state.limiter);
    gl.uniform1f(postUniforms.effectBoost, effectBoost);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    rafId = requestAnimationFrame(frame);
  }

  resize(window.innerWidth, window.innerHeight);
  if (!renderTarget) {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(baseProgram);
    gl.deleteProgram(postProgram);
    return null;
  }
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
    pulseHit(intensity = 1, options = {}) {
      const safeIntensity = Math.max(0, Math.min(1.8, Number(intensity) || 0));
      const intensityCap = state.safeMode ? 0.65 : 1.35;
      state.hitPulse = Math.max(state.hitPulse, Math.min(intensityCap, safeIntensity));
      if (options && options.perfect) {
        state.perfectBoost = Math.max(state.perfectBoost, state.safeMode ? 0.28 : 0.75);
      }
    },
    setSafeMode(enabled) {
      state.safeMode = Boolean(enabled);
    },
    setPreset(name) {
      if (FX_PRESETS[name]) state.preset = name;
    },
    setPostIntensity(value) {
      state.postIntensity = Math.max(0, Math.min(1.5, Number(value) || state.postIntensity));
    },
    setNoiseEnabled(enabled) {
      state.noiseEnabled = Boolean(enabled);
    },
    setLimiter(value) {
      state.limiter = Math.max(0.35, Math.min(1.15, Number(value) || state.limiter));
    },
    resize,
    destroy() {
      destroyed = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (renderTarget) {
        gl.deleteTexture(renderTarget.texture);
        gl.deleteFramebuffer(renderTarget.framebuffer);
      }
      gl.deleteBuffer(buffer);
      gl.deleteProgram(baseProgram);
      gl.deleteProgram(postProgram);
    }
  };
}
