const FX_VERTEX_SHADER_WEBGL1 = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = (aPosition + 1.0) * 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FX_FRAGMENT_SHADER_WEBGL1 = `
precision mediump float;

varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform float uBpm;
uniform float uLevel;
uniform float uPhase;
uniform float uPulse;

void main() {
  vec2 centered = (vUv - 0.5) * vec2(uResolution.x / max(1.0, uResolution.y), 1.0);
  float radius = length(centered);
  float beatsPerSecond = max(0.1, uBpm / 60.0);
  float beatWave = 0.5 + 0.5 * sin((uTime * 6.2831853 * beatsPerSecond) + (radius * 8.0));

  vec3 listenColor = vec3(0.09, 0.19, 0.38);
  vec3 tapColor = vec3(0.06, 0.39, 0.22);
  vec3 phaseColor = mix(listenColor, tapColor, clamp(uPhase, 0.0, 1.0));

  float levelMix = clamp((uLevel - 1.0) / 9.0, 0.0, 1.0);
  vec3 accent = mix(vec3(0.26, 0.58, 0.96), vec3(0.65, 0.30, 0.92), levelMix);

  float pulseGlow = exp(-radius * (3.0 + (uPulse * 1.5))) * uPulse;
  float vignette = smoothstep(1.15, 0.18, radius);
  vec3 color = phaseColor + (accent * (0.22 + 0.24 * beatWave)) + (accent * pulseGlow * 0.8);
  color *= vignette;

  gl_FragColor = vec4(color, 0.72);
}
`;

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
uniform vec2 uResolution;
uniform float uTime;
uniform float uBpm;
uniform float uLevel;
uniform float uPhase;
uniform float uPulse;

void main() {
  vec2 centered = (vUv - 0.5) * vec2(uResolution.x / max(1.0, uResolution.y), 1.0);
  float radius = length(centered);
  float beatsPerSecond = max(0.1, uBpm / 60.0);
  float beatWave = 0.5 + 0.5 * sin((uTime * 6.2831853 * beatsPerSecond) + (radius * 8.0));

  vec3 listenColor = vec3(0.09, 0.19, 0.38);
  vec3 tapColor = vec3(0.06, 0.39, 0.22);
  vec3 phaseColor = mix(listenColor, tapColor, clamp(uPhase, 0.0, 1.0));

  float levelMix = clamp((uLevel - 1.0) / 9.0, 0.0, 1.0);
  vec3 accent = mix(vec3(0.26, 0.58, 0.96), vec3(0.65, 0.30, 0.92), levelMix);

  float pulseGlow = exp(-radius * (3.0 + (uPulse * 1.5))) * uPulse;
  float vignette = smoothstep(1.15, 0.18, radius);
  vec3 color = phaseColor + (accent * (0.22 + 0.24 * beatWave)) + (accent * pulseGlow * 0.8);
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

export function createWebglFx({ canvas }) {
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
    resolution: gl.getUniformLocation(program, 'uResolution'),
    time: gl.getUniformLocation(program, 'uTime'),
    bpm: gl.getUniformLocation(program, 'uBpm'),
    level: gl.getUniformLocation(program, 'uLevel'),
    phase: gl.getUniformLocation(program, 'uPhase'),
    pulse: gl.getUniformLocation(program, 'uPulse')
  };

  let width = 1;
  let height = 1;
  let destroyed = false;
  let rafId = null;

  const state = {
    bpm: 90,
    level: 1,
    phase: 0,
    phaseTarget: 0,
    pulse: 0,
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
    state.phase += (state.phaseTarget - state.phase) * 0.08;
    state.pulse *= 0.92;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform1f(uniforms.time, elapsed);
    gl.uniform1f(uniforms.bpm, state.bpm);
    gl.uniform1f(uniforms.level, state.level);
    gl.uniform1f(uniforms.phase, state.phase);
    gl.uniform1f(uniforms.pulse, state.pulse);

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
      state.pulse = Math.max(state.pulse, safeIntensity);
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
