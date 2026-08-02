const appRoot = document.querySelector('.app-root');
const modeButtons = [...document.querySelectorAll('.mode-switch__btn')];
const lottieEl = document.getElementById('lottie');
const burnerEl = document.getElementById('burner');
const burnerToggle = document.getElementById('burner-toggle');
const coolingToggle = document.getElementById('cooling-toggle');
const coolingResetBtn = document.getElementById('cooling-reset-btn');
const ambientTempBtn = document.getElementById('ambient-temp-btn');
const ambientTempLabel = document.getElementById('ambient-temp-label');
const ambientKeypadOverlay = document.getElementById('ambient-keypad-overlay');
const ambientKeypadDisplay = document.getElementById('ambient-keypad-display');
const ambientKeypadError = document.getElementById('ambient-keypad-error');
const ambientKeypadConfirm = document.getElementById('ambient-keypad-confirm');
const ambientKeypadCancel = document.getElementById('ambient-keypad-cancel');
const ambientMathKeypad = document.getElementById('ambient-math-keypad');
const coolingGraphBtn = document.getElementById('cooling-graph-btn');
const coolingGraphTools = document.getElementById('cooling-graph-tools');
const coolingChartSaveBtn = document.getElementById('cooling-chart-save-btn');
const coolingChartResetBtn = document.getElementById('cooling-chart-reset-btn');
const coolingChartFitBtn = document.getElementById('cooling-chart-fit-btn');
const coolingChartFitModeRow = document.getElementById('cooling-chart-fit-mode-row');
const coolingChartFitModeCurveBtn = document.getElementById('cooling-chart-fit-mode-curve-btn');
const coolingChartFitModePolylineBtn = document.getElementById('cooling-chart-fit-mode-polyline-btn');
const coolingChartWrap = document.getElementById('cooling-chart-wrap');
const coolingChartEl = document.getElementById('cooling-chart');
const coolingStopwatchEl = document.getElementById('cooling-stopwatch');
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
const boardStageEl = document.querySelector('.board-stage');
const simFitEl = document.querySelector('.sim-fit');
const simStageEl = document.querySelector('.sim-stage');

const TEMP_START = 1;
const TEMP_END = 99;
const TEMP_REF = 20;

const COOL_TEMP_MIN = 22;
const COOL_TEMP_MAX = 100;
const COOL_TIME_MAX = 6645;
const REF_AMBIENT_TEMP = 22;
const COOL_START_TEMP = 100;
const AMBIENT_TEMP_MIN = 0;
const AMBIENT_TEMP_MAX = 100;

const CHART_T_MIN = 0;
const CHART_T_MAX = 480;
const CHART_T_STEP = 15;
const CHART_Y_MIN = 0;
const CHART_Y_MAX = 100;
const CHART_Y_STEP = 4;
const CHART_AXIS = '#1e6bb8';
const CHART_CROSS_HALF = 7;
const CHART_MAX_POINTS = 40;

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

let anim = null;
let appMode = 'heating';
let burnerOn = false;
let activeSubject = 'water';
let heatElapsedMs = 0;
let heatRafId = null;
let lastTick = 0;
let particlePhaseMs = 0;
let goldParticleGrid = [];
let waterParticles = [];
let gasParticles = [];

let coolingData = [];
let coolingElapsedS = 0;
let coolingPlaying = false;
let coolingDone = false;
let ambientTemp = REF_AMBIENT_TEMP;
let waterTemp = COOL_START_TEMP;
let ambientKeypadDraft = '';
let ambientKeypadOpen = false;
let coolingGraphVisible = false;
let coolingWasPlayingBeforeGraph = false;
let coolingChartResizeRaf = null;
let coolingChartPoints = [];
let coolingChartHold = null;
let coolingChartShowFit = false;
let coolingChartFitMode = 'curve';
let coolingChartLayout = {
  W: 640,
  H: 420,
  ml: 56,
  mr: 24,
  mt: 28,
  mb: 54,
  pw: 560,
  ph: 338,
  yAxisLabelX: 16,
};

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

function clipParticleCanvasToCircle(ctx, size) {
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
}

function particleCanvasScale(canvas) {
  return canvas.width / (canvas.getBoundingClientRect().width || canvas.width);
}

const SIM_FIT_MARGIN = 20;
const SIM_FIT_MAX_SCALE = 1.06;
let simFitRaf = null;

function expandSimBounds(rect, state) {
  if (rect.width < 1 && rect.height < 1) return;
  state.hasBounds = true;
  state.minX = Math.min(state.minX, rect.left);
  state.minY = Math.min(state.minY, rect.top);
  state.maxX = Math.max(state.maxX, rect.right);
  state.maxY = Math.max(state.maxY, rect.bottom);
}

function getSimVisualBounds() {
  if (!simStageEl) return null;

  const state = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    hasBounds: false,
  };

  for (const node of simStageEl.children) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.hidden) continue;

    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    // gas-wrap fills the stage; measure the actual vessel + particle circle.
    if (node.classList.contains('gas-wrap')) {
      const scene = node.querySelector('.gas-scene');
      if (scene) expandSimBounds(scene.getBoundingClientRect(), state);
      continue;
    }

    expandSimBounds(node.getBoundingClientRect(), state);

    // Absolute particle loupe can sit outside the subject wrap box.
    if (node.classList.contains('cup-wrap')) {
      const detail = node.querySelector('.water-detail');
      if (detail && getComputedStyle(detail).display !== 'none') {
        expandSimBounds(detail.getBoundingClientRect(), state);
      }
    }
  }

  if (!state.hasBounds) return null;

  return {
    width: state.maxX - state.minX,
    height: state.maxY - state.minY,
    minX: state.minX,
    minY: state.minY,
    maxX: state.maxX,
    maxY: state.maxY,
  };
}

function updateSimStageFit() {
  if (!boardStageEl || !simFitEl) return;
  if (appRoot?.dataset.coolingView === 'graph') return;

  // Measure at identity transform, then fit into the board.
  // Horizontally centered, vertically pinned to the bottom (like water).
  simFitEl.style.transformOrigin = '0 0';
  simFitEl.style.transform = 'none';

  const bounds = getSimVisualBounds();
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;

  const boardRect = boardStageEl.getBoundingClientRect();
  let topInset = SIM_FIT_MARGIN;

  if (
    appMode === 'cooling' &&
    ambientTempLabel &&
    getComputedStyle(ambientTempLabel).display !== 'none'
  ) {
    const labelRect = ambientTempLabel.getBoundingClientRect();
    topInset = Math.max(topInset, labelRect.bottom - boardRect.top + 8);
  }

  const availX = SIM_FIT_MARGIN;
  const availY = topInset;
  const availW = boardRect.width - SIM_FIT_MARGIN * 2;
  const availH = boardRect.height - topInset - SIM_FIT_MARGIN;
  if (availW <= 0 || availH <= 0) return;

  const contentX = bounds.minX - boardRect.left;
  const contentY = bounds.minY - boardRect.top;
  const contentW = bounds.width;
  const contentH = bounds.height;

  const fitScale = Math.max(
    0.05,
    Math.min(availW / contentW, availH / contentH, SIM_FIT_MAX_SCALE),
  );

  const contentCx = contentX + contentW / 2;
  const contentBottom = contentY + contentH;
  const availCx = availX + availW / 2;
  const availBottom = availY + availH;
  const tx = availCx - contentCx * fitScale;
  const ty = availBottom - contentBottom * fitScale;

  simFitEl.style.transform = `translate(${tx}px, ${ty}px) scale(${fitScale})`;
}

