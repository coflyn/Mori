// fpsConverter.js — Video Frame Rate (FPS) Converter via WebCodecs / MediaStream Canvas Recording
// Re-samples and re-encodes video frames at target FPS with hardware acceleration

const MAX_SAFE_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB limit to prevent WebView OOM

/**
 * Returns best supported video recording MIME type on current device/browser.
 * @returns {string} Supported MIME type (e.g. 'video/mp4', 'video/webm')
 */
export function getSupportedVideoMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

/**
 * Injects accurate duration metadata into MP4 (ISOBMFF) header boxes (mvhd, tkhd, mdhd).
 * Chrome's MediaRecorder produces fragmented MP4 (fmp4) with duration=1000 (1 sec) or 0 in mvhd,
 * which causes Android Gallery, MediaStore, and media players to display 00:01 instead of real duration.
 *
 * @param {Blob} blob - Source MP4 blob
 * @param {number} durationSec - Exact duration in seconds
 * @returns {Promise<Blob>} Patched MP4 blob with accurate duration
 */
export async function patchMp4Duration(blob, durationSec) {
  if (!blob || !blob.type || !blob.type.includes("mp4") || durationSec <= 0) {
    return blob;
  }
  try {
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    let movieTimescale = 1000;

    function findAndPatchBoxes(offset, endOffset) {
      while (offset < endOffset - 8) {
        const boxSize = view.getUint32(offset);
        if (boxSize < 8 || offset + boxSize > endOffset) break;

        const boxType = String.fromCharCode(
          view.getUint8(offset + 4),
          view.getUint8(offset + 5),
          view.getUint8(offset + 6),
          view.getUint8(offset + 7),
        );

        const payloadOffset = offset + 8;
        const boxEnd = offset + boxSize;

        if (boxType === "moov" || boxType === "trak" || boxType === "mdia") {
          findAndPatchBoxes(payloadOffset, boxEnd);
        } else if (boxType === "mvhd") {
          const version = view.getUint8(payloadOffset);
          if (version === 0) {
            movieTimescale = view.getUint32(payloadOffset + 12);
            const durVal = Math.round(durationSec * movieTimescale);
            view.setUint32(payloadOffset + 16, durVal);
          } else if (version === 1) {
            movieTimescale = view.getUint32(payloadOffset + 20);
            const durVal = BigInt(Math.round(durationSec * movieTimescale));
            view.setBigUint64(payloadOffset + 24, durVal);
          }
        } else if (boxType === "tkhd") {
          const version = view.getUint8(payloadOffset);
          if (version === 0) {
            const durVal = Math.round(durationSec * movieTimescale);
            view.setUint32(payloadOffset + 20, durVal);
          } else if (version === 1) {
            const durVal = BigInt(Math.round(durationSec * movieTimescale));
            view.setBigUint64(payloadOffset + 28, durVal);
          }
        } else if (boxType === "mdhd") {
          const version = view.getUint8(payloadOffset);
          if (version === 0) {
            const mediaTimescale = view.getUint32(payloadOffset + 12);
            const durVal = Math.round(durationSec * mediaTimescale);
            view.setUint32(payloadOffset + 16, durVal);
          } else if (version === 1) {
            const mediaTimescale = view.getUint32(payloadOffset + 20);
            const durVal = BigInt(Math.round(durationSec * mediaTimescale));
            view.setBigUint64(payloadOffset + 24, durVal);
          }
        }

        offset = boxEnd;
      }
    }

    findAndPatchBoxes(0, buffer.byteLength);
    return new Blob([buffer], { type: blob.type });
  } catch (err) {
    console.warn("Could not patch MP4 duration:", err);
    return blob;
  }
}

/**
 * Patches duration metadata in either WebM or MP4 blobs.
 * @param {Blob} blob
 * @param {number} durationSec
 * @returns {Promise<Blob>}
 */
export async function patchMediaDuration(blob, durationSec) {
  if (!blob || durationSec <= 0) return blob;
  if (blob.type.includes("mp4")) {
    return patchMp4Duration(blob, durationSec);
  }
  if (blob.type.includes("webm")) {
    return injectWebmDuration(blob, durationSec);
  }
  return blob;
}

/**
 * Injects accurate duration metadata into WebM EBML header.
 * MediaRecorder produces WebM without Duration in Info header, causing media players
 * and Android/Windows to report inaccurate or unknown duration.
 *
 * @param {Blob} blob - Source WebM blob
 * @param {number} durationSec - Exact duration in seconds
 * @returns {Promise<Blob>} Patched WebM blob with duration
 */
