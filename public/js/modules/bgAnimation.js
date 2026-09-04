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
let currentSpeed = parseInt(localStorage.getItem("mori_bg_speed") || "100", 10);
let speedFactor = currentSpeed / 100;

let globalTick = 0;

const touchPos = {
  x: -9999,
  y: -9999,
  active: false,
};

function onPointerMove(e) {
  touchPos.x = e.clientX;
  touchPos.y = e.clientY;
  touchPos.active = true;
}

function onPointerDown(e) {
  touchPos.x = e.clientX;
  touchPos.y = e.clientY;
  touchPos.active = true;

  if (currentShape === "rain") {
    spawnRainRipple(e.clientX, e.clientY);
  }
}

function onPointerUp() {
  touchPos.active = false;
  touchPos.x = -9999;
  touchPos.y = -9999;
}

// Gentle Touch Repel Physics Helper
function applyTouchRepel(particle, radius = 95, forcePower = 2.8) {
  if (!touchPos.active) return;
  const dx = particle.x - touchPos.x;
  const dy = particle.y - touchPos.y;
  const distSq = dx * dx + dy * dy;
  const rSq = radius * radius;

  if (distSq < rSq && distSq > 0.001) {
    const dist = Math.sqrt(distSq);
    const force = (1 - dist / radius) * forcePower;
    particle.x += (dx / dist) * force;
    particle.y += (dy / dist) * force;
  }
}

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

  update(speed) {
    const s = speed || 1;
    this.x += this.vx * s;
    this.y += this.vy * s;
    this.twinklePhase += this.twinkleSpeed * s;

    applyTouchRepel(this, 90, 3.2);

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
    this.alpha = Math.random() * 0.35 + 0.3;
  }

  update(speed) {
    const s = speed || 1;
    this.y += this.vy * s;
    this.wobblePhase += this.wobbleSpeed * s;
    this.x += (this.vx + Math.sin(this.wobblePhase) * 0.4) * s;

    applyTouchRepel(this, 95, 3.5);

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

  update(speed) {
    const s = speed || 1;
    this.x += this.vx * s;
    this.y += this.vy * s;
    this.pulsePhase += this.pulseSpeed * s;

    applyTouchRepel(this, 110, 3.8);

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

class SakuraPetal {
  constructor(initial = false) {
    this.reset(initial);
  }

  reset(initial = false) {
    this.x = Math.random() * (width + 80) - 40;
    this.y = initial ? Math.random() * height : -25 - Math.random() * 40;
    this.size = Math.random() * 8 + 8; // petal length: 8 - 16px
    this.aspect = Math.random() * 0.35 + 0.55; // width ratio
    this.vy = Math.random() * 0.65 + 0.6; // falling velocity
    this.vx = (Math.random() - 0.2) * 0.45; // slight horizontal drift
    this.baseAlpha = Math.random() * 0.35 + 0.5;

    // 3D tumbling rotation
    this.rotZ = Math.random() * Math.PI * 2;
    this.rotZSpeed = (Math.random() - 0.5) * 0.025;
    this.flipY = Math.random() * Math.PI * 2;
    this.flipYSpeed = Math.random() * 0.03 + 0.015;

    // Wind sway oscillation
    this.swayPhase = Math.random() * Math.PI * 2;
    this.swaySpeed = Math.random() * 0.025 + 0.015;
    this.swayAmp = Math.random() * 1.6 + 0.9;
  }

  update(speed) {
    const s = speed || 1;
    this.y += this.vy * s;
    this.swayPhase += this.swaySpeed * s;
    this.x += (this.vx + Math.sin(this.swayPhase) * this.swayAmp) * s;

    this.rotZ += this.rotZSpeed * s;
    this.flipY += this.flipYSpeed * s;

    applyTouchRepel(this, 105, 3.6);

    if (this.y > height + 30 || this.x < -40 || this.x > width + 40) {
      this.reset(false);
    }
  }

  draw(isDark, brightnessFactor) {
    const alpha = Math.min(1, this.baseAlpha * brightnessFactor);
    const scaleY = Math.sin(this.flipY); // 3D flip effect

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotZ);
    ctx.scale(1, scaleY);

    const petalColor = isDark
      ? `rgba(255, 185, 202, ${alpha * 0.88})`
      : `rgba(220, 105, 142, ${alpha * 0.8})`;
    const centerColor = isDark
      ? `rgba(255, 225, 235, ${alpha * 0.95})`
      : `rgba(245, 145, 175, ${alpha * 0.9})`;

    const w = this.size * this.aspect;
    const h = this.size;

    // Natural curved Sakura petal shape
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.5);
    ctx.bezierCurveTo(-w * 0.85, -h * 0.2, -w * 0.9, h * 0.35, 0, h * 0.5);
    ctx.bezierCurveTo(w * 0.9, h * 0.35, w * 0.85, -h * 0.2, 0, -h * 0.5);
    ctx.fillStyle = petalColor;
    ctx.fill();

    // Center delicate petal vein
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.35);
    ctx.quadraticCurveTo(-w * 0.08, 0, 0, h * 0.35);
    ctx.strokeStyle = centerColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  }
}

