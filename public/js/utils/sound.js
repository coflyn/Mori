// Web Audio API Synthesizer & Procedural Sound Effects

import { triggerHaptic } from "./device.js";

let unlockedAudioCtx = null;

export function unlockAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!unlockedAudioCtx) {
      unlockedAudioCtx = new AudioCtx();
    }
    if (unlockedAudioCtx.state === "suspended") {
      unlockedAudioCtx.resume().catch(() => {});
    }
  } catch (e) {}
}

if (typeof window !== "undefined") {
  const unlock = () => {
    unlockAudioContext();
  };
  window.addEventListener("click", unlock, { once: true, passive: true });
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
}

function playProceduralChime(ctx, now) {
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1760, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);
  } catch (e) {}
}

export function playSynthesizedSound(packName = "chime") {
  try {
    unlockAudioContext();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = unlockedAudioCtx || new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (packName === "zen") {
      // Zen Bell (Singing Bowl / Meditative Bell - 528Hz, 1056Hz, 1584Hz)
      const freqs = [528, 1056, 1584];
      const gains = [0.32, 0.14, 0.07];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(gains[idx], now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.45);
      });
    } else if (packName === "droplet") {
      // Water Droplet (Acoustic bloop with swift upward frequency sweep)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";

      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(1150, now + 0.13);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.38, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (packName === "pop") {
      // Soft Pop (Crisp tactile bubble pop)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";

      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(860, now + 0.035);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.42, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } else {
      playProceduralChime(ctx, now);
    }
  } catch (e) {
    console.warn("Synthesized sound error:", e);
  }
}

export function previewSound(packName) {
  playSynthesizedSound(packName || "chime");
}

export function playCompletionSound() {
  const isSoundEnabled =
    localStorage.getItem("mori_download_sound") !== "false";
  if (isSoundEnabled) {
    const pack = localStorage.getItem("mori_sound_pack") || "chime";
    playSynthesizedSound(pack);
  }

  try {
    triggerHaptic("success");
  } catch (e) {}
}