export async function injectWebmDuration(blob, durationSec) {
  if (!blob || !blob.type || !blob.type.includes("webm") || durationSec <= 0) {
    return blob;
  }
  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const durationMs = durationSec * 1000;

    // Search for Info element ID: 0x15, 0x49, 0xA9, 0x66
    let infoPos = -1;
    const limit = Math.min(bytes.length - 4, 8192);
    for (let i = 0; i < limit; i++) {
      if (
        bytes[i] === 0x15 &&
        bytes[i + 1] === 0x49 &&
        bytes[i + 2] === 0xa9 &&
        bytes[i + 3] === 0x66
      ) {
        infoPos = i;
        break;
      }
    }
    if (infoPos === -1) return blob;

    const offsetAfterId = infoPos + 4;
    const firstByte = bytes[offsetAfterId];
    let vintLen = 1;
    let mask = 0x80;
    while (!(firstByte & mask) && vintLen <= 8) {
      mask >>= 1;
      vintLen++;
    }
    if (vintLen > 8) return blob;

    let infoDataLen = firstByte & (mask - 1);
    for (let i = 1; i < vintLen; i++) {
      infoDataLen = (infoDataLen << 8) | bytes[offsetAfterId + i];
    }

    const infoDataStart = offsetAfterId + vintLen;
    const infoDataEnd = infoDataStart + infoDataLen;

    // Check if Duration (0x44, 0x89) already exists in Info block
    let durationPos = -1;
    for (let i = infoDataStart; i < infoDataEnd - 2; i++) {
      if (bytes[i] === 0x44 && bytes[i + 1] === 0x89) {
        durationPos = i;
        break;
      }
    }

    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, durationMs, false); // Big-endian Float32
    const durBytes = new Uint8Array(view.buffer);

    if (durationPos !== -1) {
      const durLenByte = bytes[durationPos + 2];
      if (durLenByte === 0x84) {
        bytes.set(durBytes, durationPos + 3);
        return new Blob([bytes], { type: blob.type });
      } else if (durLenByte === 0x88) {
        const view64 = new DataView(new ArrayBuffer(8));
        view64.setFloat64(0, durationMs, false);
        bytes.set(new Uint8Array(view64.buffer), durationPos + 3);
        return new Blob([bytes], { type: blob.type });
      }
    }

    // Duration element does not exist. Insert [0x44, 0x89, 0x84, d0, d1, d2, d3] (7 bytes)
    const durElem = new Uint8Array([0x44, 0x89, 0x84, ...durBytes]);
    const newBuffer = new Uint8Array(bytes.length + durElem.length);

    newBuffer.set(bytes.subarray(0, infoDataStart), 0);
    newBuffer.set(durElem, infoDataStart);
    newBuffer.set(bytes.subarray(infoDataStart), infoDataStart + durElem.length);

    // Update Info length VINT
    const newInfoDataLen = infoDataLen + durElem.length;
    if (vintLen === 1 && newInfoDataLen < 128) {
      newBuffer[offsetAfterId] = 0x80 | newInfoDataLen;
    } else if (vintLen === 2) {
      newBuffer[offsetAfterId] = 0x40 | (newInfoDataLen >> 8);
      newBuffer[offsetAfterId + 1] = newInfoDataLen & 0xff;
    }

    return new Blob([newBuffer], { type: blob.type });
  } catch (err) {
    console.warn("Could not patch WebM duration:", err);
    return blob;
  }
}

/**
 * Reads video duration, dimensions, and metadata.
 * @param {Blob|File} file
 * @returns {Promise<{duration: number, width: number, height: number, size: number}>}
 */
export async function getVideoInfo(file) {
  if (!file || !(file instanceof Blob || file instanceof File)) {
    throw new Error("Invalid video file provided.");
  }
  if (typeof document === "undefined") {
    return { duration: 0, width: 0, height: 0, size: file.size };
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration || 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        size: file.size,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not parse video metadata. Format may be unsupported."));
    };
  });
}

/**
 * Converts a video file to a target frame rate (FPS).
 * Uses Canvas captureStream with exact target FPS + MediaRecorder for hardware-accelerated encoding.
 * 
 * @param {Blob|File} file - Source video file
 * @param {object} options
 * @param {number} [options.targetFps=30] - Target frame rate (15, 24, 30, 60)
 * @param {function} [options.onProgress] - Callback returning percent (0-100)
 * @param {AbortSignal} [options.signal] - Abort signal to cancel conversion
 * @returns {Promise<object>} Converted video blob and metadata
 */