function scheduleSimStageFit() {
  if (simFitRaf !== null) cancelAnimationFrame(simFitRaf);
  simFitRaf = requestAnimationFrame(() => {
    simFitRaf = null;
    updateSimStageFit();
    resizeGoldParticleCanvas();
    resizeWaterParticleCanvas();
    resizeGasParticleCanvas();
  });
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
  const scale = particleCanvasScale(canvas);
  const amplitude = (amplitudeBase + motion * amplitudeScale) * scale;
  const basePhase = timeMs * 0.0035;
  const margin = 16 * scale;
  const span = size - margin * 2;
  const stepX = span / (cols - 1);
  const stepY = span / (rows - 1);

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  clipParticleCanvasToCircle(ctx, size);

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

  ctx.restore();
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
  const scale = particleCanvasScale(canvas);
  const temp = currentTemp();
  const motion = gasMotionFromTemp(temp);
  const chaos = gasChaosFromTemp(temp);
  const dt = Math.min(48, Math.max(1, deltaMs)) / 16.67;
  const bounds = { min: -0.14, max: 1.14 };
  const maxSpeed = 0.08 + motion * 0.2;
  const wander = 0.004 + chaos * 0.03;
  const moveScale = 0.02 + motion * 0.0048;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  clipParticleCanvasToCircle(ctx, size);

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

  ctx.restore();
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
  const scale = particleCanvasScale(canvas);
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
  ctx.save();
  clipParticleCanvasToCircle(ctx, size);

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

  ctx.restore();
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
  if (appMode === 'cooling') {
    return waterTemp;
  }
  return tempFromProgress(currentProgress());
}

function formatTempCs(value) {
  return value.toFixed(1).replace('.', ',');
}

function formatCoolingStopwatch(seconds) {
  const s = Math.max(0, seconds);
  return `${s.toFixed(1).replace('.', ',')} s`;
}

function tempFromCsv(seconds) {
  if (!coolingData.length) {
    return COOL_START_TEMP;
  }

  const t = Math.min(COOL_TIME_MAX, Math.max(0, seconds));

  if (t <= coolingData[0][0]) return coolingData[0][1];
  if (t >= coolingData[coolingData.length - 1][0]) {
    return coolingData[coolingData.length - 1][1];
  }

  for (let i = 0; i < coolingData.length - 1; i += 1) {
    const [t0, temp0] = coolingData[i];
    const [t1, temp1] = coolingData[i + 1];
    if (t >= t0 && t <= t1) {
      const ratio = (t - t0) / (t1 - t0);
      return temp0 + ratio * (temp1 - temp0);
    }
  }

  return REF_AMBIENT_TEMP;
}

function csvTempDerivative(seconds) {
  const eps = 1;
  const t = Math.max(0, Math.min(COOL_TIME_MAX - eps, seconds));
  return (tempFromCsv(t + eps) - tempFromCsv(t)) / eps;
}

function csvTimeAtTemp(targetTemp) {
  if (!coolingData.length) return 0;

  const temp = Math.min(
    COOL_START_TEMP,
    Math.max(coolingData[coolingData.length - 1][1], targetTemp),
  );

  if (temp >= coolingData[0][1]) return 0;
  if (temp <= coolingData[coolingData.length - 1][1]) return COOL_TIME_MAX;

  for (let i = 0; i < coolingData.length - 1; i += 1) {
    const [t0, y0] = coolingData[i];
    const [t1, y1] = coolingData[i + 1];
    if (temp <= y0 && temp >= y1) {
      const ratio = (y0 - temp) / (y0 - y1);
      return t0 + ratio * (t1 - t0);
    }
  }

  return COOL_TIME_MAX;
}

function coolingConstantK(atTemp) {
  const refTime = csvTimeAtTemp(atTemp);
  const refTemp = tempFromCsv(refTime);
  const driving = refTemp - REF_AMBIENT_TEMP;
  if (driving < 0.01) return 0;
  return -csvTempDerivative(refTime) / driving;
}

function isCoolingDefaultState() {
  return coolingElapsedS === 0 && !coolingPlaying && !coolingDone;
}

