// gifEncoder.js — Minimal GIF89a writer. The caller quantizes frames to palette indices.

const MAX_CODE = 4096;

function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const out = [];
  let buffer = 0;
  let bufferBits = 0;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let table = new Map();

  const emit = (code) => {
    buffer |= code << bufferBits;
    bufferBits += codeSize;
    while (bufferBits >= 8) {
      out.push(buffer & 0xff);
      buffer >>= 8;
      bufferBits -= 8;
    }
  };

  emit(clearCode);

  if (indices.length === 0) {
    emit(eoiCode);
    if (bufferBits > 0) out.push(buffer & 0xff);
    return Uint8Array.from(out);
  }

  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const found = table.get(key);

    if (found !== undefined) {
      prefix = found;
      continue;
    }

    emit(prefix);

    if (nextCode === MAX_CODE) {
      // Clear code goes out at the current width; both sides reset after it.
      emit(clearCode);
      table = new Map();
      codeSize = minCodeSize + 1;
      nextCode = eoiCode + 1;
    } else {
      if (nextCode >= 1 << codeSize) codeSize++;
      table.set(key, nextCode++);
    }

    prefix = k;
  }

  emit(prefix);
  emit(eoiCode);
  if (bufferBits > 0) out.push(buffer & 0xff);
  return Uint8Array.from(out);
}

/**
 * Encodes indexed frames into a looping GIF.
 * @param {object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {Uint8Array[]} options.frames - one palette-index array per frame
 * @param {Array<[number, number, number]>} options.palette - up to 256 colours
 * @param {number} [options.delayMs] - per-frame delay
 * @param {number} [options.loop] - 0 loops forever
 * @returns {Blob}
 */
export function encodeGif({
  width,
  height,
  frames,
  palette,
  delayMs = 80,
  loop = 0,
}) {
  if (!width || !height) throw new Error("GIF width and height are required.");
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error("GIF needs at least one frame.");
  }

  const paletteBits = 8;
  const paletteSize = 1 << paletteBits;
  const bytes = [];
  const push16 = (value) => bytes.push(value & 0xff, (value >> 8) & 0xff);

  for (const char of "GIF89a") bytes.push(char.charCodeAt(0));
  push16(width);
  push16(height);
  bytes.push(0xf0 | (paletteBits - 1), 0, 0);

  for (let i = 0; i < paletteSize; i++) {
    const color = palette[i] || [0, 0, 0];
    bytes.push(color[0] & 0xff, color[1] & 0xff, color[2] & 0xff);
  }

  // Netscape application extension turns on infinite looping.
  bytes.push(0x21, 0xff, 0x0b);
  for (const char of "NETSCAPE2.0") bytes.push(char.charCodeAt(0));
  bytes.push(0x03, 0x01);
  push16(loop);
  bytes.push(0x00);

  const delay = Math.max(1, Math.round(delayMs / 10));

  for (const frame of frames) {
    if (frame.length !== width * height) {
      throw new Error("GIF frame size does not match the canvas.");
    }

    // Graphic control: keep the frame in place, delay, no transparency.
    bytes.push(0x21, 0xf9, 0x04, 0x04);
    push16(delay);
    bytes.push(0x00, 0x00);

    bytes.push(0x2c);
    push16(0);
    push16(0);
    push16(width);
    push16(height);
    bytes.push(0x00);

    bytes.push(paletteBits);

    const data = lzwEncode(frame, paletteBits);
    for (let offset = 0; offset < data.length; offset += 255) {
      const chunk = data.subarray(offset, offset + 255);
      bytes.push(chunk.length);
      for (let i = 0; i < chunk.length; i++) bytes.push(chunk[i]);
    }
    bytes.push(0x00);
  }

  bytes.push(0x3b);
  return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
}
