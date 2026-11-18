// bratGenerator.js — Renders brat-style covers and exports PNG or looping GIF.
import { encodeGif } from "./gifEncoder.js";

const DEFAULT_BACKGROUND = "#ffffff";
const TEXT_COLOR = "#000000";
const NARROW_STACK =
  '"Arial Narrow", "Liberation Sans Narrow", "Nimbus Sans Narrow", "Roboto Condensed", sans-serif';
const FONT_WEIGHT = 400;
const TEXT_MARGIN = 0.06;
const PNG_SIZE = 1080;
const GIF_SIZE = 720;
const GIF_STEP_MS = 220;
const GIF_HOLD_FRAMES = 8;
const RAMP_STEPS = 128;
const LINE_HEIGHT = 0.84;
const TRACKING = -0.05;
const NARROW_SQUEEZE = 0.86;
const MAX_LINES = 5;
const MAX_CHARS = 140;

let textLayer = null;
let hasNarrowFace = null;

function makeThumbnail(source) {
  const thumb = document.createElement("canvas");
  thumb.width = thumb.height = 160;
  const ctx = thumb.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, 160, 160);
  // PNG keeps the flat background sharp and stays under the 10k history thumbnail cap.
  return thumb.toDataURL("image/png");
}

function getTextLayer(size) {
  if (!textLayer) textLayer = document.createElement("canvas");
  if (textLayer.width !== size || textLayer.height !== size) {
    textLayer.width = size;
    textLayer.height = size;
  }
  return textLayer;
}

function normalizeColor(value) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(value ?? "").trim());
  return match ? `#${match[1].toLowerCase()}` : DEFAULT_BACKGROUND;
}