function parseAmbientInput(value) {
  const raw = String(value || '').trim();
  if (!raw || !/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return null;
  return Math.min(AMBIENT_TEMP_MAX, Math.max(AMBIENT_TEMP_MIN, parsed));
}

function formatAmbientTemp(value) {
  return String(Math.round(value));
}

function clearAmbientKeypadError() {
  if (ambientKeypadError) {
    ambientKeypadError.hidden = true;
    ambientKeypadError.textContent = '';
  }
  if (ambientKeypadDisplay) {
    ambientKeypadDisplay.classList.remove('is-invalid');
  }
}

function showAmbientKeypadError(message) {
  if (ambientKeypadError) {
    ambientKeypadError.hidden = false;
    ambientKeypadError.textContent = message;
  }
  if (ambientKeypadDisplay) {
    ambientKeypadDisplay.classList.add('is-invalid');
  }
}

function validateAmbientKeypadDraft(requireValue = false) {
  const raw = ambientKeypadDraft.trim();
  if (!raw) {
    return requireValue
      ? { ok: false, message: 'Zadej teplotu.' }
      : { ok: true };
  }
  const parsed = parseAmbientInput(raw);
  if (parsed == null) {
    return { ok: false, message: 'Zadej celé číslo v rozsahu 0–100.' };
  }
  return { ok: true, value: parsed };
}

function updateAmbientKeypadValidation() {
  const result = validateAmbientKeypadDraft(false);
  if (!result.ok) {
    showAmbientKeypadError(result.message);
    return;
  }
  clearAmbientKeypadError();
}

function updateAmbientKeypadDisplay() {
  if (ambientKeypadDisplay) {
    const suffix = ambientKeypadDraft.trim() ? ' °C' : '';
    ambientKeypadDisplay.textContent = `${ambientKeypadDraft}${suffix}`;
  }
  updateAmbientKeypadValidation();
}

function closeAmbientKeypad() {
  ambientKeypadOpen = false;
  ambientKeypadDraft = '';
  clearAmbientKeypadError();
  if (ambientKeypadOverlay) ambientKeypadOverlay.hidden = true;
  if (ambientKeypadDisplay) ambientKeypadDisplay.textContent = '';
}

function openAmbientKeypad() {
  if (!isCoolingDefaultState() || !ambientKeypadOverlay || ambientTempBtn?.disabled) {
    return;
  }
  ambientKeypadOpen = true;
  ambientKeypadDraft = formatAmbientTemp(ambientTemp);
  clearAmbientKeypadError();
  updateAmbientKeypadDisplay();
  ambientKeypadOverlay.hidden = false;
}

function insertIntoAmbientKeypadDraft(value) {
  if (!/^\d$/.test(value)) return;
  if (ambientKeypadDraft.length >= 3) return;
  ambientKeypadDraft += value;
  updateAmbientKeypadDisplay();
}

function clearAmbientKeypadDraft() {
  ambientKeypadDraft = '';
  updateAmbientKeypadDisplay();
}

function backspaceAmbientKeypadDraft() {
  ambientKeypadDraft = ambientKeypadDraft.slice(0, -1);
  updateAmbientKeypadDisplay();
}

function confirmAmbientKeypad() {
  const result = validateAmbientKeypadDraft(true);
  if (!result.ok) {
    showAmbientKeypadError(result.message);
    return;
  }
  ambientTemp = result.value;
  updateAmbientTempLabel();
  applySimulationState();
  closeAmbientKeypad();
}

function handleAmbientKeypadClick(event) {
  const key = event.currentTarget;
  if (!(key instanceof HTMLButtonElement) || key.disabled) return;

  const action = key.getAttribute('data-action');
  const value = key.getAttribute('data-value');

  if (action === 'clear') {
    clearAmbientKeypadDraft();
    return;
  }

  if (value) {
    insertIntoAmbientKeypadDraft(value);
  }
}

function onAmbientKeypadKeydown(event) {
  if (!ambientKeypadOpen) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeAmbientKeypad();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    confirmAmbientKeypad();
    return;
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    backspaceAmbientKeypadDraft();
    return;
  }

  if (/^[0-9]$/.test(event.key)) {
    event.preventDefault();
    insertIntoAmbientKeypadDraft(event.key);
  }
}

function updateAmbientTempLabel() {
  if (!ambientTempLabel) return;
  ambientTempLabel.textContent = `Okolní teplota: ${formatAmbientTemp(ambientTemp)} °C`;
}

function syncAmbientTempControls() {
  const canEdit = isCoolingDefaultState();
  if (ambientTempBtn) {
    ambientTempBtn.disabled = !canEdit;
    ambientTempBtn.setAttribute('aria-disabled', String(!canEdit));
  }
  if (!canEdit) closeAmbientKeypad();
}

function updateThermometer(temp) {
  if (appMode === 'cooling') {
    tempReadout.textContent = `${formatTempCs(temp)} °C`;

    const fillRatio = temp / CHART_Y_MAX;
    const maxHeight = MERCURY_BOTTOM - MERCURY_TOP;
    const height = Math.max(4, fillRatio * maxHeight);
    const y = MERCURY_BOTTOM - height;

    mercuryColumn.setAttribute('y', String(y));
    mercuryColumn.setAttribute('height', String(height));
    return;
  }

  tempReadout.textContent = 'teplota';

  const fillRatio = (temp - TEMP_START) / (TEMP_END - TEMP_START);
  const maxHeight = MERCURY_BOTTOM - MERCURY_TOP;
  const height = Math.max(4, fillRatio * maxHeight);
  const y = MERCURY_BOTTOM - height;

  mercuryColumn.setAttribute('y', String(y));
  mercuryColumn.setAttribute('height', String(height));
}

