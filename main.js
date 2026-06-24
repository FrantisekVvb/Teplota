const lottieEl = document.getElementById('lottie');
const burnerEl = document.getElementById('burner');
const burnerToggle = document.getElementById('burner-toggle');
const tempReadout = document.getElementById('temp-readout');
const mercuryColumn = document.getElementById('mercury-column');
const waterSubject = document.getElementById('water-subject');
const goldSubject = document.getElementById('gold-subject');
const gasSubject = document.getElementById('gas-subject');
const gasVesselEl = document.getElementById('gas-vessel');
const goldParticlesCanvas = document.getElementById('gold-particles');
const waterParticlesCanvas = document.getElementById('water-particles');
const gasParticlesCanvas = document.getElementById('gas-particles');
const subjectButtons = [...document.querySelectorAll('.subject-btn')];

const TEMP_START = 1;
const TEMP_END = 99;
const TEMP_REF = 20;

const GOLD_PARTICLE_COLS = 7;
const GOLD_PARTICLE_ROWS = 7;
const PARTICLE_RADIUS_LARGE = 8;
const WATER_PARTICLE_COUNT = 288;
const WATER_PARTICLE_COLOR = '#59A2FF';
const WATER_PARTICLE_STROKE = '#216BE8';
const GOLD_PARTICLE_COLOR = '#F6AF34';
const GOLD_PARTICLE_STROKE = '#D89412';
const GOLD_LEGACY_PEAK_TEMP = 40;
const GOLD_MOTION_MAX =
  (GOLD_LEGACY_PEAK_TEMP / TEMP_REF) *
  ((TEMP_END - 50) / (TEMP_END - GOLD_LEGACY_PEAK_TEMP)) ** 1.35;
const GOLD_MOTION_MIN = (GOLD_LEGACY_PEAK_TEMP / TEMP_REF) * 0.18;
const GAS_PARTICLE_COUNT = 10;
const GAS_PARTICLE_COLOR = '#58D976';
const GAS_PARTICLE_STROKE = '#2E9E4A';
const GAS_LID_LIFT_MAX = 108;
const GAS_LID_BASE_OFFSET = 20 * (1409 / 250);
const GAS_FILL_SCALE_MAX = 1.22;
const GAS_FILL_ANCHOR_Y = 1218;
const THERMAL_SPEED_MULTIPLIER = 3;
const COOL_THERMAL_SPEED_MULTIPLIER = 1;

const HEAT_DURATION_MS = 98000;
const COOL_TAU_MS = 11000;
const COOL_MIN_RATE_PER_S = 0.45;
const MERCURY_TOP = 14;
const MERCURY_BOTTOM = 118;
const FLAME_POWER_ON = 0.75;
const ANIM_LOOP_START = 0;
const ANIM_LOOP_END = 398;
const ANIM_FPS = 25;
const ANIM_LOOP_DURATION_MS =
  ((ANIM_LOOP_END - ANIM_LOOP_START + 1) / ANIM_FPS) * 1000;

let anim = null;
let burnerOn = false;
let activeSubject = 'water';
let heatElapsedMs = 0;
let heatSegmentStart = 0;
let heatRafId = null;
let lastTick = 0;
let particlePhaseMs = 0;
let goldParticleGrid = [];
let waterParticles = [];
let gasParticles = [];

function buildParticleGrid(targetGrid, cols, rows) {
  targetGrid.length = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      targetGrid.push({
        col,
        row,
        phase: (row * 0.71 + col * 1.13) * Math.PI,
        phase2: (row * 1.37 + col * 0.53) * Math.PI,
        phase3: (row * 0.19 + col * 1.91) * Math.PI,
        freqMul: 0.62 + ((row * 3 + col) % 7) * 0.19,
        freqMul2: 0.78 + ((row + col * 2) % 5) * 0.23,
        ampMul: 0.75 + ((row * 2 + col * 3) % 6) * 0.12,
      });
    }
  }
}

function buildGoldParticleGrid() {
  buildParticleGrid(goldParticleGrid, GOLD_PARTICLE_COLS, GOLD_PARTICLE_ROWS);
}