export async function convertVideoFps(
  file,
  { targetFps = 30, onProgress = null, signal = null } = {},
) {
  if (!file || !(file instanceof Blob || file instanceof File)) {
    throw new Error("Invalid video file provided.");
  }

  if (file.size > MAX_SAFE_VIDEO_SIZE) {
    throw new Error(
      "Video file is too large for in-browser conversion (>200MB). Please select a smaller clip to prevent memory crash.",
    );
  }

  const validFps = parseInt(targetFps, 10);
  if (isNaN(validFps) || validFps < 1 || validFps > 120) {
    throw new Error("Target FPS must be an integer between 1 and 120.");
  }

  if (typeof document === "undefined") {
    throw new Error("convertVideoFps requires a DOM environment.");
  }

  const mimeType = getSupportedVideoMime();
  if (!mimeType) {
    throw new Error("MediaRecorder is not supported or no compatible video format available.");
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error("Conversion cancelled."));
    }

    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = false; // Need audio track accessible
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;

    let isTerminated = false;
    let isStopped = false;
    let audioCtx = null;
    let recorder = null;
    let animFrameId = null;
    let renderIntervalId = null;

    const cleanup = () => {
      isTerminated = true;
      isStopped = true;
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (renderIntervalId) {
        clearInterval(renderIntervalId);
        renderIntervalId = null;
      }
      try { video.pause(); } catch (_) {}
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(videoUrl);
      if (audioCtx) {
        try { audioCtx.close(); } catch (_) {}
        audioCtx = null;
      }
    };

    if (signal) {
      signal.addEventListener("abort", () => {
        cleanup();
        try { if (recorder && recorder.state !== "inactive") recorder.stop(); } catch (_) {}
        reject(new Error("Conversion cancelled."));
      });
    }

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video. Codec or container may be unsupported."));
    };

    video.onloadedmetadata = async () => {
      try {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const duration = video.duration || 1;

        if (!width || !height) {
          cleanup();
          return reject(new Error("Invalid video dimensions."));
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          cleanup();
          return reject(new Error("Could not initialize 2D canvas context."));
        }

        // Draw initial frame
        ctx.drawImage(video, 0, 0, width, height);

        // Capture canvas stream at exact target FPS
        const stream = canvas.captureStream(validFps);
        const videoTrack = stream.getVideoTracks()?.[0];

        // Capture audio track via Web Audio API without playing through speakers
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          try {
            audioCtx = new AudioCtx();
            const source = audioCtx.createMediaElementSource(video);
            const dest = audioCtx.createMediaStreamDestination();
            source.connect(dest);
            // Connect to dest stream only, not audioCtx.destination (silent rendering)
            const audioTracks = dest.stream.getAudioTracks();
            if (audioTracks && audioTracks.length > 0) {
              stream.addTrack(audioTracks[0]);
            }
          } catch (audioErr) {
            console.warn("Audio extraction skipped or video is silent:", audioErr);
          }
        }

        // Configure video bitrate scaled by resolution & target FPS
        const pixels = width * height;
        const targetBitrate = Math.min(
          12_000_000,
          Math.max(1_500_000, Math.round(pixels * validFps * 0.12)),
        );

        const recorderOptions = {
          mimeType,
          videoBitsPerSecond: targetBitrate,
        };

        recorder = new MediaRecorder(stream, recorderOptions);
        const chunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onerror = (err) => {
          cleanup();
          reject(err);
        };

        recorder.onstop = async () => {
          cleanup();
          if (chunks.length === 0) {
            return reject(new Error("No video data recorded."));
          }

          let resultBlob = new Blob(chunks, { type: mimeType });
          if (duration > 0) {
            resultBlob = await patchMediaDuration(resultBlob, duration);
          }
          const isMp4 = mimeType.includes("mp4");
          const ext = isMp4 ? "mp4" : "webm";

          resolve({
            blob: resultBlob,
            fps: validFps,
            duration,
            width,
            height,
            originalSize: file.size,
            convertedSize: resultBlob.size,
            format: mimeType,
            ext,
          });
        };

        // Frame rendering loop paced at target FPS
        const frameInterval = 1000 / validFps;
        let lastFrameTime = 0;

        const renderFrame = (now = performance.now()) => {
          if (isTerminated || isStopped) return;

          const delta = now - lastFrameTime;
          if (!lastFrameTime || delta >= frameInterval - 1.5) {
            ctx.drawImage(video, 0, 0, width, height);
            lastFrameTime = now;
          }

          if (onProgress && duration > 0) {
            const pct = Math.min(99, Math.round((video.currentTime / duration) * 100));
            onProgress(pct);
          }

          if (video.currentTime >= duration) {
            stopRecording();
          }
        };

        const rafLoop = (now) => {
          if (isTerminated || isStopped) return;
          renderFrame(now);
          animFrameId = requestAnimationFrame(rafLoop);
        };

        const stopRecording = () => {
          if (isStopped) return;
          isStopped = true;

          if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
          }
          if (renderIntervalId) {
            clearInterval(renderIntervalId);
            renderIntervalId = null;
          }

          try { video.pause(); } catch (_) {}

          if (recorder && recorder.state !== "inactive") {
            try { recorder.stop(); } catch (_) {}
          }
        };

        video.onended = () => {
          if (onProgress) onProgress(100);
          stopRecording();
        };

        // Start playback and begin recording once playback starts
        video.currentTime = 0;

        const startRecording = () => {
          if (recorder && recorder.state === "inactive" && !isStopped && !isTerminated) {
            recorder.start(100);
            if (validFps > 60) {
              renderIntervalId = setInterval(() => {
                renderFrame(performance.now());
              }, frameInterval);
            } else {
              animFrameId = requestAnimationFrame(rafLoop);
            }
          }
        };

        video.addEventListener("playing", startRecording, { once: true });
        await video.play();
        startRecording(); // Fallback if playing event resolved synchronously
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
  });
}

