// audioExtractor.js — Video to Audio Extractor (Web Audio API -> Lossless 16-bit PCM WAV)
export function audioBufferToWav(audioBuffer, isStereo = true) {
  const numChannels = isStereo && audioBuffer.numberOfChannels >= 2 ? 2 : 1;
  const sampleRate = audioBuffer.sampleRate;

  let samples;
  if (numChannels === 2) {
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    samples = new Float32Array(left.length + right.length);
    let idx = 0;
    for (let i = 0; i < left.length; i++) {
      samples[idx++] = left[i];
      samples[idx++] = right[i];
    }
  } else {
    samples = audioBuffer.getChannelData(0);
  }

  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16 bits
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([wavBuffer], { type: "audio/wav" });
}

export async function extractAudioFromVideoFile(
  file,
  { channels = "stereo" } = {},
) {
  if (!file || !(file instanceof Blob || file instanceof File)) {
    throw new Error("Invalid video file provided.");
  }

  // Mobile WebView memory protection: prevent OOM crashes on huge videos
  const MAX_SAFE_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB limit
  if (file.size > MAX_SAFE_VIDEO_SIZE) {
    throw new Error(
      "Video file is too large for in-browser extraction (>200MB). Please select a smaller clip to prevent browser memory crash.",
    );
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    throw new Error("Web Audio API is not supported in this environment.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioCtx();

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const wavBlob = audioBufferToWav(audioBuffer, channels !== "mono");

    return {
      blob: wavBlob,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      originalSize: file.size,
      audioSize: wavBlob.size,
      format: "audio/wav",
      ext: "wav",
    };
  } catch (err) {
    if (err.message?.includes("too large")) throw err;
    throw new Error(
      "Could not extract audio track from this video file. It may be silent or use an unsupported audio codec.",
    );
  } finally {
    try {
      await audioCtx.close();
    } catch (_) {}
  }
}