function buildWaterParticles() {
  waterParticles = [];
  for (let i = 0; i < WATER_PARTICLE_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.011 + Math.random() * 0.019;
    waterParticles.push({
      x: 0.06 + Math.random() * 0.88,
      y: 0.06 + Math.random() * 0.88,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }
}

function buildGasParticles() {
  gasParticles = [];
  for (let i = 0; i < GAS_PARTICLE_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.028 + Math.random() * 0.042;
    gasParticles.push({
      x: 0.15 + Math.random() * 0.7,
      y: 0.15 + Math.random() * 0.7,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: PARTICLE_RADIUS_LARGE,
    });
  }
}

function resizeParticleCanvas(canvas) {
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const size = Math.max(1, Math.round(Math.min(rect.width, rect.height)));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
}

function resizeGoldParticleCanvas() {
  resizeParticleCanvas(goldParticlesCanvas);
}

function resizeWaterParticleCanvas() {
  resizeParticleCanvas(waterParticlesCanvas);
}

function resizeGasParticleCanvas() {
  resizeParticleCanvas(gasParticlesCanvas);
}

function goldChaosFromTemp(temp) {
  const t = Math.min(TEMP_END, Math.max(TEMP_START, temp));
  return ((t - TEMP_START) / (TEMP_END - TEMP_START)) ** 0.9;
}

function drawParticleDetail({
  canvas,
  grid,
  cols,
  rows,
  radius,
  fill,
  stroke,
  timeMs,
  motion,
  chaos = 0,
  amplitudeBase = 0.8,
  amplitudeScale = 2.4,
  richChaos = false,
}) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width;
  const scale = size / (canvas.getBoundingClientRect().width || size);
  const amplitude = (amplitudeBase + motion * amplitudeScale) * scale;
  const basePhase = timeMs * 0.0035;
  const margin = 16 * scale;
  const span = size - margin * 2;
  const stepX = span / (cols - 1);
  const stepY = span / (rows - 1);

  ctx.clearRect(0, 0, size, size);

  for (const particle of grid) {
    const baseX = margin + particle.col * stepX;
    const baseY = margin + particle.row * stepY;
    const orderedX = Math.sin(basePhase + particle.phase) * amplitude;
    const orderedY = Math.cos(basePhase * 1.17 + particle.phase) * amplitude;

    const chaoticAmp = amplitude * particle.ampMul;
    const chaoticX =
      Math.sin(basePhase * particle.freqMul + particle.phase2) * chaoticAmp +
      Math.sin(basePhase * particle.freqMul2 + particle.phase3) * chaoticAmp * 0.62 +
      (richChaos
        ? Math.cos(basePhase * (particle.freqMul * 1.43) + particle.phase) * chaoticAmp * 0.38
        : 0);
    const chaoticY =
      Math.cos(basePhase * (particle.freqMul2 * 1.09) + particle.phase3) * chaoticAmp +
      Math.sin(basePhase * (particle.freqMul * 0.81) + particle.phase2) * chaoticAmp * 0.58 +
      (richChaos
        ? Math.sin(basePhase * (particle.freqMul2 * 1.37) + particle.phase) * chaoticAmp * 0.34
        : 0);

    const wobbleX = orderedX * (1 - chaos) + chaoticX * chaos;
    const wobbleY = orderedY * (1 - chaos) + chaoticY * chaos;
    const x = baseX + wobbleX;
    const y = baseY + wobbleY;

    ctx.beginPath();
    ctx.arc(x, y, radius * scale, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.1 * scale;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function gasChaosFromTemp(temp) {
  const t = Math.min(TEMP_END, Math.max(TEMP_START, temp));
  return ((t - TEMP_START) / (TEMP_END - TEMP_START)) ** 0.85;
}

function gasMotionFromTemp(temp) {
  const t = Math.min(TEMP_END, Math.max(TEMP_START, temp));
  const progress = (t - TEMP_START) / (TEMP_END - TEMP_START);
  const GAS_MOTION_MIN = 0.25;
  const GAS_MOTION_MAX = 15;
  return GAS_MOTION_MIN + (GAS_MOTION_MAX - GAS_MOTION_MIN) * progress ** 1.75;
}

function drawGasParticleDetail(deltaMs) {
  const canvas = gasParticlesCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width;
  const scale = size / (canvas.getBoundingClientRect().width || size);
  const temp = currentTemp();
  const motion = gasMotionFromTemp(temp);
  const chaos = gasChaosFromTemp(temp);
  const dt = Math.min(48, Math.max(1, deltaMs)) / 16.67;
  const bounds = { min: -0.14, max: 1.14 };
  const maxSpeed = 0.08 + motion * 0.2;
  const wander = 0.004 + chaos * 0.03;
  const moveScale = 0.02 + motion * 0.0048;

  ctx.clearRect(0, 0, size, size);

  for (const particle of gasParticles) {
    particle.vx += (Math.random() - 0.5) * wander * dt;
    particle.vy += (Math.random() - 0.5) * wander * dt;

    const speed = Math.hypot(particle.vx, particle.vy);
    if (speed > maxSpeed) {
      particle.vx = (particle.vx / speed) * maxSpeed;
      particle.vy = (particle.vy / speed) * maxSpeed;
    }

    particle.x += particle.vx * dt * moveScale;
    particle.y += particle.vy * dt * moveScale;

    if (particle.x < bounds.min) {
      particle.x = bounds.min;
      particle.vx = Math.abs(particle.vx);
    } else if (particle.x > bounds.max) {
      particle.x = bounds.max;
      particle.vx = -Math.abs(particle.vx);
    }

    if (particle.y < bounds.min) {
      particle.y = bounds.min;
      particle.vy = Math.abs(particle.vy);
    } else if (particle.y > bounds.max) {
      particle.y = bounds.max;
      particle.vy = -Math.abs(particle.vy);
    }

    const x = particle.x * size;
    const y = particle.y * size;
    const radius = particle.r * scale;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = GAS_PARTICLE_COLOR;
    ctx.fill();
    ctx.lineWidth = 1.1 * scale;
    ctx.strokeStyle = GAS_PARTICLE_STROKE;
    ctx.stroke();
  }
}

function drawGoldParticleDetail(timeMs) {
  const temp = currentTemp();
  drawParticleDetail({
    canvas: goldParticlesCanvas,
    grid: goldParticleGrid,
    cols: GOLD_PARTICLE_COLS,
    rows: GOLD_PARTICLE_ROWS,
    radius: PARTICLE_RADIUS_LARGE,
    fill: GOLD_PARTICLE_COLOR,
    stroke: GOLD_PARTICLE_STROKE,
    timeMs,
    motion: goldMotionFromTemp(temp),
    chaos: goldChaosFromTemp(temp),
    richChaos: true,
  });
}

function drawWaterParticleDetail(deltaMs) {
  const canvas = waterParticlesCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width;
  const scale = size / (canvas.getBoundingClientRect().width || size);
  const temp = currentTemp();
  const motion = speedFromTemp(temp);
  const chaos = gasChaosFromTemp(temp);
  const dt = Math.min(48, Math.max(1, deltaMs)) / 16.67;
  const bounds = { min: -0.14, max: 1.14 };
  const maxSpeed = 0.03 + motion * 0.06;
  const wander = 0.002 + chaos * 0.011;
  const moveScale = 0.009 + motion * 0.0018;
  const drawRadius = PARTICLE_RADIUS_LARGE * scale;

  ctx.clearRect(0, 0, size, size);

  for (const particle of waterParticles) {
    particle.vx += (Math.random() - 0.5) * wander * dt;
    particle.vy += (Math.random() - 0.5) * wander * dt;

    const speed = Math.hypot(particle.vx, particle.vy);
    if (speed > maxSpeed) {
      particle.vx = (particle.vx / speed) * maxSpeed;
      particle.vy = (particle.vy / speed) * maxSpeed;
    }

    particle.x += particle.vx * dt * moveScale;
    particle.y += particle.vy * dt * moveScale;

    if (particle.x < bounds.min) {
      particle.x = bounds.min;
      particle.vx = Math.abs(particle.vx);
    } else if (particle.x > bounds.max) {
      particle.x = bounds.max;
      particle.vx = -Math.abs(particle.vx);
    }

    if (particle.y < bounds.min) {
      particle.y = bounds.min;
      particle.vy = Math.abs(particle.vy);
    } else if (particle.y > bounds.max) {
      particle.y = bounds.max;
      particle.vy = -Math.abs(particle.vy);
    }

    ctx.beginPath();
    ctx.arc(particle.x * size, particle.y * size, drawRadius, 0, Math.PI * 2);
    ctx.fillStyle = WATER_PARTICLE_COLOR;
    ctx.fill();
    ctx.lineWidth = 1.1 * scale;
    ctx.strokeStyle = WATER_PARTICLE_STROKE;
    ctx.stroke();
  }
}

function tempFromProgress(progress) {
  return TEMP_START + progress * (TEMP_END - TEMP_START);
}

function progressFromTemp(temp) {
  return Math.min(1, Math.max(0, (temp - TEMP_START) / (TEMP_END - TEMP_START)));
}

function speedFromTemp(temp) {
  return temp / TEMP_REF;
}

function goldMotionFromTemp(temp) {
  const t = Math.min(TEMP_END, Math.max(TEMP_START, temp));
  const progress = (t - TEMP_START) / (TEMP_END - TEMP_START);
  return GOLD_MOTION_MIN + (GOLD_MOTION_MAX - GOLD_MOTION_MIN) * progress ** 1.05;
}

function heatDurationMs() {
  return HEAT_DURATION_MS / THERMAL_SPEED_MULTIPLIER;
}

function coolTauMs() {
  return COOL_TAU_MS / COOL_THERMAL_SPEED_MULTIPLIER;
}

function coolMinRatePerS() {
  return COOL_MIN_RATE_PER_S * COOL_THERMAL_SPEED_MULTIPLIER;
}

function currentProgress() {
  return Math.min(1, Math.max(0, heatElapsedMs / heatDurationMs()));
}

function currentTemp() {
  return tempFromProgress(currentProgress());
}

function updateThermometer(temp) {
  tempReadout.textContent = 'teplota';

  const fillRatio = (temp - TEMP_START) / (TEMP_END - TEMP_START);
  const maxHeight = MERCURY_BOTTOM - MERCURY_TOP;
  const height = Math.max(4, fillRatio * maxHeight);
  const y = MERCURY_BOTTOM - height;

  mercuryColumn.setAttribute('y', String(y));
  mercuryColumn.setAttribute('height', String(height));
}

function gasExpansionFromTemp(temp) {
  const t = Math.min(TEMP_END, Math.max(TEMP_START, temp));
  return ((t - TEMP_START) / (TEMP_END - TEMP_START)) ** 0.9;
}

function updateGasVessel(temp) {
  const doc = gasVesselEl?.contentDocument;
  if (!doc) return false;

  const expansion = gasExpansionFromTemp(temp);
  const lift = expansion * (GAS_LID_LIFT_MAX + GAS_LID_BASE_OFFSET);
  const scaleY = 1 + expansion * (GAS_FILL_SCALE_MAX - 1);
  const lid = doc.getElementById('gas-lid');
  const fill = doc.getElementById('gas-fill');

  if (lid) {
    lid.setAttribute('transform', `translate(0 ${GAS_LID_BASE_OFFSET - lift})`);
  }

  if (fill) {
    fill.setAttribute(
      'transform',
      `translate(0 ${GAS_FILL_ANCHOR_Y}) scale(1 ${scaleY}) translate(0 ${-GAS_FILL_ANCHOR_Y})`,
    );
  }

  return Boolean(lid && fill);
}

function ensureGasVesselState(attempt = 0) {
  if (updateGasVessel(currentTemp()) || attempt > 120) return;
  requestAnimationFrame(() => ensureGasVesselState(attempt + 1));
}

function applySimulationState() {
  const temp = currentTemp();
  updateThermometer(temp);
  ensureBurnerFlame();
  if (activeSubject === 'gas') {
    updateGasVessel(temp);
  }
}

function motionForSubject(temp) {
  if (activeSubject === 'gold') return goldMotionFromTemp(temp);
  return speedFromTemp(temp);
}

function setLottieFrame(animation, phaseMs, loopStart, loopEnd, fps) {
  const loopMs = ((loopEnd - loopStart + 1) / fps) * 1000;
  const phase = ((phaseMs % loopMs) + loopMs) % loopMs;
  const frame = loopStart + (phase / 1000) * fps;
  animation.goToAndStop(frame, true);
}

function updateParticleAnimation(delta) {
  const motion = motionForSubject(currentTemp());
  particlePhaseMs += delta * motion;

  if (activeSubject === 'water') {
    if (anim) {
      setLottieFrame(anim, particlePhaseMs, ANIM_LOOP_START, ANIM_LOOP_END, ANIM_FPS);
    }
    drawWaterParticleDetail(delta);
    return;
  }

  if (activeSubject === 'gold') {
    drawGoldParticleDetail(particlePhaseMs);
    return;
  }

  if (activeSubject === 'gas') {
    drawGasParticleDetail(delta);
  }
}

function setBurnerFlame(power) {
  const svg = burnerEl?.contentDocument?.documentElement;
  if (!svg) return false;
  svg.style.setProperty('--flame-power', String(power));
  return true;
}

function ensureBurnerFlame(attempt = 0) {
  if (setBurnerFlame(burnerOn ? FLAME_POWER_ON : 0) || attempt > 120) return;
  requestAnimationFrame(() => ensureBurnerFlame(attempt + 1));
}

function stopHeatLoop() {
  if (heatRafId !== null) {
    cancelAnimationFrame(heatRafId);
    heatRafId = null;
  }
}

function tick(now) {
  if (!lastTick) lastTick = now;
  const delta = now - lastTick;
  lastTick = now;

  if (burnerOn && heatElapsedMs < heatDurationMs()) {
    heatElapsedMs = Math.min(heatDurationMs(), heatElapsedMs + delta);
    if (heatElapsedMs >= heatDurationMs()) {
      setBurnerOn(false);
    }
  } else if (!burnerOn) {
    const temp = currentTemp();
    if (temp > TEMP_START) {
      const excess = temp - TEMP_START;
      const decay = 1 - Math.exp(-delta / coolTauMs());
      const drop = Math.max(excess * decay, coolMinRatePerS() * (delta / 1000));
      const newTemp = Math.max(TEMP_START, temp - drop);
      heatElapsedMs = progressFromTemp(newTemp) * heatDurationMs();
    }
  }

  applySimulationState();
  updateParticleAnimation(delta);
  heatRafId = requestAnimationFrame(tick);
}

function startHeatLoop() {
  stopHeatLoop();
  lastTick = 0;
  heatRafId = requestAnimationFrame(tick);
}

function setBurnerOn(on) {
  burnerOn = on;
  burnerToggle.setAttribute('aria-pressed', String(burnerOn));
  burnerToggle.textContent = burnerOn ? 'Vypnout hořák' : 'Zapnout hořák';

  if (burnerOn) {
    heatSegmentStart = performance.now();
  }

  ensureBurnerFlame();
}

function normalizeSubject(subject) {
  if (subject === 'gold' || subject === 'gas') return subject;
  return 'water';
}

function setSubject(subject) {
  const nextSubject = normalizeSubject(subject);
  if (nextSubject !== activeSubject) {
    const temp = currentTemp();
    activeSubject = nextSubject;
    heatElapsedMs = progressFromTemp(temp) * heatDurationMs();
  }

  waterSubject.hidden = activeSubject !== 'water';
  goldSubject.hidden = activeSubject !== 'gold';
  gasSubject.hidden = activeSubject !== 'gas';

  subjectButtons.forEach((button) => {
    const isActive = button.dataset.subject === activeSubject;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  if (activeSubject === 'water') {
    resizeWaterParticleCanvas();
    drawWaterParticleDetail(0);
    if (anim) updateParticleAnimation(0);
  } else if (activeSubject === 'gold') {
    resizeGoldParticleCanvas();
    drawGoldParticleDetail(particlePhaseMs);
  } else if (activeSubject === 'gas') {
    resizeGasParticleCanvas();
    drawGasParticleDetail(0);
    ensureGasVesselState();
  }
}

function toggleBurner() {
  setBurnerOn(!burnerOn);
}

burnerToggle.addEventListener('click', toggleBurner);
subjectButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setSubject(button.dataset.subject);
  });
});
burnerEl.addEventListener('load', () => applySimulationState());
gasVesselEl.addEventListener('load', () => {
  if (activeSubject === 'gas') {
    ensureGasVesselState();
  }
});
buildGoldParticleGrid();
buildWaterParticles();
buildGasParticles();
resizeGoldParticleCanvas();
resizeWaterParticleCanvas();
resizeGasParticleCanvas();
window.addEventListener('resize', () => {
  resizeGoldParticleCanvas();
  resizeWaterParticleCanvas();
  resizeGasParticleCanvas();
  if (activeSubject === 'water') {
    drawWaterParticleDetail(0);
  } else if (activeSubject === 'gold') {
    drawGoldParticleDetail(particlePhaseMs);
  } else if (activeSubject === 'gas') {
    drawGasParticleDetail(0);
  }
});
setSubject('water');
startHeatLoop();

function populateWaterParticles(animationData) {
  const comp = animationData.assets?.find((asset) => asset.id === 'comp_0');
  if (comp) comp.layers = [];

  animationData.layers = animationData.layers.filter(
    (layer) => layer.nm !== 'detail' && layer.nm !== 'detail-bg',
  );
}

function loadLottieAnimation(container, url) {
  return fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error('Animaci nelze načíst.');
      return response.json();
    })
    .then((animationData) => {
      populateWaterParticles(animationData);

      const animation = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData,
      });

      return new Promise((resolve) => {
        animation.addEventListener('DOMLoaded', () => resolve(animation));
      });
    })
    .catch(() => {
      container.innerHTML = '<p class="error">Načtěte stránku přes lokální server.</p>';
      return null;
    });
}

loadLottieAnimation(lottieEl, 'cup-water-detail.json').then((waterAnimation) => {
  anim = waterAnimation;

  if (anim) {
    particlePhaseMs = 0;
    resizeWaterParticleCanvas();
    applySimulationState();
    updateParticleAnimation(0);
  }
});
