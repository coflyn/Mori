// ui.js — history rendering + shared UI state + re-exports
import { truncate } from "./utils/index.js";
import {
  currentLang,
  isEditingHistory,
  setIsEditingHistory,
  setCurrentLang,
  setCurrentSlideIndex,
  setSlideData,
} from "./modules/core.js";

// Escape HTML to prevent XSS from scraped titles
export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// State lives in core.js (shared across modules)

export function setUIState(state) {
  if (state.currentLang) setCurrentLang(state.currentLang);
  if (state.isEditingHistory !== undefined)
    setIsEditingHistory(state.isEditingHistory);
  if (state.currentSlideIndex !== undefined)
    setCurrentSlideIndex(state.currentSlideIndex);
  if (state.slideData !== undefined) setSlideData(state.slideData);
}

export function renderHistory(onItemClick, onDeleteClick) {
  const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  const historyPage = document.getElementById("historyPage");
  const editHistoryBtn = document.getElementById("editHistoryBtn");
  const historyActions = document.getElementById("historyActions");
  if (!historyPage) return;

  const emptyState = historyPage.querySelector(".empty-state");
  let list = historyPage.querySelector(".history-list");
  if (list) list.remove();

  if (history.length === 0) {
    setIsEditingHistory(false);
    emptyState?.classList.remove("hidden");
    editHistoryBtn?.classList.add("hidden");
    historyActions?.classList.add("hidden");
    return;
  }

  emptyState?.classList.add("hidden");
  if (isEditingHistory) {
    editHistoryBtn?.classList.add("hidden");
    historyActions?.classList.remove("hidden");
  } else {
    editHistoryBtn?.classList.remove("hidden");
    historyActions?.classList.add("hidden");
  }

  list = document.createElement("div");
  list.className = "history-list";

  history.forEach((item) => {
    const card = document.createElement("div");
    card.className = "history-item";

    const isDataSaver = localStorage.getItem("mori_data_saver") === "true";
    let thumbSrc = isDataSaver
      ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E"
      : item.thumbnail;

    if (!isDataSaver) {
      if (item.thumbnail) {
        thumbSrc = item.thumbnail;
      } else if (item.localThumbnail) {
        thumbSrc = item.localThumbnail;
      } else if (item.localFiles && item.localFiles.length > 0) {
        const first = item.localFiles[0];
        if (first.thumbnail) {
          thumbSrc = first.thumbnail;
        } else if (first.type === "IMAGE") {
          thumbSrc = window.Capacitor?.convertFileSrc(first.uri || first.path);
        }
      } else if (item.localUri && window.Capacitor) {
        const isImage = /\.(jpg|jpeg|png|webp)/i.test(item.localUri);
        if (isImage) {
          thumbSrc = window.Capacitor.convertFileSrc(item.localUri);
        }
      }
    }

    card.innerHTML = `
      <div class="history-thumb-container">
          <img src="${thumbSrc}" alt="thumb" class="hist-img" referrerpolicy="no-referrer">
          ${item.localFiles && item.localFiles.length > 1 ? `<div class="multi-indicator">${item.localFiles.length}</div>` : ""}
      </div>
      <div class="history-info">
          <h3>${truncate(escapeHtml(item.title), 60)}</h3>
          <p>${new Date(item.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</p>
      </div>
      ${isEditingHistory ? `<button class="delete-item-btn" data-url="${escapeHtml(item.url)}">×</button>` : ""}
    `;

    const img = card.querySelector(".hist-img");
    img.onerror = () => {
      if (item.thumbnail && img.src !== item.thumbnail) {
        img.src = item.thumbnail;
      } else {
        img.style.display = "none";
      }
    };

    if (!isEditingHistory) {
      card.addEventListener("click", () => onItemClick(item));
    } else {
      card.style.cursor = "pointer";
      card.addEventListener("click", (e) => {
        e.stopPropagation();
        onDeleteClick(item.url);
      });
      const delBtn = card.querySelector(".delete-item-btn");
      if (delBtn) {
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          onDeleteClick(item.url);
        });
      }
    }
    list.appendChild(card);
  });
  historyPage.appendChild(list);
}

// Re-exports for backward compatibility with importers
export {
  setCurrentLang,
  setCurrentSlideIndex,
  setSlideData,
} from "./modules/core.js";
export {
  updateSliderUI,
  renderResult,
  renderMediaSlides,
} from "./ui/result.js";
export { showModal } from "./ui/resultModal.js";
export { startNativeDownload } from "./ui/nativeDownload.js";