function updateCoolingStopwatch() {
  if (!coolingStopwatchEl) return;
  coolingStopwatchEl.textContent = formatCoolingStopwatch(coolingElapsedS);
  coolingStopwatchEl.setAttribute('datetime', `PT${coolingElapsedS.toFixed(1)}S`);
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
  if (appMode === 'heating' && activeSubject === 'gas') {
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

function freezeLottieFrame() {
  if (anim) {
    setLottieFrame(anim, 0, ANIM_LOOP_START, ANIM_LOOP_END, ANIM_FPS);
  }
}

function updateParticleAnimation(delta) {
  if (appMode === 'cooling') {
    freezeLottieFrame();
    return;
  }

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
  const power = appMode === 'heating' && burnerOn ? FLAME_POWER_ON : 0;
  if (setBurnerFlame(power) || attempt > 120) return;
  requestAnimationFrame(() => ensureBurnerFlame(attempt + 1));
}

function stopHeatLoop() {
  if (heatRafId !== null) {
    cancelAnimationFrame(heatRafId);
    heatRafId = null;
  }
}

function tickHeating(delta) {
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
}

function tickCooling(delta) {
  if (!coolingPlaying || coolingDone) return;

  const dt = delta / 1000;
  coolingElapsedS += dt;

  if (waterTemp <= ambientTemp + 0.05) {
    waterTemp = ambientTemp;
    coolingPlaying = false;
    coolingDone = true;
    syncCoolingButton();
    updateCoolingStopwatch();
    syncAmbientTempControls();
    return;
  }

  const k = coolingConstantK(waterTemp);
  if (k > 0) {
    waterTemp = Math.max(
      ambientTemp,
      waterTemp - k * (waterTemp - ambientTemp) * dt,
    );
  }

  if (waterTemp <= ambientTemp + 0.05) {
    waterTemp = ambientTemp;
    coolingPlaying = false;
    coolingDone = true;
    syncCoolingButton();
  }

  updateCoolingStopwatch();
  syncAmbientTempControls();
}

function tick(now) {
  if (!lastTick) lastTick = now;
  const delta = now - lastTick;
  lastTick = now;

  if (appMode === 'heating') {
    tickHeating(delta);
  } else {
    tickCooling(delta);
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
  ensureBurnerFlame();
}

function normalizeSubject(subject) {
  if (subject === 'gold' || subject === 'gas') return subject;
  return 'water';
}

function setSubject(subject) {
  const nextSubject = normalizeSubject(subject);
  if (nextSubject !== activeSubject) {
    activeSubject = nextSubject;
    heatElapsedMs = 0;
    setBurnerOn(false);
  }

  waterSubject.hidden = activeSubject !== 'water';
  goldSubject.hidden = activeSubject !== 'gold';
  gasSubject.hidden = activeSubject !== 'gas';

  subjectButtons.forEach((button) => {
    const isActive = button.dataset.subject === activeSubject;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  applySimulationState();

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

  scheduleSimStageFit();
}

function toggleBurner() {
  setBurnerOn(!burnerOn);
}

function resetCoolingState() {
  coolingElapsedS = 0;
  coolingPlaying = false;
  coolingDone = false;
  waterTemp = COOL_START_TEMP;
  updateCoolingStopwatch();
  syncCoolingButton();
  syncAmbientTempControls();
  updateAmbientTempLabel();
  applySimulationState();
  freezeLottieFrame();
  scheduleCoolingChartRedraw();
}

function syncCoolingButton() {
  if (!coolingToggle) return;

  let label = 'Nechat ochladit';
  let disabled = false;

  if (coolingDone) {
    label = 'Reset';
  } else if (coolingPlaying) {
    label = 'Pauza';
  } else if (coolingElapsedS > 0) {
    label = 'Pokračovat';
  }

  coolingToggle.textContent = label;
  coolingToggle.disabled = disabled;
  coolingToggle.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  coolingToggle.setAttribute('aria-pressed', coolingPlaying ? 'true' : 'false');
}

function onCoolingToggleClick() {
  if (coolingDone) {
    resetCoolingState();
    scheduleCoolingChartRedraw();
    return;
  }

  if (coolingPlaying) {
    coolingPlaying = false;
  } else {
    coolingPlaying = true;
  }

  syncCoolingButton();
  syncAmbientTempControls();
}

function chartNs() {
  return 'http://www.w3.org/2000/svg';
}

function chartTToX(t) {
  return (
    coolingChartLayout.ml +
    ((t - CHART_T_MIN) / (CHART_T_MAX - CHART_T_MIN)) * coolingChartLayout.pw
  );
}

function chartYToPx(y) {
  return (
    coolingChartLayout.mt +
    coolingChartLayout.ph -
    ((y - CHART_Y_MIN) / (CHART_Y_MAX - CHART_Y_MIN)) * coolingChartLayout.ph
  );
}

function chartFormatTick(value, unit) {
  const num =
    Math.abs(value - Math.round(value)) < 1e-6
      ? String(Math.round(value))
      : String(Number(value.toFixed(1))).replace('.', ',');
  return unit ? `${num} ${unit}` : num;
}

function chartEachTick(min, max, step, fn) {
  const n = Math.round((max - min) / step);
  for (let i = 0; i <= n; i += 1) {
    fn(Number((min + i * step).toFixed(6)), i, n);
  }
}

function chartMeasureText(text, fontSize) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return String(text || '').length * fontSize * 0.58;
    ctx.font = `${fontSize}px system-ui, sans-serif`;
    return ctx.measureText(String(text || '')).width;
  } catch {
    return String(text || '').length * fontSize * 0.58;
  }
}

function computeCoolingChartLayout() {
  if (!coolingChartWrap) return;

  const rect = coolingChartWrap.getBoundingClientRect();
  const style = window.getComputedStyle(coolingChartWrap);
  const padL = parseFloat(style.paddingLeft) || 0;
  const padR = parseFloat(style.paddingRight) || 0;
  const padT = parseFloat(style.paddingTop) || 0;
  const padB = parseFloat(style.paddingBottom) || 0;
  const W = Math.max(280, Math.round(rect.width - padL - padR));
  const H = Math.max(200, Math.round(rect.height - padT - padB));

  let maxYTickW = 0;
  chartEachTick(CHART_Y_MIN, CHART_Y_MAX, CHART_Y_STEP, (value) => {
    maxYTickW = Math.max(maxYTickW, chartMeasureText(chartFormatTick(value, '°C'), 11));
  });

  coolingChartLayout.yAxisLabelX = 12;
  coolingChartLayout.W = W;
  coolingChartLayout.H = H;
  coolingChartLayout.ml = Math.ceil(coolingChartLayout.yAxisLabelX + maxYTickW + 18);
  coolingChartLayout.mb = Math.ceil(6 + 11 + 10 + 14 + 10);
  coolingChartLayout.mt = 28;
  coolingChartLayout.mr = 24;
  coolingChartLayout.ml = Math.min(
    coolingChartLayout.ml,
    Math.max(44, W - coolingChartLayout.mr - 140),
  );
  coolingChartLayout.mb = Math.min(
    coolingChartLayout.mb,
    Math.max(40, H - coolingChartLayout.mt - 100),
  );
  coolingChartLayout.pw = coolingChartLayout.W - coolingChartLayout.ml - coolingChartLayout.mr;
  coolingChartLayout.ph = coolingChartLayout.H - coolingChartLayout.mt - coolingChartLayout.mb;
}

function chartBuildDefs(svg) {
  const defs = document.createElementNS(chartNs(), 'defs');
  defs.innerHTML =
    '<marker id="coolingArrowBlue" markerWidth="6" markerHeight="6" refX="5.2" refY="3" orient="auto">' +
    '<path d="M0.6,1 L4.4,3 L0.6,5" fill="none" stroke="#1e6bb8" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" /></marker>';
  svg.appendChild(defs);
}

function chartDrawGrid(parent) {
  const g = document.createElementNS(chartNs(), 'g');
  g.setAttribute('class', 'grid');
  g.setAttribute('pointer-events', 'none');

  chartEachTick(CHART_T_MIN, CHART_T_MAX, CHART_T_STEP, (t) => {
    const x = chartTToX(t);
    const vline = document.createElementNS(chartNs(), 'line');
    vline.setAttribute('x1', String(x));
    vline.setAttribute('x2', String(x));
    vline.setAttribute('y1', String(coolingChartLayout.mt));
    vline.setAttribute('y2', String(coolingChartLayout.mt + coolingChartLayout.ph));
    vline.setAttribute('stroke', 'var(--cooling-grid)');
    vline.setAttribute('stroke-width', '1');
    vline.setAttribute('stroke-dasharray', '3 5');
    g.appendChild(vline);
  });

  chartEachTick(CHART_Y_MIN, CHART_Y_MAX, CHART_Y_STEP, (value) => {
    const y = chartYToPx(value);
    const hline = document.createElementNS(chartNs(), 'line');
    hline.setAttribute('x1', String(coolingChartLayout.ml));
    hline.setAttribute('x2', String(coolingChartLayout.ml + coolingChartLayout.pw));
    hline.setAttribute('y1', String(y));
    hline.setAttribute('y2', String(y));
    hline.setAttribute('stroke', 'var(--cooling-grid)');
    hline.setAttribute('stroke-width', '1');
    hline.setAttribute('stroke-dasharray', '3 5');
    g.appendChild(hline);
  });

  parent.appendChild(g);
}

function chartDrawAxes(parent) {
  const ax = document.createElementNS(chartNs(), 'g');
  ax.setAttribute('pointer-events', 'none');
  const yAxisX = coolingChartLayout.ml;
  const xAxisY = coolingChartLayout.mt + coolingChartLayout.ph;

  const yAxis = document.createElementNS(chartNs(), 'line');
  yAxis.setAttribute('x1', String(yAxisX));
  yAxis.setAttribute('y1', String(xAxisY));
  yAxis.setAttribute('x2', String(yAxisX));
  yAxis.setAttribute('y2', String(coolingChartLayout.mt - 4));
  yAxis.setAttribute('stroke', CHART_AXIS);
  yAxis.setAttribute('stroke-width', '2');
  yAxis.setAttribute('marker-end', 'url(#coolingArrowBlue)');
  ax.appendChild(yAxis);

  const xAxis = document.createElementNS(chartNs(), 'line');
  xAxis.setAttribute('x1', String(coolingChartLayout.ml));
  xAxis.setAttribute('y1', String(xAxisY));
  xAxis.setAttribute('x2', String(coolingChartLayout.ml + coolingChartLayout.pw + 6));
  xAxis.setAttribute('y2', String(xAxisY));
  xAxis.setAttribute('stroke', CHART_AXIS);
  xAxis.setAttribute('stroke-width', '2');
  xAxis.setAttribute('marker-end', 'url(#coolingArrowBlue)');
  ax.appendChild(xAxis);

  const xLabel = document.createElementNS(chartNs(), 'text');
  xLabel.setAttribute('x', String(coolingChartLayout.ml + coolingChartLayout.pw / 2));
  xLabel.setAttribute('y', String(coolingChartLayout.H - 6));
  xLabel.setAttribute('text-anchor', 'middle');
  xLabel.setAttribute('fill', CHART_AXIS);
  xLabel.setAttribute('font-size', '14');
  xLabel.textContent = 'čas';
  ax.appendChild(xLabel);

  const yAxisLabelCy = (coolingChartLayout.mt - 4 + coolingChartLayout.mt + coolingChartLayout.ph) / 2;
  const yLabel = document.createElementNS(chartNs(), 'text');
  yLabel.setAttribute('x', String(coolingChartLayout.yAxisLabelX));
  yLabel.setAttribute('y', String(yAxisLabelCy));
  yLabel.setAttribute('text-anchor', 'middle');
  yLabel.setAttribute('dominant-baseline', 'middle');
  yLabel.setAttribute('fill', CHART_AXIS);
  yLabel.setAttribute('font-size', '14');
  yLabel.setAttribute(
    'transform',
    `rotate(-90 ${coolingChartLayout.yAxisLabelX} ${yAxisLabelCy})`,
  );
  yLabel.textContent = 'teplota';
  ax.appendChild(yLabel);

  chartEachTick(CHART_T_MIN, CHART_T_MAX, CHART_T_STEP, (t, index, last) => {
    const x = chartTToX(t);
    const tick = document.createElementNS(chartNs(), 'line');
    tick.setAttribute('x1', String(x));
    tick.setAttribute('x2', String(x));
    tick.setAttribute('y1', String(xAxisY));
    tick.setAttribute('y2', String(xAxisY + 5));
    tick.setAttribute('stroke', CHART_AXIS);
    tick.setAttribute('stroke-width', '1.5');
    ax.appendChild(tick);

    if (index % 2 === 0 || index === last) {
      const label = document.createElementNS(chartNs(), 'text');
      label.setAttribute('x', String(x));
      label.setAttribute('y', String(xAxisY + 18));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', CHART_AXIS);
      label.setAttribute('font-size', '11');
      label.textContent = chartFormatTick(t, 's');
      ax.appendChild(label);
    }
  });

  chartEachTick(CHART_Y_MIN, CHART_Y_MAX, CHART_Y_STEP, (value) => {
    const y = chartYToPx(value);
    const yTick = document.createElementNS(chartNs(), 'line');
    yTick.setAttribute('x1', String(yAxisX - 5));
    yTick.setAttribute('x2', String(yAxisX));
    yTick.setAttribute('y1', String(y));
    yTick.setAttribute('y2', String(y));
    yTick.setAttribute('stroke', CHART_AXIS);
    yTick.setAttribute('stroke-width', '1.5');
    ax.appendChild(yTick);

    const label = document.createElementNS(chartNs(), 'text');
    label.setAttribute('x', String(yAxisX - 8));
    label.setAttribute('y', String(y + 4));
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('fill', CHART_AXIS);
    label.setAttribute('font-size', '11');
    label.textContent = chartFormatTick(value, '°C');
    ax.appendChild(label);
  });

  parent.appendChild(ax);
}

function chartCreateCross(cx, cy, index) {
  const g = document.createElementNS(chartNs(), 'g');
  g.setAttribute('class', 'chart-cross-marker');
  g.setAttribute('transform', `translate(${cx},${cy})`);
  if (index != null) g.setAttribute('data-index', String(index));

  const addLine = (x1, y1, x2, y2) => {
    const line = document.createElementNS(chartNs(), 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('stroke', CHART_AXIS);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('pointer-events', 'none');
    g.appendChild(line);
  };

  const hit = document.createElementNS(chartNs(), 'circle');
  hit.setAttribute('r', '14');
  hit.setAttribute('fill', 'transparent');
  hit.setAttribute('stroke', 'none');
  hit.setAttribute('pointer-events', 'all');
  g.appendChild(hit);
  addLine(-CHART_CROSS_HALF, 0, CHART_CROSS_HALF, 0);
  addLine(0, -CHART_CROSS_HALF, 0, CHART_CROSS_HALF);
  return g;
}

function chartClampPoint(t, y) {
  return {
    t: Math.min(CHART_T_MAX, Math.max(CHART_T_MIN, t)),
    y: Math.min(CHART_Y_MAX, Math.max(CHART_Y_MIN, y)),
  };
}

function chartWouldReject(t, y, ignoreIndex) {
  return coolingChartPoints.some((point, index) => {
    if (ignoreIndex != null && index === ignoreIndex) return false;
    const dx = (point.t - t) / (CHART_T_MAX - CHART_T_MIN || 1);
    const dy = (point.y - y) / (CHART_Y_MAX - CHART_Y_MIN || 1);
    return dx * dx + dy * dy < 0.02 * 0.02;
  });
}

function chartCoordsFromEvent(ev) {
  if (!coolingChartEl) return null;
  const rect = coolingChartEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: ((ev.clientX - rect.left) / rect.width) * coolingChartLayout.W,
    y: ((ev.clientY - rect.top) / rect.height) * coolingChartLayout.H,
  };
}

function chartPlotCoordsFromEvent(ev) {
  const xy = chartCoordsFromEvent(ev);
  if (!xy) return null;

  const minX = coolingChartLayout.ml;
  const maxX = coolingChartLayout.ml + coolingChartLayout.pw;
  const minY = coolingChartLayout.mt;
  const maxY = coolingChartLayout.mt + coolingChartLayout.ph;
  const x = Math.min(maxX, Math.max(minX, xy.x));
  const y = Math.min(maxY, Math.max(minY, xy.y));
  const t =
    CHART_T_MIN +
    ((x - coolingChartLayout.ml) / coolingChartLayout.pw) * (CHART_T_MAX - CHART_T_MIN);
  const temp =
    CHART_Y_MIN +
    ((coolingChartLayout.mt + coolingChartLayout.ph - y) / coolingChartLayout.ph) *
      (CHART_Y_MAX - CHART_Y_MIN);
  return chartClampPoint(t, temp);
}

function chartPointsSortedForCurve(points) {
  const copy = points.map((point) => ({ t: point.t, y: point.y }));
  copy.sort((a, b) => a.t - b.t || a.y - b.y);
  const deduped = [];
  copy.forEach((point) => {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.t - point.t) < 1e-5) {
      last.y = (last.y + point.y) / 2;
      return;
    }
    deduped.push(point);
  });
  return deduped;
}

function chartBuildNaturalCubicSpline(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  if (n === 2) {
    const [x0, x1] = xs;
    const [y0, y1] = ys;
    const slope = x1 === x0 ? 0 : (y1 - y0) / (x1 - x0);
    return {
      eval(x) {
        return y0 + slope * (x - x0);
      },
    };
  }

  const h = new Array(n - 1);
  for (let i = 0; i < n - 1; i += 1) {
    h[i] = xs[i + 1] - xs[i];
    if (h[i] <= 0) return null;
  }

  const alpha = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i += 1) {
    alpha[i] = (3 / h[i]) * (ys[i + 1] - ys[i]) - (3 / h[i - 1]) * (ys[i] - ys[i - 1]);
  }

  const l = new Array(n).fill(1);
  const mu = new Array(n).fill(0);
  const z = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i += 1) {
    l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }

  const c = new Array(n).fill(0);
  const b = new Array(n - 1);
  const d = new Array(n - 1);
  for (let j = n - 2; j >= 0; j -= 1) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (ys[j + 1] - ys[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  return {
    xs,
    ys,
    b,
    c,
    d,
    eval(x) {
      const xsLocal = this.xs;
      const ysLocal = this.ys;
      const nLocal = xsLocal.length;
      if (x <= xsLocal[0]) {
        const dx0 = x - xsLocal[0];
        return ysLocal[0] + this.b[0] * dx0 + this.c[0] * dx0 * dx0 + this.d[0] * dx0 * dx0 * dx0;
      }
      if (x >= xsLocal[nLocal - 1]) {
        const ii = nLocal - 2;
        const dx1 = x - xsLocal[ii];
        return (
          ysLocal[ii] +
          this.b[ii] * dx1 +
          this.c[ii] * dx1 * dx1 +
          this.d[ii] * dx1 * dx1 * dx1
        );
      }
      let k = 0;
      while (k < nLocal - 2 && x > xsLocal[k + 1]) k += 1;
      const dx = x - xsLocal[k];
      return (
        ysLocal[k] +
        this.b[k] * dx +
        this.c[k] * dx * dx +
        this.d[k] * dx * dx * dx
      );
    },
  };
}

function chartFittedCurvePathData(points) {
  const sorted = chartPointsSortedForCurve(points);
  if (sorted.length < 2) return '';

  const xs = sorted.map((point) => point.t);
  const ys = sorted.map((point) => point.y);
  const spline = chartBuildNaturalCubicSpline(xs, ys);
  if (!spline) return '';

  const t0 = xs[0];
  const t1 = xs[xs.length - 1];
  const steps = Math.max(48, Math.ceil((t1 - t0) * 0.5));
  const parts = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = t0 + (i / steps) * (t1 - t0);
    const y = Math.min(CHART_Y_MAX, Math.max(CHART_Y_MIN, spline.eval(t)));
    parts.push(`${chartTToX(t).toFixed(2)},${chartYToPx(y).toFixed(2)}`);
  }
  return `M ${parts.join(' L ')}`;
}

