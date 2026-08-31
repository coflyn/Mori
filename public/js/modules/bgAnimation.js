// bgAnimation.js — High-Aesthetic Live Background Particle Engine
import { triggerHaptic, showToast } from "../utils/index.js";
import { t } from "./core.js";

let canvas = null;
let ctx = null;
let animFrameId = null;
let width = window.innerWidth;
let height = window.innerHeight;
let dpr = window.devicePixelRatio || 1;

let isEnabled = localStorage.getItem("mori_bg_animated") === "true";
let currentShape = localStorage.getItem("mori_bg_shape") || "stars";
let currentBrightness = parseInt(
  localStorage.getItem("mori_bg_brightness") || "150",
  10,
);

// Global animation timer for continuous procedural waves/pulsing
let globalTick = 0;

// Star / Node Particle for Constellation Plexus
class StarNode {
  constructor(initial = false) {
    this.x = Math.random() * width;
    this.y = initial
      ? Math.random() * height
      : Math.random() < 0.5
        ? -10
        : height + 10;
    this.vx = (Math.random() - 0.5) * 0.45;
    this.vy = (Math.random() - 0.5) * 0.45;
    this.radius = Math.random() * 2.2 + 1.2;
    this.baseAlpha = Math.random() * 0.45 + 0.35;
    this.twinklePhase = Math.random() * Math.PI * 2;
    this.twinkleSpeed = Math.random() * 0.03 + 0.015;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.twinklePhase += this.twinkleSpeed;

    // Wrap around screen boundaries with margin
    const margin = 20;
    if (this.x < -margin) this.x = width + margin;
    if (this.x > width + margin) this.x = -margin;
    if (this.y < -margin) this.y = height + margin;
    if (this.y > height + margin) this.y = -margin;
  }

  draw(colorRGB, brightnessFactor) {
    const alpha = Math.max(
      0.1,
      Math.min(
        1,
        (this.baseAlpha + Math.sin(this.twinklePhase) * 0.25) *
          brightnessFactor,
      ),
    );

    // Outer halo
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${colorRGB}, ${alpha * 0.15})`;
    ctx.fill();

    // Bright core
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${colorRGB}, ${alpha * 0.9})`;
    ctx.fill();
  }
}

// Bubble Particle for Floating Glass Bubbles
class Bubble {
  constructor(initial = false) {
    this.reset(initial);
  }

  reset(initial = false) {
    this.x = Math.random() * width;
    this.y = initial
      ? Math.random() * height
      : height + Math.random() * 40 + 20;
    this.radius = Math.random() * 16 + 6;
    this.vy = -(Math.random() * 0.65 + 0.3);
    this.vx = (Math.random() - 0.5) * 0.2;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = Math.random() * 0.03 + 0.015;
    this.wobbleAmp = Math.random() * 18 + 8;
    this.alpha = Math.random() * 0.35 + 0.3;
  }

  update() {
    this.y += this.vy;
    this.wobblePhase += this.wobbleSpeed;
    this.x += this.vx + Math.sin(this.wobblePhase) * 0.4;

    if (this.y < -this.radius * 2) {
      this.reset(false);
    }
  }

  draw(colorRGB, brightnessFactor) {
    const a = this.alpha * brightnessFactor;

    // Outer Bubble Ring
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${colorRGB}, ${a * 0.75})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Subtle Glass Gradient Fill
    const grad = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      1,
      this.x,
      this.y,
      this.radius,
    );
    grad.addColorStop(0, `rgba(${colorRGB}, ${a * 0.25})`);
    grad.addColorStop(0.8, `rgba(${colorRGB}, ${a * 0.05})`);
    grad.addColorStop(1, `rgba(${colorRGB}, 0)`);
    ctx.fillStyle = grad;
    ctx.fill();

    // Specular Light Highlight on top-left
    ctx.beginPath();
    ctx.arc(
      this.x - this.radius * 0.38,
      this.y - this.radius * 0.38,
      this.radius * 0.25,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = `rgba(${colorRGB}, ${a * 0.85})`;
    ctx.fill();
  }
}

