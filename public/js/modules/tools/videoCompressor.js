// videoCompressor.js — In-Browser Video Compressor via Hardware-Accelerated Canvas & MediaRecorder
// Downscales resolution and regulates video bitrate client-side with zero external dependencies

import { patchMediaDuration, getSupportedVideoMime, getVideoInfo } from "./fpsConverter.js";

const MAX_SAFE_VIDEO_SIZE = 250 * 1024 * 1024; // 250MB limit to prevent WebView OOM

export { getVideoInfo };

/**
 * Calculates estimated compressed file size based on duration, scale, and target bitrate.
 * @param {number} originalSizeBytes
 * @param {number} durationSec
 * @param {string} level - 'low' | 'medium' | 'high' | 'custom'
 * @param {object} [customOpts] - Custom options if level === 'custom'
 * @returns {{estimatedBytes: number, percentReduction: number, widthScale: number, targetBitrate: number}}
 */
export function estimateCompressedSize(
  originalSizeBytes,
  durationSec,
  level = "medium",
  customOpts = {},
) {
  const dur = Math.max(1, durationSec || 1);
  let scale = 0.75;
  let targetBitrate = 2_200_000; // 2.2 Mbps
  let audioBitrate = 128_000;

  if (level === "low") {
    scale = 1.0;
    targetBitrate = 4_000_000; // 4 Mbps
  } else if (level === "medium") {
    scale = 0.75;
    targetBitrate = 2_200_000; // 2.2 Mbps
  } else if (level === "high") {
    scale = 0.5;
    targetBitrate = 1_100_000; // 1.1 Mbps
  } else if (level === "custom") {
    scale = customOpts.scale || 0.75;
    targetBitrate = customOpts.bitrate || 2_000_000;
    if (customOpts.muteAudio) audioBitrate = 0;
  }

  if (customOpts.muteAudio) {
    audioBitrate = 0;
  }

  const totalBitsPerSec = targetBitrate + audioBitrate;
  const estimatedBytes = Math.round((totalBitsPerSec * dur) / 8);
  const clampedBytes = Math.min(originalSizeBytes, Math.max(50_000, estimatedBytes));
  const percentReduction = Math.max(
    5,
    Math.round(((originalSizeBytes - clampedBytes) / originalSizeBytes) * 100),
  );

  return {
    estimatedBytes: clampedBytes,
    percentReduction,
    widthScale: scale,
    targetBitrate,
  };
}

/**
 * Compresses a video file by downscaling dimensions and restricting bitrate.
 * 
 * @param {Blob|File} file - Source video
 * @param {object} options
 * @param {string} [options.level='medium'] - 'low' | 'medium' | 'high' | 'custom'
 * @param {number} [options.scale=0.75] - Dimension scale (0.25 to 1.0)
 * @param {number} [options.targetBitrate] - Custom video bitrate in bps
 * @param {boolean} [options.muteAudio=false] - Whether to strip audio track
 * @param {function} [options.onProgress] - Callback returning percentage (0-100)
 * @param {AbortSignal} [options.signal] - Abort signal
 * @returns {Promise<object>} Compression result with blob and stats
 */