function colorToRgb(color) {
  const value = parseInt(color.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// Android and iOS ship no Arial Narrow, so squeeze the fallback to keep the condensed look.
function resolveSqueeze() {
  if (hasNarrowFace === null) {
    const probe = document.createElement("canvas").getContext("2d");
    if (!probe) {
      hasNarrowFace = false;
    } else {
      probe.font = `${FONT_WEIGHT} 48px ${NARROW_STACK}`;
      const narrowWidth = probe.measureText("abcdefghijklmnopqrstuvwxyz").width;
      probe.font = `${FONT_WEIGHT} 48px sans-serif`;
      const plainWidth = probe.measureText("abcdefghijklmnopqrstuvwxyz").width;
      hasNarrowFace = narrowWidth < plainWidth * 0.97;
    }
  }
  return hasNarrowFace ? 1 : NARROW_SQUEEZE;
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

function fitFontSize(ctx, lines, size, squeeze) {
  const maxWidth = size * (1 - TEXT_MARGIN * 2);
  const maxHeight = size * 0.78;
  let low = size * 0.04;
  let high = size * 0.9;

  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2;
    ctx.font = `${FONT_WEIGHT} ${mid}px ${NARROW_STACK}`;
    const tracking = mid * TRACKING;
    const widest = Math.max(
      ...lines.map((line) => measureLine(ctx, line, tracking) * squeeze),
    );
    const blockHeight = lines.length * mid * LINE_HEIGHT;
    if (widest <= maxWidth && blockHeight <= maxHeight) low = mid;
    else high = mid;
  }

  return low;
}

function layoutCover(ctx, text, size, { textScale = 1 } = {}) {
  const squeeze = resolveSqueeze();
  const lines = text.split("\n");
  const fontSize = fitFontSize(ctx, lines, size, squeeze) * textScale;
  const tracking = fontSize * TRACKING;

  ctx.font = `${FONT_WEIGHT} ${fontSize}px ${NARROW_STACK}`;

  const lineStep = fontSize * LINE_HEIGHT;
  const blockTop = (size - lines.length * lineStep) / 2;
  const words = [];

  lines.forEach((line, lineIndex) => {
    const baseline = blockTop + lineStep * lineIndex + fontSize * 0.78;
    let cursor = size * TEXT_MARGIN;
    let word = null;

    for (const char of line) {
      if (char === " ") {
        if (word) words.push(word);
        word = null;
        cursor += (ctx.measureText(" ").width + tracking) * squeeze;
        continue;
      }
      if (!word) word = { text: "", x: cursor, baseline };
      word.text += char;
      cursor += (ctx.measureText(char).width + tracking) * squeeze;
    }

    if (word) words.push(word);
  });

  return { fontSize, tracking, squeeze, words };
}

function drawWords(ctx, layout, { reveal = Infinity } = {}) {
  ctx.font = `${FONT_WEIGHT} ${layout.fontSize}px ${NARROW_STACK}`;
  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  layout.words.forEach((word, index) => {
    if (index >= reveal) return;
    let x = word.x;
    for (const char of word.text) {
      ctx.fillText(char, x, word.baseline);
      x += (ctx.measureText(char).width + layout.tracking) * layout.squeeze;
    }
  });
}

/**
 * Draws one cover into a context. Soft letter edges come from rendering the
 * text small and scaling it up, which avoids relying on ctx.filter across WebViews.
 */
export function renderBratFrame(
  ctx,
  rawText,
  {
    size = PNG_SIZE,
    blur = 2,
    textScale = 1,
    background = DEFAULT_BACKGROUND,
    reveal = Infinity,
  } = {},
) {
  const text = normalizeBratText(rawText);
  const detail = 1 / (1 + Math.max(0, blur) * 0.4);
  const layerSize = Math.max(96, Math.round(size * Math.min(1, detail)));
  const layer = getTextLayer(layerSize);
  const layerCtx = layer.getContext("2d");

  layerCtx.setTransform(1, 0, 0, 1, 0, 0);
  layerCtx.clearRect(0, 0, layerSize, layerSize);
  const layout = layoutCover(layerCtx, text, layerSize, { textScale });
  drawWords(layerCtx, layout, { reveal });

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = normalizeColor(background);
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(layer, 0, 0, size, size);

  return text;
}

export function createBratPng(rawText, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PNG_SIZE;
  const ctx = canvas.getContext("2d");
  const text = renderBratFrame(ctx, rawText, {
    ...options,
    size: PNG_SIZE,
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

// Every pixel is a blend of the text and background colours, so the ramp follows that line.
function buildRampPalette(textRgb, backgroundRgb) {
  const palette = [];
  for (let i = 0; i < RAMP_STEPS; i++) {
    const t = i / (RAMP_STEPS - 1);
    palette.push([
      Math.round(textRgb[0] + (backgroundRgb[0] - textRgb[0]) * t),
      Math.round(textRgb[1] + (backgroundRgb[1] - textRgb[1]) * t),
      Math.round(textRgb[2] + (backgroundRgb[2] - textRgb[2]) * t),
    ]);
  }
  while (palette.length < 256) palette.push([...backgroundRgb]);
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

function buildRevealSteps(wordCount) {
  const steps = [];
  for (let revealed = 1; revealed <= wordCount; revealed++) {
    steps.push({ reveal: revealed });
  }
  for (let i = 0; i < GIF_HOLD_FRAMES; i++) steps.push({ reveal: wordCount });
  return steps;
}

export async function createBratGif(rawText, options = {}, onProgress) {
  const text = normalizeBratText(rawText);
  const background = normalizeColor(options.background);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GIF_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const palette = buildRampPalette(colorToRgb(TEXT_COLOR), colorToRgb(background));
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const steps = buildRevealSteps(wordCount);
  const frames = [];

  for (let i = 0; i < steps.length; i++) {
    renderBratFrame(ctx, text, {
      ...options,
      background,
      size: GIF_SIZE,
      blur: Math.max(0, Number(options.blur ?? 2)),
      ...steps[i],
    });

    const { data } = ctx.getImageData(0, 0, GIF_SIZE, GIF_SIZE);
    frames.push(indexPixels(data, palette));

    if (onProgress) onProgress(i + 1, steps.length);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const blob = encodeGif({
    width: GIF_SIZE,
    height: GIF_SIZE,
    frames,
    palette,
    delayMs: GIF_STEP_MS,
  });

  return {
    blob,
    width: GIF_SIZE,
    height: GIF_SIZE,
    frames: frames.length,
    words: wordCount,
    text,
    previewUrl: makeThumbnail(canvas),
  };
}