function chartPolylinePathData(points) {
  const sorted = chartPointsSortedForCurve(points);
  if (sorted.length < 2) return '';
  return `M ${sorted
    .map((point) => `${chartTToX(point.t).toFixed(2)},${chartYToPx(point.y).toFixed(2)}`)
    .join(' L ')}`;
}

function chartDrawFittedCurve(parent, points) {
  const d =
    coolingChartFitMode === 'polyline'
      ? chartPolylinePathData(points)
      : chartFittedCurvePathData(points);
  if (!d) return;

  const path = document.createElementNS(chartNs(), 'path');
  path.setAttribute('class', 'fitted-curve');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', CHART_AXIS);
  path.setAttribute('stroke-width', '2.5');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('pointer-events', 'none');
  parent.appendChild(path);
}

function updateChartFitControls() {
  const canFit = coolingChartPoints.length >= 2;
  if (coolingChartFitBtn) {
    if (!canFit) coolingChartShowFit = false;
    coolingChartFitBtn.disabled = !canFit;
    coolingChartFitBtn.classList.toggle('is-active', coolingChartShowFit && canFit);
    coolingChartFitBtn.setAttribute('aria-pressed', String(coolingChartShowFit && canFit));
  }
  if (coolingChartFitModeRow) {
    coolingChartFitModeRow.classList.toggle('is-visible', coolingChartShowFit && canFit);
  }
  if (coolingChartFitModeCurveBtn && coolingChartFitModePolylineBtn) {
    const isCurve = coolingChartFitMode === 'curve';
    coolingChartFitModeCurveBtn.classList.toggle('is-active', isCurve);
    coolingChartFitModePolylineBtn.classList.toggle('is-active', !isCurve);
    coolingChartFitModeCurveBtn.setAttribute('aria-pressed', String(isCurve));
    coolingChartFitModePolylineBtn.setAttribute('aria-pressed', String(!isCurve));
  }
}