// Glowing Ambient Orb Particle
class AmbientOrb {
  constructor(initial = false) {
    this.x = Math.random() * width;
    this.y = initial ? Math.random() * height : Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.35;
    this.vy = (Math.random() - 0.5) * 0.35;
    this.baseRadius = Math.random() * 45 + 25;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = Math.random() * 0.02 + 0.01;
    this.baseAlpha = Math.random() * 0.35 + 0.25;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.pulsePhase += this.pulseSpeed;

    const margin = this.baseRadius * 1.5;
    if (this.x < -margin) this.x = width + margin;
    if (this.x > width + margin) this.x = -margin;
    if (this.y < -margin) this.y = height + margin;
    if (this.y > height + margin) this.y = -margin;
  }

  draw(colorRGB, brightnessFactor) {
    const currentRadius =
      this.baseRadius * (1 + 0.15 * Math.sin(this.pulsePhase));
    const alpha =
      (this.baseAlpha + Math.sin(this.pulsePhase) * 0.1) * brightnessFactor;

    const grad = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      currentRadius,
    );
    grad.addColorStop(0, `rgba(${colorRGB}, ${alpha * 0.85})`);
    grad.addColorStop(0.4, `rgba(${colorRGB}, ${alpha * 0.35})`);
    grad.addColorStop(1, `rgba(${colorRGB}, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// Pools
let starNodes = [];
let bubbles = [];
let ambientOrbs = [];

function initElements() {
  starNodes = [];
  bubbles = [];
  ambientOrbs = [];

  // Optimal counts based on screen size
  const area = (width * height) / 10000;
  const starCount = Math.max(35, Math.min(65, Math.floor(area * 1.2)));
  const bubbleCount = Math.max(25, Math.min(45, Math.floor(area * 0.9)));
  const orbCount = Math.max(16, Math.min(28, Math.floor(area * 0.55)));

  if (currentShape === "stars") {
    for (let i = 0; i < starCount; i++) {
      starNodes.push(new StarNode(true));
    }
  } else if (currentShape === "bubbles") {
    for (let i = 0; i < bubbleCount; i++) {
      bubbles.push(new Bubble(true));
    }
  } else if (currentShape === "particles") {
    for (let i = 0; i < orbCount; i++) {
      ambientOrbs.push(new AmbientOrb(true));
    }
  }
}

// Draw Flowing Waves (Silk/Topographic Ribbon Curves)
function drawFlowingWaves(colorRGB, brightnessFactor) {
  const waveLayers = [
    { baseHeight: 0.3, amp: 45, freq: 0.0035, speed: 0.015, alpha: 0.18 },
    { baseHeight: 0.5, amp: 55, freq: 0.0028, speed: 0.011, alpha: 0.24 },
    { baseHeight: 0.7, amp: 65, freq: 0.0032, speed: 0.018, alpha: 0.28 },
    { baseHeight: 0.88, amp: 50, freq: 0.004, speed: 0.013, alpha: 0.2 },
  ];

  for (let l = 0; l < waveLayers.length; l++) {
    const layer = waveLayers[l];
    const yAnchor = height * layer.baseHeight;
    const a = layer.alpha * brightnessFactor;

    ctx.beginPath();
    ctx.moveTo(0, height);

    const step = 8;
    for (let x = 0; x <= width + step; x += step) {
      const y =
        yAnchor +
        Math.sin(x * layer.freq + globalTick * layer.speed) * layer.amp +
        Math.cos(x * layer.freq * 0.5 + globalTick * layer.speed * 0.7) *
          (layer.amp * 0.5);

      if (x === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineTo(width, height);
    ctx.closePath();

    // Smooth gradient fill from crest down
    const grad = ctx.createLinearGradient(0, yAnchor - layer.amp, 0, height);
    grad.addColorStop(0, `rgba(${colorRGB}, ${a * 0.7})`);
    grad.addColorStop(0.5, `rgba(${colorRGB}, ${a * 0.3})`);
    grad.addColorStop(1, `rgba(${colorRGB}, 0.02)`);

    ctx.fillStyle = grad;
    ctx.fill();

    // Wave crest outline stroke for crispness
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = `rgba(${colorRGB}, ${a * 0.85})`;
    ctx.stroke();
  }
}

// Draw Constellation Plexus Lines between nearby stars
function drawConstellationLines(colorRGB, brightnessFactor) {
  const maxDist = 110;
  const maxDistSq = maxDist * maxDist;

  ctx.lineWidth = 0.9;
  for (let i = 0; i < starNodes.length; i++) {
    const p1 = starNodes[i];
    for (let j = i + 1; j < starNodes.length; j++) {
      const p2 = starNodes[j];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < maxDistSq) {
        const dist = Math.sqrt(distSq);
        const lineAlpha = (1 - dist / maxDist) * 0.45 * brightnessFactor;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(${colorRGB}, ${lineAlpha})`;
        ctx.stroke();
      }
    }
  }
}

