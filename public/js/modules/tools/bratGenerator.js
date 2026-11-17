// bratGenerator.js — Renders brat-style covers and exports PNG or looping GIF.
import { encodeGif } from "./gifEncoder.js";

const LIME = "#8ACE00";
const LIME_RGB = [138, 206, 0];
const FONT_STACK =
  '"Arial Narrow", Arial, "Helvetica Neue", Helvetica, sans-serif';
const PNG_SIZE = 1080;
const GIF_SIZE = 720;
const GIF_FRAME_COUNT = 12;
const GIF_FRAME_MS = 80;
const RAMP_STEPS = 64;
const LINE_HEIGHT = 0.86;
const MAX_LINES = 5;
const MAX_CHARS = 140;

let scratchCanvas = null;

function makeThumbnail(source) {
  const thumb = document.createElement("canvas");
  thumb.width = thumb.height = 160;
  const ctx = thumb.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, 160, 160);
  // PNG keeps the flat lime sharp and stays under the 10k history thumbnail cap.
  return thumb.toDataURL("image/png");
}

function getScratch(size) {
  if (!scratchCanvas) scratchCanvas = document.createElement("canvas");
  if (scratchCanvas.width !== size || scratchCanvas.height !== size) {
    scratchCanvas.width = size;
    scratchCanvas.height = size;
  }
  return scratchCanvas;
}

export function normalizeBratText(raw) {
  const rows = String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .toLowerCase()
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim());

  while (rows.length && !rows[0]) rows.shift();
  while (rows.length && !rows[rows.length - 1]) rows.pop();

  const lines = [];
  for (const row of rows) {
    if (!row && lines[lines.length - 1] === "") continue;
    lines.push(row);
  }

  const text = lines.slice(0, MAX_LINES).join("\n").slice(0, MAX_CHARS).trim();
  return text || "brat";
}

// Canvas kerning is unreliable at this weight, so glyphs are placed by hand.
function measureLine(ctx, text, tracking) {
  let width = 0;
  for (const char of text) width += ctx.measureText(char).width + tracking;
  return Math.max(0, width - tracking);
}

function fitFontSize(ctx, lines, size) {
  const maxWidth = size * 0.88;
  const maxHeight = size * 0.78;
  let low = size * 0.04;
  let high = size * 0.9;

  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2;
    ctx.font = `700 ${mid}px ${FONT_STACK}`;
    const tracking = mid * -0.035;
    const widest = Math.max(...lines.map((line) => measureLine(ctx, line, tracking)));
    const blockHeight = lines.length * mid * LINE_HEIGHT;
    if (widest <= maxWidth && blockHeight <= maxHeight) low = mid;
    else high = mid;
  }

  return low;
}

function drawCover(ctx, text, size, { textScale = 1, phase = null } = {}) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = LIME;
  ctx.fillRect(0, 0, size, size);

  const lines = text.split("\n");
  const fontSize = fitFontSize(ctx, lines, size) * textScale;
  const tracking = fontSize * -0.035;

  ctx.font = `700 ${fontSize}px ${FONT_STACK}`;
  ctx.fillStyle = "#000000";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const widths = lines.map((line) => measureLine(ctx, line, tracking));
  const lineStep = fontSize * LINE_HEIGHT;
  const blockTop = (size - lines.length * lineStep) / 2;

  if (phase !== null) {
    const driftX = Math.sin(phase) * size * 0.006;
    const driftY = Math.sin(phase * 2 + 0.7) * size * 0.008;
    const breathe = 1 + Math.sin(phase * 1.5 + 0.4) * 0.014;
    ctx.translate(size / 2 + driftX, size / 2 + driftY);
    ctx.scale(breathe, breathe);
    ctx.translate(-size / 2, -size / 2);
  }

  lines.forEach((line, index) => {
    let x = (size - widths[index]) / 2;
    const baseline = blockTop + lineStep * index + fontSize * 0.78;
    for (const char of line) {
      ctx.fillText(char, x, baseline);
      x += ctx.measureText(char).width + tracking;
    }
  });

  ctx.restore();
}