class RainDrop {
  constructor(initial = false) {
    this.reset(initial);
  }

  reset(initial = false) {
    this.x = Math.random() * (width + 120) - 60;
    this.y = initial ? Math.random() * height : -25 - Math.random() * 40;
    this.len = Math.random() * 16 + 14;
    this.vy = Math.random() * 6 + 12; // swift downpour velocity
    this.vx = -1.6; // slant angle
    this.alpha = Math.random() * 0.3 + 0.35;
    this.splashY = height - Math.random() * 50;
  }

  update(speed, onSplash) {
    const s = speed || 1;
    this.x += this.vx * s;
    this.y += this.vy * s;

    // Impact ripple trigger
    if (this.y >= this.splashY) {
      if (typeof onSplash === "function") {
        onSplash(this.x, this.splashY);
      }
      this.reset(false);
    }
  }

  draw(isDark, brightnessFactor) {
    const a = Math.min(1, this.alpha * brightnessFactor);
    const color = isDark
      ? `rgba(180, 220, 255, ${a * 0.85})`
      : `rgba(65, 115, 170, ${a * 0.75})`;

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.vx * (this.len / this.vy), this.y + this.len);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
}

class WaterRipple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 2;
    this.maxRadius = Math.random() * 16 + 10;
    this.alpha = 0.42;
    this.growSpeed = Math.random() * 0.7 + 0.5;
    this.dead = false;
  }

  update(speed) {
    const s = speed || 1;
    this.radius += this.growSpeed * s;
    this.alpha -= 0.016 * s;
    if (this.alpha <= 0 || this.radius >= this.maxRadius) {
      this.dead = true;
    }
  }

  draw(isDark, brightnessFactor) {
    if (this.dead || this.alpha <= 0) return;
    const a = Math.max(0, Math.min(1, this.alpha * brightnessFactor));
    const color = isDark
      ? `rgba(180, 220, 255, ${a * 0.85})`
      : `rgba(65, 115, 170, ${a * 0.75})`;

    ctx.beginPath();
    ctx.ellipse(
      this.x,
      this.y,
      this.radius,
      this.radius * 0.42,
      0,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
}

class SnowFlake {
  constructor(initial = false) {
    this.reset(initial);
  }

  reset(initial = false) {
    this.x = Math.random() * width;
    this.y = initial ? Math.random() * height : -15 - Math.random() * 30;
    this.radius = Math.random() * 2.8 + 1.2;
    this.vy = Math.random() * 0.65 + 0.45;
    this.vx = (Math.random() - 0.5) * 0.35;
    this.baseAlpha = Math.random() * 0.4 + 0.45;
    this.swayPhase = Math.random() * Math.PI * 2;
    this.swaySpeed = Math.random() * 0.02 + 0.01;
    this.swayAmp = Math.random() * 1.3 + 0.6;
  }

  update(speed) {
    const s = speed || 1;
    this.y += this.vy * s;
    this.swayPhase += this.swaySpeed * s;
    this.x += (this.vx + Math.sin(this.swayPhase) * this.swayAmp) * s;

    applyTouchRepel(this, 90, 3.2);

    if (this.y > height + 20 || this.x < -25 || this.x > width + 25) {
      this.reset(false);
    }
  }

  draw(isDark, brightnessFactor) {
    const alpha = Math.min(1, this.baseAlpha * brightnessFactor);
    const rgb = isDark ? "255, 255, 255" : "90, 125, 160";

    // Soft outer glow
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb}, ${alpha * 0.22})`;
    ctx.fill();

    // Crisp bright core
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb}, ${alpha * 0.9})`;
    ctx.fill();
  }
}