function chartEndHoldListeners() {
  document.removeEventListener('pointermove', onChartHoldMove);
  document.removeEventListener('pointerup', onChartHoldUp);
  document.removeEventListener('pointercancel', onChartHoldUp);
}

function chartCommitHold() {
  if (!coolingChartHold) return;

  const hold = coolingChartHold;
  const coords = chartClampPoint(hold.t, hold.y);
  coolingChartHold = null;
  if (coolingChartEl) coolingChartEl.classList.remove('is-holding-point');

  if (hold.mode === 'new') {
    if (
      coolingChartPoints.length < CHART_MAX_POINTS &&
      !chartWouldReject(coords.t, coords.y)
    ) {
      coolingChartPoints.push({ t: coords.t, y: coords.y });
    }
  } else if (hold.mode === 'existing' && hold.index != null) {
    if (!chartWouldReject(coords.t, coords.y, hold.index)) {
      coolingChartPoints[hold.index] = { t: coords.t, y: coords.y };
    }
  }

  coolingChartPoints.sort((a, b) => a.t - b.t);
  redrawCoolingChart();
}

function onChartHoldMove(ev) {
  if (!coolingChartHold) return;
  if (
    typeof coolingChartHold.pointerId === 'number' &&
    typeof ev.pointerId === 'number' &&
    ev.pointerId !== coolingChartHold.pointerId
  ) {
    return;
  }
  ev.preventDefault();
  const coords = chartPlotCoordsFromEvent(ev);
  if (!coords) return;
  coolingChartHold.t = coords.t;
  coolingChartHold.y = coords.y;
  redrawCoolingChart();
}