/**
 * Draws one cover into a context. Soft focus comes from rendering small and
 * scaling up, which avoids relying on ctx.filter across WebViews.
 */
export function renderBratFrame(
  ctx,
  rawText,
  { size = PNG_SIZE, blur = 2, textScale = 1, phase = null } = {},
) {
  const text = normalizeBratText(rawText);
  const detail = 1 / (1 + Math.max(0, blur) * 0.4);
  const scratchSize = Math.max(96, Math.round(size * Math.min(1, detail)));
  const offscreen = getScratch(scratchSize);
  const offCtx = offscreen.getContext("2d");

  drawCover(offCtx, text, scratchSize, { textScale, phase });

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(offscreen, 0, 0, size, size);

  return text;
}

export function createBratPng(rawText, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PNG_SIZE;
  const ctx = canvas.getContext("2d");
  const text = renderBratFrame(ctx, rawText, {
    ...options,
    size: PNG_SIZE,
    phase: null,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG export failed."));
        return;
      }
      resolve({
        blob,
        width: PNG_SIZE,
        height: PNG_SIZE,
        text,
        previewUrl: makeThumbnail(canvas),
      });
    }, "image/png");
  });
}

// Every pixel is black blended into lime, so a 64-step ramp covers the art.
function buildRampPalette() {
  const palette = [];
  for (let i = 0; i < RAMP_STEPS; i++) {
    const t = i / (RAMP_STEPS - 1);
    palette.push([
      Math.round(LIME_RGB[0] * t),
      Math.round(LIME_RGB[1] * t),
      Math.round(LIME_RGB[2] * t),
    ]);
  }
  while (palette.length < 256) palette.push([...LIME_RGB]);
  return palette;
}

function indexPixels(data, palette) {
  const pixelCount = data.length / 4;
  const indices = new Uint8Array(pixelCount);
  const cache = new Map();

  for (let i = 0, offset = 0; i < pixelCount; i++, offset += 4) {
    const key = (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
    let index = cache.get(key);

    if (index === undefined) {
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      let best = 0;
      let bestDistance = Infinity;

      for (let p = 0; p < RAMP_STEPS; p++) {
        const color = palette[p];
        const dr = r - color[0];
        const dg = g - color[1];
        const db = b - color[2];
        const distance = dr * dr + dg * dg + db * db;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = p;
        }
        if (distance === 0) break;
      }

      index = best;
      cache.set(key, index);
    }

    indices[i] = index;
  }

  return indices;
}

export async function createBratGif(rawText, options = {}, onProgress) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GIF_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const palette = buildRampPalette();
  const frames = [];
  const baseBlur = Math.max(0, Number(options.blur ?? 2));
  let text = "brat";

  for (let i = 0; i < GIF_FRAME_COUNT; i++) {
    const phase = (i / GIF_FRAME_COUNT) * Math.PI * 2;
    text = renderBratFrame(ctx, rawText, {
      textScale: options.textScale ?? 1,
      size: GIF_SIZE,
      phase,
      blur: Math.max(0, baseBlur + Math.sin(phase) * 0.5),
    });

    const { data } = ctx.getImageData(0, 0, GIF_SIZE, GIF_SIZE);
    frames.push(indexPixels(data, palette));

    if (onProgress) onProgress(i + 1, GIF_FRAME_COUNT);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const blob = encodeGif({
    width: GIF_SIZE,
    height: GIF_SIZE,
    frames,
    palette,
    delayMs: GIF_FRAME_MS,
  });

  return {
    blob,
    width: GIF_SIZE,
    height: GIF_SIZE,
    frames: GIF_FRAME_COUNT,
    text,
    previewUrl: makeThumbnail(canvas),
  };
}