class Firefly {
  constructor(initial = false) {
    this.reset(initial);
  }

  reset(initial = false) {
    this.x = Math.random() * width;
    this.y = initial ? Math.random() * height : Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.55;
    this.vy = (Math.random() - 0.5) * 0.55;
    this.radius = Math.random() * 2.5 + 1.8;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderSpeed = Math.random() * 0.05 + 0.02;

    // Breathing pulse cycle
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = Math.random() * 0.035 + 0.015;
    this.baseAlpha = Math.random() * 0.4 + 0.5;
  }

  update(speed) {
    const s = speed || 1;
    // Organic wandering
    this.wanderAngle += (Math.random() - 0.5) * 0.25 * s;
    this.vx += Math.cos(this.wanderAngle) * 0.04 * s;
    this.vy += Math.sin(this.wanderAngle) * 0.04 * s;

    // Damping to keep speed pleasant
    const maxV = 1.1;
    const v = Math.hypot(this.vx, this.vy);
    if (v > maxV) {
      this.vx = (this.vx / v) * maxV;
      this.vy = (this.vy / v) * maxV;
    }

    this.x += this.vx * s;
    this.y += this.vy * s;
    this.pulsePhase += this.pulseSpeed * s;

    // Touch interaction: softly repel from touch
    applyTouchRepel(this, 100, 3.0);

    // Screen wrapping with margin
    const margin = 30;
    if (this.x < -margin) this.x = width + margin;
    if (this.x > width + margin) this.x = -margin;
    if (this.y < -margin) this.y = height + margin;
    if (this.y > height + margin) this.y = -margin;
  }

  draw(isDark, brightnessFactor) {
    // Pulsing alpha (breathing glow from 0.15 to 1.0)
    const pulse = Math.sin(this.pulsePhase);
    const alpha = Math.max(
      0.05,
      Math.min(1, (this.baseAlpha + pulse * 0.45) * brightnessFactor),
    );

    // Warm golden-amber-lime firefly glow
    const glowRGB = isDark ? "235, 245, 105" : "210, 155, 35";
    const coreRGB = isDark ? "255, 255, 220" : "255, 235, 160";

    const haloRadius = this.radius * (4.5 + pulse * 1.5);

    // Wide atmospheric halo
    const grad = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      haloRadius,
    );
    grad.addColorStop(0, `rgba(${glowRGB}, ${alpha * 0.85})`);
    grad.addColorStop(0.3, `rgba(${glowRGB}, ${alpha * 0.35})`);
    grad.addColorStop(1, `rgba(${glowRGB}, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, haloRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Intense bright incandescent core
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * (0.9 + pulse * 0.15), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${coreRGB}, ${alpha * 0.95})`;
    ctx.fill();
  }
}

// Pools
let starNodes = [];
let bubbles = [];
let ambientOrbs = [];
let sakuraPetals = [];
let rainDrops = [];
let waterRipples = [];
let snowFlakes = [];
let fireflies = [];

function spawnRainRipple(x, y) {
  if (waterRipples.length < 35) {
    waterRipples.push(new WaterRipple(x, y));
  }
}