function onChartHoldUp(ev) {
  if (!coolingChartHold) return;
  if (
    typeof coolingChartHold.pointerId === 'number' &&
    typeof ev.pointerId === 'number' &&
    ev.pointerId !== coolingChartHold.pointerId
  ) {
    return;
  }
  if (ev.cancelable) ev.preventDefault();
  const coords = chartPlotCoordsFromEvent(ev);
  if (coords) {
    coolingChartHold.t = coords.t;
    coolingChartHold.y = coords.y;
  }
  if (
    coolingChartEl &&
    typeof coolingChartHold.pointerId === 'number' &&
    coolingChartEl.releasePointerCapture
  ) {
    try {
      coolingChartEl.releasePointerCapture(coolingChartHold.pointerId);
    } catch {
      /* ignore */
    }
  }
  chartEndHoldListeners();
  chartCommitHold();
}

function chartMarkerFromTarget(target) {
  let el = target instanceof Element ? target : null;
  while (el && el !== coolingChartEl) {
    if (
      el.getAttribute?.('class')?.includes('chart-cross-marker') &&
      el.getAttribute('data-index') != null
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function onChartPointerDown(ev) {
  if (!coolingGraphVisible || !coolingChartEl) return;
  if (ev.button != null && ev.button !== 0) return;

  const marker = chartMarkerFromTarget(ev.target);
  let hold;

  if (marker) {
    const idx = parseInt(marker.getAttribute('data-index'), 10);
    if (!Number.isFinite(idx) || idx < 0 || idx >= coolingChartPoints.length) return;
    hold = {
      mode: 'existing',
      index: idx,
      t: coolingChartPoints[idx].t,
      y: coolingChartPoints[idx].y,
    };
  } else {
    const coords = chartPlotCoordsFromEvent(ev);
    if (!coords) return;
    if (
      coolingChartPoints.length >= CHART_MAX_POINTS ||
      chartWouldReject(coords.t, coords.y)
    ) {
      return;
    }
    hold = { mode: 'new', index: null, t: coords.t, y: coords.y };
  }

  ev.preventDefault();
  coolingChartHold = hold;
  coolingChartEl.classList.add('is-holding-point');
  if (typeof ev.pointerId === 'number' && coolingChartEl.setPointerCapture) {
    try {
      coolingChartEl.setPointerCapture(ev.pointerId);
      coolingChartHold.pointerId = ev.pointerId;
    } catch {
      /* ignore */
    }
  }
  document.addEventListener('pointermove', onChartHoldMove, { passive: false });
  document.addEventListener('pointerup', onChartHoldUp, { passive: false });
  document.addEventListener('pointercancel', onChartHoldUp, { passive: false });
  redrawCoolingChart();
}

function onChartDblClick(ev) {
  if (!coolingGraphVisible) return;
  const marker = chartMarkerFromTarget(ev.target);
  if (!marker) return;
  const idx = parseInt(marker.getAttribute('data-index'), 10);
  if (!Number.isFinite(idx) || idx < 0 || idx >= coolingChartPoints.length) return;
  coolingChartPoints.splice(idx, 1);
  if (coolingChartPoints.length < 2) coolingChartShowFit = false;
  redrawCoolingChart();
  ev.preventDefault();
}

function saveCoolingChartAsImage() {
  if (!coolingChartEl) return;

  const clone = coolingChartEl.cloneNode(true);
  const srcEls = [coolingChartEl, ...coolingChartEl.querySelectorAll('*')];
  const cloneEls = [clone, ...clone.querySelectorAll('*')];
  const props = [
    'fill',
    'stroke',
    'stroke-width',
    'stroke-dasharray',
    'stroke-linecap',
    'stroke-linejoin',
    'opacity',
    'font-size',
    'font-family',
    'font-weight',
    'text-anchor',
    'dominant-baseline',
  ];

  for (let i = 0; i < srcEls.length && i < cloneEls.length; i += 1) {
    try {
      const cs = window.getComputedStyle(srcEls[i]);
      props.forEach((prop) => {
        const val = cs.getPropertyValue(prop);
        if (val) cloneEls[i].setAttribute(prop, val);
      });
    } catch {
      /* ignore */
    }
  }

  const NS = chartNs();
  const bg = document.createElementNS(NS, 'rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', '0');
  bg.setAttribute('width', String(coolingChartLayout.W));
  bg.setAttribute('height', String(coolingChartLayout.H));
  bg.setAttribute('fill', '#ffffff');
  clone.insertBefore(bg, clone.firstChild);
  clone.setAttribute('xmlns', NS);

  clone.querySelectorAll('.grid line').forEach((line) => {
    line.setAttribute('stroke', 'rgba(30, 107, 184, 0.22)');
  });

  const svgString = new XMLSerializer().serializeToString(clone);
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = coolingChartLayout.W * scale;
  canvas.height = coolingChartLayout.H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, coolingChartLayout.W, coolingChartLayout.H);

  const img = new Image();
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    ctx.drawImage(img, 0, 0, coolingChartLayout.W, coolingChartLayout.H);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'graf-cas-teplota.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function resetCoolingChart() {
  coolingChartHold = null;
  chartEndHoldListeners();
  if (coolingChartEl) coolingChartEl.classList.remove('is-holding-point');
  coolingChartPoints = [];
  coolingChartShowFit = false;
  coolingChartFitMode = 'curve';
  redrawCoolingChart();
}

function redrawCoolingChart() {
  if (!coolingChartEl || !coolingGraphVisible) return;

  computeCoolingChartLayout();
  coolingChartEl.setAttribute(
    'viewBox',
    `0 0 ${coolingChartLayout.W} ${coolingChartLayout.H}`,
  );
  coolingChartEl.innerHTML = '';
  chartBuildDefs(coolingChartEl);

  const body = document.createElementNS(chartNs(), 'g');
  body.setAttribute('class', 'plot-body');
  chartDrawGrid(body);
  chartDrawAxes(body);

  if (coolingChartShowFit && coolingChartPoints.length >= 2) {
    chartDrawFittedCurve(body, coolingChartPoints);
  }

  const handles = document.createElementNS(chartNs(), 'g');
  handles.setAttribute('class', 'handles');
  coolingChartPoints.forEach((point, index) => {
    if (
      coolingChartHold &&
      coolingChartHold.mode === 'existing' &&
      coolingChartHold.index === index
    ) {
      return;
    }
    handles.appendChild(
      chartCreateCross(chartTToX(point.t), chartYToPx(point.y), index),
    );
  });
  body.appendChild(handles);

  if (coolingChartHold) {
    const preview = chartCreateCross(
      chartTToX(coolingChartHold.t),
      chartYToPx(coolingChartHold.y),
      null,
    );
    preview.setAttribute('opacity', '0.85');
    preview.style.pointerEvents = 'none';
    body.appendChild(preview);
  }

  coolingChartEl.appendChild(body);
  updateChartFitControls();
}

function scheduleCoolingChartRedraw() {
  if (!coolingGraphVisible) return;
  if (coolingChartResizeRaf !== null) cancelAnimationFrame(coolingChartResizeRaf);
  coolingChartResizeRaf = requestAnimationFrame(() => {
    coolingChartResizeRaf = null;
    redrawCoolingChart();
  });
}

function setCoolingGraphVisible(visible) {
  coolingGraphVisible = !!visible;

  if (coolingGraphVisible) {
    appRoot.dataset.coolingView = 'graph';
    coolingWasPlayingBeforeGraph = coolingPlaying;
    coolingPlaying = false;
    syncCoolingButton();
  } else {
    appRoot.removeAttribute('data-cooling-view');
    if (coolingWasPlayingBeforeGraph && !coolingDone) {
      coolingPlaying = true;
      syncCoolingButton();
    }
    coolingWasPlayingBeforeGraph = false;
  }

  if (coolingGraphBtn) {
    coolingGraphBtn.classList.toggle('is-active', coolingGraphVisible);
    coolingGraphBtn.setAttribute('aria-pressed', String(coolingGraphVisible));
    coolingGraphBtn.textContent = coolingGraphVisible ? 'Skrýt graf' : 'Zobrazit graf';
  }

  updateChartFitControls();
  scheduleCoolingChartRedraw();
  syncAmbientTempControls();
  scheduleSimStageFit();
}

function showCoolingStage() {
  waterSubject.hidden = false;
  goldSubject.hidden = true;
  gasSubject.hidden = true;
  freezeLottieFrame();
}

function setAppMode(mode) {
  const nextMode = mode === 'cooling' ? 'cooling' : 'heating';
  if (nextMode === appMode) return;

  appMode = nextMode;
  appRoot.dataset.appMode = appMode;

  modeButtons.forEach((button) => {
    const isActive = button.dataset.appMode === appMode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  if (appMode === 'cooling') {
    setBurnerOn(false);
    resetCoolingState();
    showCoolingStage();
  } else {
    coolingPlaying = false;
    setCoolingGraphVisible(false);
    resetCoolingChart();
    setSubject(activeSubject);
  }

  applySimulationState();
  scheduleSimStageFit();
}

burnerToggle.addEventListener('click', toggleBurner);
coolingToggle.addEventListener('click', onCoolingToggleClick);
if (coolingResetBtn) {
  coolingResetBtn.addEventListener('click', resetCoolingState);
}
if (ambientTempBtn) {
  ambientTempBtn.addEventListener('click', openAmbientKeypad);
}
if (ambientKeypadConfirm) {
  ambientKeypadConfirm.addEventListener('click', confirmAmbientKeypad);
}
if (ambientKeypadCancel) {
  ambientKeypadCancel.addEventListener('click', closeAmbientKeypad);
}
if (ambientKeypadOverlay) {
  ambientKeypadOverlay.addEventListener('click', (event) => {
    if (event.target === ambientKeypadOverlay) closeAmbientKeypad();
  });
}
if (ambientMathKeypad) {
  ambientMathKeypad.querySelectorAll('.table-math-keypad__key').forEach((keyBtn) => {
    keyBtn.addEventListener('click', handleAmbientKeypadClick);
  });
}
document.addEventListener('keydown', onAmbientKeypadKeydown);
if (coolingGraphBtn) {
  coolingGraphBtn.addEventListener('click', () => {
    setCoolingGraphVisible(!coolingGraphVisible);
  });
}
if (coolingChartEl) {
  coolingChartEl.addEventListener('pointerdown', onChartPointerDown);
  coolingChartEl.addEventListener('dblclick', onChartDblClick);
}
if (coolingChartSaveBtn) {
  coolingChartSaveBtn.addEventListener('click', saveCoolingChartAsImage);
}
if (coolingChartResetBtn) {
  coolingChartResetBtn.addEventListener('click', resetCoolingChart);
}
if (coolingChartFitBtn) {
  coolingChartFitBtn.addEventListener('click', () => {
    if (coolingChartPoints.length < 2) return;
    coolingChartShowFit = !coolingChartShowFit;
    redrawCoolingChart();
  });
}
if (coolingChartFitModeCurveBtn) {
  coolingChartFitModeCurveBtn.addEventListener('click', () => {
    coolingChartFitMode = 'curve';
    redrawCoolingChart();
  });
}
if (coolingChartFitModePolylineBtn) {
  coolingChartFitModePolylineBtn.addEventListener('click', () => {
    coolingChartFitMode = 'polyline';
    redrawCoolingChart();
  });
}
subjectButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setSubject(button.dataset.subject);
  });
});
modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setAppMode(button.dataset.appMode);
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
  scheduleSimStageFit();
  if (activeSubject === 'water' && appMode === 'heating') {
    drawWaterParticleDetail(0);
  } else if (activeSubject === 'gold') {
    drawGoldParticleDetail(particlePhaseMs);
  } else if (activeSubject === 'gas') {
    drawGasParticleDetail(0);
  }
  scheduleCoolingChartRedraw();
});
if (boardStageEl && typeof ResizeObserver !== 'undefined') {
  const boardStageObserver = new ResizeObserver(() => {
    scheduleSimStageFit();
  });
  boardStageObserver.observe(boardStageEl);
}
scheduleSimStageFit();
setSubject('water');
syncCoolingButton();
updateCoolingStopwatch();
updateAmbientTempLabel();
syncAmbientTempControls();
if (coolingGraphBtn) {
  coolingGraphBtn.textContent = 'Zobrazit graf';
}
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

function loadCoolingData() {
  return fetch('assets/ochlazovani-vody.json')
    .then((response) => {
      if (!response.ok) throw new Error('Data chladnutí nelze načíst.');
      return response.json();
    })
    .then((data) => {
      coolingData = data;
      if (appMode === 'cooling') {
        applySimulationState();
      }
      scheduleCoolingChartRedraw();
    })
    .catch(() => {
      coolingData = [[0, 100], [COOL_TIME_MAX, COOL_TEMP_MIN]];
    });
}

loadLottieAnimation(lottieEl, 'cup-water-detail.json').then((waterAnimation) => {
  anim = waterAnimation;

  if (anim) {
    particlePhaseMs = 0;
    scheduleSimStageFit();
    applySimulationState();
    updateParticleAnimation(0);
  }
});

loadCoolingData();