function resizeCanvas() {
  if (!canvas) return;
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  if (ctx) {
    ctx.scale(dpr, dpr);
  }
  initElements();
}

function animate() {
  if (!isEnabled) return;
  if (!ctx || !canvas) return;

  const isDark =
    document.body.classList.contains("dark-theme") ||
    document.documentElement.getAttribute("data-theme") === "dark";

  const colorRGB = isDark ? "245, 240, 225" : "40, 36, 30";
  const brightnessFactor = currentBrightness / 100;

  ctx.clearRect(0, 0, width, height);
  globalTick += 1;

  if (currentShape === "stars") {
    drawConstellationLines(colorRGB, brightnessFactor);

    for (let i = 0; i < starNodes.length; i++) {
      starNodes[i].update();
      starNodes[i].draw(colorRGB, brightnessFactor);
    }
  } else if (currentShape === "waves") {
    drawFlowingWaves(colorRGB, brightnessFactor);
  } else if (currentShape === "bubbles") {
    for (let i = 0; i < bubbles.length; i++) {
      bubbles[i].update();
      bubbles[i].draw(colorRGB, brightnessFactor);
    }
  } else if (currentShape === "particles") {
    for (let i = 0; i < ambientOrbs.length; i++) {
      ambientOrbs[i].update();
      ambientOrbs[i].draw(colorRGB, brightnessFactor);
    }
  }

  animFrameId = requestAnimationFrame(animate);
}

export function startAnimation() {
  if (!canvas) return;
  canvas.style.display = "block";
  if (animFrameId) cancelAnimationFrame(animFrameId);
  initElements();
  animate();
}

export function stopAnimation() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (canvas && ctx) {
    ctx.clearRect(0, 0, width, height);
    canvas.style.display = "none";
  }
}

export function setAnimatedBgEnabled(enabled) {
  isEnabled = !!enabled;
  localStorage.setItem("mori_bg_animated", isEnabled ? "true" : "false");
  if (isEnabled) {
    startAnimation();
  } else {
    stopAnimation();
  }
}

export function setAnimatedBgShape(shape) {
  currentShape = shape;
  localStorage.setItem("mori_bg_shape", shape);
  initElements();
}

export function setAnimatedBgBrightness(value) {
  currentBrightness = Math.max(20, Math.min(200, parseInt(value, 10) || 100));
  localStorage.setItem("mori_bg_brightness", currentBrightness.toString());
}

export function initBgAnimation() {
  canvas = document.getElementById("bgAnimationCanvas");
  if (!canvas) return;
  ctx = canvas.getContext("2d");

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    } else if (isEnabled) {
      animate();
    }
  });

  // Connect DOM Controls
  const toggle = document.getElementById("animatedBgToggle");
  const brightnessSlider = document.getElementById("bgBrightnessSlider");
  const brightnessValue = document.getElementById("bgBrightnessValue");
  const shapeCards = document.querySelectorAll(".bg-shape-card");

  if (toggle) {
    toggle.checked = isEnabled;
    toggle.addEventListener("change", (e) => {
      triggerHaptic();
      setAnimatedBgEnabled(e.target.checked);
      showToast(
        e.target.checked ? t("toast-animatedbg-on") : t("toast-animatedbg-off"),
      );
    });
  }

  if (brightnessSlider) {
    brightnessSlider.value = currentBrightness;
    if (brightnessValue) brightnessValue.textContent = `${currentBrightness}%`;

    brightnessSlider.addEventListener("input", (e) => {
      const val = e.target.value;
      setAnimatedBgBrightness(val);
      if (brightnessValue) brightnessValue.textContent = `${val}%`;
    });
  }

  shapeCards.forEach((card) => {
    const shape = card.getAttribute("data-shape");
    if (shape === currentShape) {
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }

    card.addEventListener("click", () => {
      triggerHaptic();
      shapeCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      setAnimatedBgShape(shape);
    });
  });

  if (isEnabled) {
    startAnimation();
  } else {
    stopAnimation();
  }
}