function initElements() {
  starNodes = [];
  bubbles = [];
  ambientOrbs = [];
  sakuraPetals = [];
  rainDrops = [];
  waterRipples = [];
  snowFlakes = [];
  fireflies = [];

  // Optimal counts based on screen area to guarantee smooth 60fps
  const area = (width * height) / 10000;
  const starCount = Math.max(35, Math.min(65, Math.floor(area * 1.2)));
  const bubbleCount = Math.max(25, Math.min(45, Math.floor(area * 0.9)));
  const orbCount = Math.max(16, Math.min(28, Math.floor(area * 0.55)));
  const sakuraCount = Math.max(30, Math.min(55, Math.floor(area * 0.95)));
  const rainCount = Math.max(45, Math.min(75, Math.floor(area * 1.3)));
  const snowCount = Math.max(40, Math.min(70, Math.floor(area * 1.15)));
  const fireflyCount = Math.max(22, Math.min(38, Math.floor(area * 0.75)));

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
  } else if (currentShape === "sakura") {
    for (let i = 0; i < sakuraCount; i++) {
      sakuraPetals.push(new SakuraPetal(true));
    }
  } else if (currentShape === "rain") {
    for (let i = 0; i < rainCount; i++) {
      rainDrops.push(new RainDrop(true));
    }
  } else if (currentShape === "snow") {
    for (let i = 0; i < snowCount; i++) {
      snowFlakes.push(new SnowFlake(true));
    }
  } else if (currentShape === "fireflies") {
    for (let i = 0; i < fireflyCount; i++) {
      fireflies.push(new Firefly(true));
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
        Math.sin(x * layer.freq + globalTick * layer.speed * speedFactor) *
          layer.amp +
        Math.cos(
          x * layer.freq * 0.5 + globalTick * layer.speed * 0.7 * speedFactor,
        ) *
          (layer.amp * 0.5);

      ctx.lineTo(x, y);
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
      starNodes[i].update(speedFactor);
      starNodes[i].draw(colorRGB, brightnessFactor);
    }
  } else if (currentShape === "waves") {
    drawFlowingWaves(colorRGB, brightnessFactor);
  } else if (currentShape === "bubbles") {
    for (let i = 0; i < bubbles.length; i++) {
      bubbles[i].update(speedFactor);
      bubbles[i].draw(colorRGB, brightnessFactor);
    }
  } else if (currentShape === "particles") {
    for (let i = 0; i < ambientOrbs.length; i++) {
      ambientOrbs[i].update(speedFactor);
      ambientOrbs[i].draw(colorRGB, brightnessFactor);
    }
  } else if (currentShape === "sakura") {
    for (let i = 0; i < sakuraPetals.length; i++) {
      sakuraPetals[i].update(speedFactor);
      sakuraPetals[i].draw(isDark, brightnessFactor);
    }
  } else if (currentShape === "rain") {
    // Render ground/touch ripples
    for (let i = waterRipples.length - 1; i >= 0; i--) {
      waterRipples[i].update(speedFactor);
      waterRipples[i].draw(isDark, brightnessFactor);
      if (waterRipples[i].dead) {
        waterRipples.splice(i, 1);
      }
    }
    // Render falling raindrops
    for (let i = 0; i < rainDrops.length; i++) {
      rainDrops[i].update(speedFactor, (rx, ry) => spawnRainRipple(rx, ry));
      rainDrops[i].draw(isDark, brightnessFactor);
    }
  } else if (currentShape === "snow") {
    for (let i = 0; i < snowFlakes.length; i++) {
      snowFlakes[i].update(speedFactor);
      snowFlakes[i].draw(isDark, brightnessFactor);
    }
  } else if (currentShape === "fireflies") {
    for (let i = 0; i < fireflies.length; i++) {
      fireflies[i].update(speedFactor);
      fireflies[i].draw(isDark, brightnessFactor);
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

export function setAnimatedBgSpeed(value) {
  currentSpeed = Math.max(30, Math.min(200, parseInt(value, 10) || 100));
  speedFactor = currentSpeed / 100;
  localStorage.setItem("mori_bg_speed", currentSpeed.toString());
}

export function initBgAnimation() {
  canvas = document.getElementById("bgAnimationCanvas");
  if (!canvas) return;
  ctx = canvas.getContext("2d");

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Passive touch & pointer listeners for interactive live physics
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onPointerUp, { passive: true });
  window.addEventListener("pointerleave", onPointerUp, { passive: true });

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
  const speedSlider = document.getElementById("bgSpeedSlider");
  const speedValue = document.getElementById("bgSpeedValue");
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

  if (speedSlider) {
    speedSlider.value = currentSpeed;
    if (speedValue) speedValue.textContent = `${currentSpeed}%`;

    speedSlider.addEventListener("input", (e) => {
      const val = e.target.value;
      setAnimatedBgSpeed(val);
      if (speedValue) speedValue.textContent = `${val}%`;
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