export async function compressVideo(
  file,
  {
    level = "medium",
    scale = 0.75,
    targetBitrate = null,
    muteAudio = false,
    onProgress = null,
    signal = null,
  } = {},
) {
  if (!file || !(file instanceof Blob || file instanceof File)) {
    throw new Error("Invalid video file provided.");
  }

  if (file.size > MAX_SAFE_VIDEO_SIZE) {
    throw new Error("Video file is too large for in-browser compression (>250MB).");
  }

  if (typeof document === "undefined") {
    throw new Error("compressVideo requires a DOM environment.");
  }

  const mimeType = getSupportedVideoMime();
  if (!mimeType) {
    throw new Error("MediaRecorder is not supported or no compatible video format available.");
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error("Compression cancelled."));
    }

    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = false;
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;

    let isTerminated = false;
    let isStopped = false;
    let audioCtx = null;
    let recorder = null;
    let animFrameId = null;

    const cleanup = () => {
      isTerminated = true;
      isStopped = true;
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
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
        reject(new Error("Compression cancelled."));
      });
    }

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video. Format or codec may be unsupported."));
    };

    video.onloadedmetadata = async () => {
      try {
        const origWidth = video.videoWidth;
        const origHeight = video.videoHeight;
        const duration = video.duration || 1;

        if (!origWidth || !origHeight) {
          cleanup();
          return reject(new Error("Invalid video dimensions."));
        }

        // Determine effective scale and bitrate
        let effectiveScale = scale;
        let effectiveBitrate = targetBitrate;

        if (level === "low") {
          effectiveScale = 1.0;
          effectiveBitrate = 4_000_000;
        } else if (level === "medium") {
          effectiveScale = 0.75;
          effectiveBitrate = 2_200_000;
        } else if (level === "high") {
          effectiveScale = 0.5;
          effectiveBitrate = 1_100_000;
        }

        effectiveScale = Math.max(0.25, Math.min(1.0, effectiveScale || 0.75));

        // Ensure dimensions are even numbers (required by video codecs like H.264 / VP8)
        let targetWidth = Math.round((origWidth * effectiveScale) / 2) * 2;
        let targetHeight = Math.round((origHeight * effectiveScale) / 2) * 2;
        targetWidth = Math.max(160, targetWidth);
        targetHeight = Math.max(120, targetHeight);

        const pixels = targetWidth * targetHeight;
        const finalBitrate = effectiveBitrate || Math.min(
          6_000_000,
          Math.max(800_000, Math.round(pixels * 30 * 0.06)),
        );

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          cleanup();
          return reject(new Error("Could not initialize 2D canvas context."));
        }

        // Initial paint
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        // Capture canvas stream capped at 30 FPS for standard compression efficiency
        const targetFps = 30;
        const stream = canvas.captureStream(targetFps);

        // Process Audio Track unless muteAudio requested
        if (!muteAudio) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) {
            try {
              audioCtx = new AudioCtx();
              const source = audioCtx.createMediaElementSource(video);
              const dest = audioCtx.createMediaStreamDestination();
              source.connect(dest);
              const audioTracks = dest.stream.getAudioTracks();
              if (audioTracks && audioTracks.length > 0) {
                stream.addTrack(audioTracks[0]);
              }
            } catch (audioErr) {
              console.warn("Audio extraction skipped or video is silent:", audioErr);
            }
          }
        }

        const recorderOptions = {
          mimeType,
          videoBitsPerSecond: finalBitrate,
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
            return reject(new Error("No compressed video data recorded."));
          }

          let resultBlob = new Blob(chunks, { type: mimeType });
          if (duration > 0) {
            resultBlob = await patchMediaDuration(resultBlob, duration);
          }

          const isMp4 = mimeType.includes("mp4");
          const ext = isMp4 ? "mp4" : "webm";
          const savedBytes = Math.max(0, file.size - resultBlob.size);
          const percentSaved = Math.max(
            0,
            Math.round((savedBytes / file.size) * 100),
          );

          resolve({
            blob: resultBlob,
            originalSize: file.size,
            compressedSize: resultBlob.size,
            savedBytes,
            percentSaved,
            width: targetWidth,
            height: targetHeight,
            duration,
            format: mimeType,
            ext,
          });
        };

        // Frame rendering loop paced at targetFps
        const frameInterval = 1000 / targetFps;
        let lastFrameTime = 0;

        const renderFrame = (now = performance.now()) => {
          if (isTerminated || isStopped) return;

          const delta = now - lastFrameTime;
          if (!lastFrameTime || delta >= frameInterval - 1.5) {
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
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
          try { video.pause(); } catch (_) {}
          if (recorder && recorder.state !== "inactive") {
            try { recorder.stop(); } catch (_) {}
          }
        };

        video.onended = () => {
          if (onProgress) onProgress(100);
          stopRecording();
        };

        video.currentTime = 0;

        const startRecording = () => {
          if (recorder && recorder.state === "inactive" && !isStopped && !isTerminated) {
            recorder.start(100);
            animFrameId = requestAnimationFrame(rafLoop);
          }
        };

        video.addEventListener("playing", startRecording, { once: true });
        await video.play();
        startRecording();
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
  });
}
