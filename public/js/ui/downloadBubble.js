// downloadBubble.js — Floating Download Bubble with Multi-Download Dropup Manager
import { t } from "../i18n/index.js";
import { triggerHaptic } from "../utils/device.js";

const escapeHtml = (s) =>
  String(s || "").replace(/[&<>"']/g, (m) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[m],
  );

const truncateTitle = (s, max = 22) => {
  const str = String(s || "").trim();
  if (str.length <= max) return str;
  return str.slice(0, max).trim() + "...";
};

class DownloadBubbleManager {
  constructor() {
    this.activeDownloads = new Map();
    this.container = null;
    this.bubbleBtn = null;
    this.badgeEl = null;
    this.countBadgeEl = null;
    this.progressRing = null;
    this.dropupEl = null;
    this.listEl = null;
    this.emptyStateEl = null;
    this.iconWrap = null;
    this.isOpen = false;
  }

  isShareOverlay() {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname || "";
    const href = window.location.href || "";
    return (
      path.endsWith("share.html") ||
      href.includes("share.html") ||
      !!document.getElementById("platformBadge")
    );
  }

  init() {
    if (this.isShareOverlay()) return;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.ensureMounted());
    } else {
      this.ensureMounted();
    }
    window.addEventListener("mori_language_changed", () => {
      this.refreshTranslations();
    });
  }

  refreshTranslations() {
    if (!this.container) return;
    const titleEl = this.container.querySelector("#dbdTitle");
    const emptyTitleEl = this.container.querySelector("#dbdEmptyTitle");
    const emptyDescEl = this.container.querySelector("#dbdEmptyDesc");
    const closeBtn = this.container.querySelector("#dbdCloseBtn");

    if (titleEl) titleEl.textContent = t("bubble-title");
    if (emptyTitleEl) emptyTitleEl.textContent = t("bubble-empty-title");
    if (emptyDescEl) emptyDescEl.textContent = t("bubble-empty-desc");
    if (closeBtn) closeBtn.setAttribute("aria-label", t("btn-close"));
    if (this.bubbleBtn) {
      this.bubbleBtn.setAttribute("aria-label", t("bubble-manager"));
      this.bubbleBtn.setAttribute("title", t("bubble-title"));
    }
    this.updateUI();
  }

  ensureMounted() {
    if (this.isShareOverlay()) return;
    if (this.container && document.body.contains(this.container)) return;

    this.container = document.createElement("div");
    this.container.id = "downloadBubbleContainer";
    this.container.className = "download-bubble-container visible";
    this.container.innerHTML = `
      <div id="downloadBubbleDropup" class="download-bubble-dropup">
        <div class="dbd-header">
          <div class="dbd-title-group">
            <svg class="dbd-title-icon" viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
            </svg>
            <span class="dbd-title" id="dbdTitle">${t("bubble-title")}</span>
            <span class="dbd-count-badge" id="dbdCountBadge">${t("bubble-idle")}</span>
          </div>
          <button class="dbd-close-btn" id="dbdCloseBtn" aria-label="${t("btn-close")}">✕</button>
        </div>
        <div class="dbd-body">
          <div class="dbd-empty" id="dbdEmpty">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <p class="dbd-empty-text" id="dbdEmptyTitle">${t("bubble-empty-title")}</p>
            <span class="dbd-empty-sub" id="dbdEmptyDesc">${t("bubble-empty-desc")}</span>
          </div>
          <div class="dbd-list" id="downloadBubbleList"></div>
        </div>
      </div>

      <button id="downloadBubbleBtn" class="download-bubble-btn" aria-label="${t("bubble-manager")}" title="${t("bubble-title")}">
        <svg class="db-ring-svg" viewBox="0 0 44 44">
          <circle class="db-ring-bg" cx="22" cy="22" r="19" />
          <circle class="db-ring-fill" id="dbRingFill" cx="22" cy="22" r="19" />
        </svg>
        <div class="db-icon-wrap" id="dbIconWrap">
          <svg class="db-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
          </svg>
        </div>
        <span class="db-badge hidden" id="dbBadge">0</span>
      </button>
    `;

    document.body.appendChild(this.container);

    this.bubbleBtn = this.container.querySelector("#downloadBubbleBtn");
    this.badgeEl = this.container.querySelector("#dbBadge");
    this.countBadgeEl = this.container.querySelector("#dbdCountBadge");
    this.progressRing = this.container.querySelector("#dbRingFill");
    this.dropupEl = this.container.querySelector("#downloadBubbleDropup");
    this.listEl = this.container.querySelector("#downloadBubbleList");
    this.emptyStateEl = this.container.querySelector("#dbdEmpty");
    this.iconWrap = this.container.querySelector("#dbIconWrap");

    this.bubbleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleDropup();
    });

    const closeBtn = this.container.querySelector("#dbdCloseBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeDropup();
      });
    }

    document.addEventListener("click", (e) => {
      if (this.isOpen && !this.container.contains(e.target)) {
        this.closeDropup();
      }
    });

    this.updateUI();
  }

  toggleDropup() {
    if (this.isOpen) {
      this.closeDropup();
    } else {
      this.openDropup();
    }
  }

  openDropup() {
    this.isOpen = true;
    this.dropupEl?.classList.add("open");
    triggerHaptic?.("light");
  }

  closeDropup() {
    this.isOpen = false;
    this.dropupEl?.classList.remove("open");
  }

  addDownload({ id, title, platform, type, onCancel }) {
    this.ensureMounted();

    const cleanTitle = (title || "Media").replace(/[<>]/g, "").trim();
    const cleanType = (type || "")
      .replace(/\s*\[(MP3|MP4|JPG|PNG|WEBP)\]/gi, "")
      .trim();

    const dl = {
      id,
      title: cleanTitle,
      displayTitle: truncateTitle(cleanTitle, 22),
      platform: platform || "Media",
      type: cleanType,
      progress: 0,
      status: t("status-downloading"),
      onCancel: onCancel || null,
      element: null,
    };

    this.activeDownloads.set(id, dl);
    this.renderItem(dl);
    this.updateUI();
    return id;
  }

  renderItem(dl) {
    const itemEl = document.createElement("div");
    itemEl.className = "dbd-item";
    itemEl.id = `dbd-item-${dl.id}`;
    itemEl.innerHTML = `
      <div class="dbd-item-header">
        <div class="dbd-item-info">
          <span class="dbd-item-pill">${escapeHtml(dl.platform)}${dl.type ? " · " + escapeHtml(dl.type) : ""}</span>
          <span class="dbd-item-name" title="${escapeHtml(dl.title)}">${escapeHtml(dl.displayTitle)}</span>
        </div>
        <button class="dbd-item-cancel" aria-label="${t("btn-cancel")}" title="${t("btn-cancel")}">✕</button>
      </div>
      <div class="dbd-item-track">
        <div class="dbd-item-bar" style="width: 0%;"></div>
      </div>
      <div class="dbd-item-footer">
        <span class="dbd-item-status">${escapeHtml(dl.status)}</span>
        <span class="dbd-item-percent">0%</span>
      </div>
    `;

    const cancelBtn = itemEl.querySelector(".dbd-item-cancel");
    cancelBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof dl.onCancel === "function") {
        dl.onCancel();
      }
      this.cancelDownload(dl.id);
    });

    dl.element = itemEl;
    this.listEl.prepend(itemEl);
  }

  updateProgress(id, pct, statusText) {
    const dl = this.activeDownloads.get(id);
    if (!dl) return;

    dl.progress = Math.min(100, Math.max(0, Math.round(pct)));
    if (statusText) dl.status = statusText;

    if (dl.element) {
      const bar = dl.element.querySelector(".dbd-item-bar");
      const pctEl = dl.element.querySelector(".dbd-item-percent");
      const statusEl = dl.element.querySelector(".dbd-item-status");
      if (bar) bar.style.width = `${dl.progress}%`;
      if (pctEl) pctEl.textContent = `${dl.progress}%`;
      if (statusEl && statusText) statusEl.textContent = statusText;
    }

    this.updateOverallProgress();
  }

  completeDownload(id, message = null) {
    const dl = this.activeDownloads.get(id);
    if (!dl) return;

    const displayMsg = message || t("status-saved");
    dl.progress = 100;
    dl.status = displayMsg;

    if (dl.element) {
      dl.element.classList.add("completed");
      const bar = dl.element.querySelector(".dbd-item-bar");
      const pctEl = dl.element.querySelector(".dbd-item-percent");
      const statusEl = dl.element.querySelector(".dbd-item-status");
      const cancelBtn = dl.element.querySelector(".dbd-item-cancel");
      if (bar) bar.style.width = "100%";
      if (pctEl) pctEl.textContent = "✓";
      if (statusEl) statusEl.textContent = displayMsg;
      if (cancelBtn) cancelBtn.style.display = "none";
    }

    this.updateOverallProgress();

    triggerHaptic?.("light");

    setTimeout(() => {
      this.removeItem(id);
    }, 1800);
  }

  failDownload(id, errorText = null) {
    const dl = this.activeDownloads.get(id);
    if (!dl) return;

    const displayErr = errorText || t("status-failed");
    dl.status = displayErr;

    if (dl.element) {
      dl.element.classList.add("failed");
      const pctEl = dl.element.querySelector(".dbd-item-percent");
      const statusEl = dl.element.querySelector(".dbd-item-status");
      const cancelBtn = dl.element.querySelector(".dbd-item-cancel");
      if (pctEl) pctEl.textContent = "✕";
      if (statusEl) statusEl.textContent = displayErr;
      if (cancelBtn) cancelBtn.style.display = "none";
    }

    setTimeout(() => {
      this.removeItem(id);
    }, 2500);
  }

  cancelDownload(id) {
    const dl = this.activeDownloads.get(id);
    if (!dl) return;

    const cancelMsg = t("status-cancelled");
    dl.status = cancelMsg;

    if (dl.element) {
      dl.element.classList.add("cancelled");
      const statusEl = dl.element.querySelector(".dbd-item-status");
      const pctEl = dl.element.querySelector(".dbd-item-percent");
      const cancelBtn = dl.element.querySelector(".dbd-item-cancel");
      if (statusEl) statusEl.textContent = cancelMsg;
      if (pctEl) pctEl.textContent = "—";
      if (cancelBtn) cancelBtn.style.display = "none";
    }

    setTimeout(() => {
      this.removeItem(id);
    }, 1200);
  }

  removeItem(id) {
    const dl = this.activeDownloads.get(id);
    if (dl?.element) {
      dl.element.classList.add("removing");
      setTimeout(() => {
        dl.element.remove();
      }, 250);
    }
    this.activeDownloads.delete(id);
    this.updateUI();
  }

  updateUI() {
    const count = this.activeDownloads.size;
    if (this.badgeEl) {
      if (count > 0) {
        this.badgeEl.textContent = count > 9 ? "9+" : count.toString();
        this.badgeEl.classList.remove("hidden");
      } else {
        this.badgeEl.classList.add("hidden");
      }
    }

    if (this.countBadgeEl) {
      this.countBadgeEl.textContent =
        count > 0 ? t("bubble-active-count", { count }) : t("bubble-idle");
    }

    if (this.emptyStateEl) {
      this.emptyStateEl.style.display = count === 0 ? "flex" : "none";
    }

    if (this.iconWrap) {
      if (count > 0) {
        this.iconWrap.classList.add("downloading");
      } else {
        this.iconWrap.classList.remove("downloading");
      }
    }

    this.updateOverallProgress();
  }

  updateOverallProgress() {
    if (!this.progressRing) return;
    const total = this.activeDownloads.size;
    const circumference = 119.38;
    if (total === 0) {
      this.progressRing.style.strokeDashoffset = circumference.toString();
      return;
    }

    let sum = 0;
    this.activeDownloads.forEach((dl) => {
      sum += dl.progress;
    });
    const avg = sum / total;
    const offset = circumference - (avg / 100) * circumference;
    this.progressRing.style.strokeDashoffset = offset.toString();
  }
}

export const downloadBubble = new DownloadBubbleManager();
downloadBubble.init();
