// Toast Notifications & Download Progress Toast UI

import { translations, t } from "../i18n/index.js";
import { triggerHaptic } from "./device.js";

export let currentLang = "en";
export function setUtilsState(state) {
  if (state.currentLang) currentLang = state.currentLang;
}

export function autoClearInputBox() {
  if (localStorage.getItem("mori_auto_clear_input") === "true") {
    const urlInput = document.getElementById("urlInput");
    const batchUrlInput = document.getElementById("batchUrlInput");
    const clearBtn = document.getElementById("clearBtn");
    const pasteBtn = document.getElementById("pasteBtn");
    if (urlInput) urlInput.value = "";
    if (batchUrlInput) batchUrlInput.value = "";
    if (clearBtn) clearBtn.classList.add("hidden");
    if (pasteBtn) pasteBtn.classList.remove("hidden");
  }
}

// Toast Function
export async function showToast(message) {
  if (
    message &&
    (message.includes("Saved to") ||
      message.includes("Tersimpan di") ||
      message.includes("保存されました"))
  ) {
    return;
  }
  console.log("[TOAST]", message);
  triggerHaptic("light");

  const existingToasts = document.querySelectorAll(".custom-toast");
  existingToasts.forEach((t) => t.remove());

  const toastEl = document.createElement("div");
  toastEl.className = "custom-toast";
  toastEl.textContent = message;
  document.body.appendChild(toastEl);

  requestAnimationFrame(() => {
    toastEl.classList.add("show");
  });

  const durSec = parseInt(localStorage.getItem("mori_toast_dur") || "3", 10);
  const durMs = durSec * 1000;
  setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.remove(), 300);
  }, durMs);
}

// Floating Download Progress Toast
export function showDownloadProgressToast(platform, type) {
  const existing = document.body.querySelectorAll(".download-progress-toast");
  existing.forEach((el) => el.remove());

  const el = document.createElement("div");
  el.className = "download-progress-toast";
  const cleanType = (type || "")
    .replace(/\s*\[(MP3|MP4|JPG|PNG|WEBP)\]/gi, "")
    .trim();
  el.innerHTML = `
    <div class="dpt-header">
      <span class="dpt-platform">${platform} · ${cleanType}</span>
      <span class="dpt-percent">0%</span>
    </div>
    <div class="dpt-bar-track">
      <div class="dpt-bar-fill" id="dptBarFill"></div>
    </div>
    <div class="dpt-status">Preparing download...</div>
    <button class="dpt-cancel-btn" id="dptCancelBtn">✕ CANCEL</button>
  `;
  document.body.appendChild(el);

  // Wire cancel button to the global cancel function
  const cancelBtn = el.querySelector("#dptCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (typeof window._moriCancelDownload === "function") {
        window._moriCancelDownload();
      }
    });
  }

  requestAnimationFrame(() => el.classList.add("show"));
}

export function updateDownloadProgressToast(percent, statusText) {
  const el = document.querySelector(".download-progress-toast");
  if (
    !el ||
    el.classList.contains("completed") ||
    el.classList.contains("failed")
  )
    return;

  const fill = el.querySelector(".dpt-bar-fill");
  const pct = el.querySelector(".dpt-percent");
  const status = el.querySelector(".dpt-status");

  if (typeof percent === "number" && !isNaN(percent)) {
    const safePercent = Math.min(100, Math.max(0, percent));
    if (fill) fill.style.width = `${safePercent}%`;
    if (pct) pct.textContent = `${safePercent}%`;
  }
  if (status && statusText) status.textContent = statusText;
}

export function completeDownloadProgressToast(
  titleText,
  subtitleText,
  autoDismissMs = 3000,
) {
  const el = document.querySelector(".download-progress-toast");
  if (!el) return;

  el.classList.add("completed");
  const platform = el.querySelector(".dpt-platform");
  const pct = el.querySelector(".dpt-percent");
  const fill = el.querySelector(".dpt-bar-fill");
  const status = el.querySelector(".dpt-status");
  const cancelBtn = el.querySelector(".dpt-cancel-btn");
  if (cancelBtn) cancelBtn.style.display = "none";

  if (fill) fill.style.width = "100%";
  if (pct) pct.textContent = "100%";
  if (platform) platform.innerHTML = `${titleText || "Saved Successfully"}`;
  if (status) status.textContent = subtitleText || "";

  triggerHaptic("success");

  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 350);
  }, autoDismissMs);
}

export function failDownloadProgressToast(errorText, autoDismissMs = 3500) {
  const el = document.querySelector(".download-progress-toast");
  if (!el) return;

  el.classList.add("failed");
  const platform = el.querySelector(".dpt-platform");
  const pct = el.querySelector(".dpt-percent");
  const status = el.querySelector(".dpt-status");
  // Hide cancel button on failure
  const cancelBtn = el.querySelector(".dpt-cancel-btn");
  if (cancelBtn) cancelBtn.style.display = "none";

  if (pct)
    pct.textContent = translations[currentLang]?.["label-error"] || "Error";
  if (platform)
    platform.innerHTML =
      translations[currentLang]?.["toast-download-failed"] || "Download Failed";

  let cleanErr = errorText || "Unknown error";
  if (cleanErr.includes("http://") || cleanErr.includes("https://")) {
    cleanErr = cleanErr.replace(/https?:\/\/[^\s]+/gi, (urlStr) => {
      try {
        const u = new URL(urlStr);
        return u.hostname || "server";
      } catch (e) {
        return "server";
      }
    });
  }

  if (status) status.textContent = cleanErr;

  triggerHaptic("heavy");

  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 350);
  }, autoDismissMs);
}

export function cancelDownloadProgressToast(autoDismissMs = 2000) {
  const el = document.querySelector(".download-progress-toast");
  if (!el) return;

  el.classList.add("cancelled");
  const platform = el.querySelector(".dpt-platform");
  const pct = el.querySelector(".dpt-percent");
  const status = el.querySelector(".dpt-status");
  const cancelBtn = el.querySelector(".dpt-cancel-btn");
  if (cancelBtn) cancelBtn.style.display = "none";

  if (platform) platform.textContent = t("toast-download-cancelled");
  if (pct) pct.textContent = "—";
  if (status) status.textContent = "";

  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 350);
  }, autoDismissMs);
}

export function hideDownloadProgressToast(delay = 800) {
  setTimeout(() => {
    const el = document.querySelector(".download-progress-toast");
    if (!el) return;
    el.classList.remove("show");
    setTimeout(() => el.remove(), 350);
  }, delay);
}
