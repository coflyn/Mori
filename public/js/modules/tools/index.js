// index.js — Tools Page Manager: Navigation and Tool Controllers
import { t } from "../../i18n/index.js";
import { showToast, triggerHaptic, Clipboard, pauseAllMedia } from "../../utils/index.js";
import { startNativeDownload } from "../../ui/nativeDownload.js";
import { sniffWebMedia } from "./sniffer.js";
import { skipSflgl } from "./sflgl.js";
import { findTikTokUser } from "./tiktokFinder.js";
import { searchAnimeScene, formatTimestamp } from "./animeSearch.js";
import { convertImage } from "./imageConverter.js";
import { extractAudioFromVideoFile } from "./audioExtractor.js";
import { compressPdfFile } from "./pdfCompressor.js";
import { checkAllUsernames, CHECKER_PLATFORMS } from "./usernameChecker.js";
import { saveBlobToMori } from "./storageHelper.js";

let activeToolSubView = null;

export function isInsideToolSubView() {
  return !!activeToolSubView;
}

export function closeCurrentToolSubView() {
  if (activeToolSubView) {
    pauseAllMedia(activeToolSubView);
    activeToolSubView.classList.add("hidden");
    activeToolSubView = null;
  }
  const mainMenu = document.getElementById("toolsMainMenu");
  if (mainMenu) mainMenu.classList.remove("hidden");
}

async function readTextFromClipboard() {
  try {
    if (window.Capacitor?.isNativePlatform?.() && Clipboard) {
      try {
        const res = await Clipboard.read();
        if (res?.value) return res.value;
      } catch (_) {}
    }
    return await navigator.clipboard.readText();
  } catch (_) {
    return "";
  }
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(num) {
  if (num === null || num === undefined) return "-";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

export function initTools() {
  const mainMenu = document.getElementById("toolsMainMenu");
  const toolCards = document.querySelectorAll(".tool-card");
  const backButtons = document.querySelectorAll(".tool-view-back-btn");

  // Tool Card Click Navigation
  toolCards.forEach((card) => {
    card.addEventListener("click", () => {
      const toolId = card.getAttribute("data-tool");
      if (!toolId) return;
      triggerHaptic("medium");
      pauseAllMedia(document);

      const targetView = document.getElementById(`tool${capitalize(toolId)}View`);
      if (targetView && mainMenu) {
        mainMenu.classList.add("hidden");
        document
          .querySelectorAll(".tool-sub-view")
          .forEach((v) => v.classList.add("hidden"));
        targetView.classList.remove("hidden");
        activeToolSubView = targetView;
      }
    });
  });

  // Back Button Navigation
  backButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      triggerHaptic("light");
      closeCurrentToolSubView();
    });
  });

  initSnifferController();
  initSflglController();
  initTiktokFinderController();
  initAnimeSearchController();
  initConverterController();
  initExtractorController();
  initPdfCompressorController();
  initUsernameCheckerController();
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// -------------------------------------------------------------
// 1. Web Media Sniffer Controller
// -------------------------------------------------------------
function initSnifferController() {
  const input = document.getElementById("snifferUrlInput");
  const pasteBtn = document.getElementById("snifferPasteBtn");
  const runBtn = document.getElementById("snifferRunBtn");
  const loader = document.getElementById("snifferLoader");
  const resultsContainer = document.getElementById("snifferResults");
  const filterChips = document.querySelectorAll(".sniffer-filter-chip");

  let lastSniffData = null;
  let activeFilter = "all";

  pasteBtn?.addEventListener("click", async () => {
    triggerHaptic("light");
    const text = await readTextFromClipboard();
    if (text && input) {
      input.value = text.trim();
      input.focus();
    } else {
      showToast(t("toast-clipboard-empty") || "Clipboard is empty");
    }
  });

  runBtn?.addEventListener("click", async () => {
    const url = input?.value?.trim();
    if (!url) {
      showToast(t("toast-no-link") || "Please enter a valid URL");
      return;
    }
    triggerHaptic("medium");

    runBtn.disabled = true;
    loader?.classList.remove("hidden");
    if (resultsContainer) resultsContainer.innerHTML = "";

    try {
      const data = await sniffWebMedia(url);
      lastSniffData = data;
      renderSnifferResults(data, activeFilter);
      showToast(
        data.total > 0
          ? `${data.total} media item(s) found`
          : "No direct media found on this page",
      );
    } catch (err) {
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="tool-error-card">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            <p>${esc(err.message || "Failed to sniff media")}</p>
          </div>
        `;
      }
    } finally {
      runBtn.disabled = false;
      loader?.classList.add("hidden");
    }
  });

  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      triggerHaptic("light");
      filterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.getAttribute("data-filter") || "all";
      if (lastSniffData) {
        renderSnifferResults(lastSniffData, activeFilter);
      }
    });
  });

  function renderSnifferResults(data, filter) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = "";

    let items = [];
    if (filter === "all" || filter === "video") items.push(...data.videos);
    if (filter === "all" || filter === "audio") items.push(...data.audios);
    if (filter === "all" || filter === "image") items.push(...data.images);

    // Update chip counts
    document.querySelector('.sniffer-filter-chip[data-filter="all"] .chip-count')?.replaceChildren(
      document.createTextNode(`(${data.total})`),
    );
    document.querySelector('.sniffer-filter-chip[data-filter="video"] .chip-count')?.replaceChildren(
      document.createTextNode(`(${data.videos.length})`),
    );
    document.querySelector('.sniffer-filter-chip[data-filter="audio"] .chip-count')?.replaceChildren(
      document.createTextNode(`(${data.audios.length})`),
    );
    document.querySelector('.sniffer-filter-chip[data-filter="image"] .chip-count')?.replaceChildren(
      document.createTextNode(`(${data.images.length})`),
    );

    if (items.length === 0) {
      resultsContainer.innerHTML = `
        <div class="tool-empty-box">
          <p>${data.total === 0 ? "No media found on this page." : "No items matching filter."}</p>
        </div>
      `;
      return;
    }

    const header = document.createElement("div");
    header.className = "sniffer-results-header";
    header.innerHTML = `
      <h4 class="sniffer-page-title">${esc(data.pageTitle || data.pageUrl)}</h4>
      <span class="sniffer-found-count">${items.length} items</span>
    `;
    resultsContainer.appendChild(header);

    const list = document.createElement("div");
    list.className = "sniffer-media-list";

    items.forEach((item, idx) => {
      const card = document.createElement("div");
      card.className = "sniffer-media-card";

      let previewHtml = "";
      if (item.type === "VIDEO") {
        previewHtml = `
          <div class="sniffer-preview-wrap">
            <video src="${esc(item.url)}" poster="${esc(item.poster || "")}" controls preload="metadata"></video>
          </div>
        `;
      } else if (item.type === "AUDIO") {
        previewHtml = `
          <div class="sniffer-preview-wrap is-audio">
            <audio src="${esc(item.url)}" controls preload="metadata"></audio>
          </div>
        `;
      } else {
        previewHtml = `
          <div class="sniffer-preview-wrap is-image">
            <img src="${esc(item.url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
          </div>
        `;
      }

      card.innerHTML = `
        ${previewHtml}
        <div class="sniffer-item-info">
          <div class="sniffer-item-badge ${item.type.toLowerCase()}">${esc(item.type)}</div>
          <p class="sniffer-item-title" title="${esc(item.title)}">${esc(item.title)}</p>
          <p class="sniffer-item-url" title="${esc(item.url)}">${esc(item.url)}</p>
          <div class="sniffer-item-actions">
            <button class="sniffer-dl-btn" data-url="${esc(item.url)}" data-type="${esc(item.type)}" data-title="${esc(item.title)}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
              <span>Download</span>
            </button>
            <button class="sniffer-copy-btn" data-url="${esc(item.url)}" title="Copy Link">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            </button>
          </div>
        </div>
      `;

      card.querySelector(".sniffer-dl-btn")?.addEventListener("click", async (e) => {
        triggerHaptic("medium");
        const btn = e.currentTarget;
        btn.disabled = true;
        const dlType = item.type === "VIDEO" ? "MP4" : item.type === "AUDIO" ? "MP3" : "JPG";
        await startNativeDownload(item.url, dlType, item.title, btn, item.url);
        btn.disabled = false;
      });

      card.querySelector(".sniffer-copy-btn")?.addEventListener("click", () => {
        triggerHaptic("light");
        navigator.clipboard.writeText(item.url);
        showToast("Media link copied to clipboard");
      });

      list.appendChild(card);
    });

    resultsContainer.appendChild(list);
  }
}

// -------------------------------------------------------------
// 2. SFLGL Skipper Controller
// -------------------------------------------------------------
function initSflglController() {
  const input = document.getElementById("sflglUrlInput");
  const pasteBtn = document.getElementById("sflglPasteBtn");
  const runBtn = document.getElementById("sflglRunBtn");
  const loader = document.getElementById("sflglLoader");
  const resultContainer = document.getElementById("sflglResult");

  pasteBtn?.addEventListener("click", async () => {
    triggerHaptic("light");
    const text = await readTextFromClipboard();
    if (text && input) {
      input.value = text.trim();
      input.focus();
    } else {
      showToast(t("toast-clipboard-empty") || "Clipboard is empty");
    }
  });

  runBtn?.addEventListener("click", async () => {
    const url = input?.value?.trim();
    if (!url) {
      showToast(t("toast-no-link") || "Please enter a valid Safelinku/SFLGL URL");
      return;
    }
    triggerHaptic("medium");

    runBtn.disabled = true;
    loader?.classList.remove("hidden");
    if (resultContainer) resultContainer.innerHTML = "";

    try {
      const res = await skipSflgl(url);
      if (res.status && res.result?.destinationUrl) {
        renderSflglResult(res.result.originalUrl, res.result.destinationUrl);
        showToast("Link bypassed successfully!");
      } else {
        throw new Error(res.message || "Failed to bypass link");
      }
    } catch (err) {
      if (resultContainer) {
        resultContainer.innerHTML = `
          <div class="tool-error-card">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            <p>${esc(err.message || "Failed to bypass link")}</p>
          </div>
        `;
      }
    } finally {
      runBtn.disabled = false;
      loader?.classList.add("hidden");
    }
  });

  function renderSflglResult(originalUrl, destUrl) {
    if (!resultContainer) return;

    resultContainer.innerHTML = `
      <div class="tool-result-card sflgl-card">
        <div class="tool-success-header">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
          <h4>Destination Unlocked</h4>
        </div>
        <div class="sflgl-detail-row">
          <span class="sflgl-label">Original Link</span>
          <p class="sflgl-url-subtext">${esc(originalUrl)}</p>
        </div>
        <div class="sflgl-detail-row">
          <span class="sflgl-label">Direct Destination</span>
          <div class="sflgl-dest-box">
            <a href="${esc(destUrl)}" target="_blank" rel="noopener noreferrer" class="sflgl-dest-link">${esc(destUrl)}</a>
          </div>
        </div>
        <div class="sflgl-action-row">
          <button id="sflglCopyBtn" class="tool-btn-primary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            <span>Copy Link</span>
          </button>
          <a href="${esc(destUrl)}" target="_blank" rel="noopener noreferrer" class="tool-btn-secondary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            <span>Open Link</span>
          </a>
          <button id="sflglDownloadInMoriBtn" class="tool-btn-accent">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
            <span>Analyze in Mori</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById("sflglCopyBtn")?.addEventListener("click", () => {
      triggerHaptic("light");
      navigator.clipboard.writeText(destUrl);
      showToast("Destination link copied to clipboard");
    });

    document.getElementById("sflglDownloadInMoriBtn")?.addEventListener("click", () => {
      triggerHaptic("medium");
      const homeNav = document.querySelector('.nav-item[data-page="home"]');
      const urlInput = document.getElementById("urlInput");
      const downloadBtn = document.getElementById("downloadBtn");
      if (urlInput) {
        urlInput.value = destUrl;
        urlInput.dispatchEvent(new Event("input"));
      }
      homeNav?.click();
      setTimeout(() => downloadBtn?.click(), 300);
    });
  }
}

// -------------------------------------------------------------
// 3. TikTok User Finder Controller
// -------------------------------------------------------------
function initTiktokFinderController() {
  const input = document.getElementById("tiktokFinderInput");
  const pasteBtn = document.getElementById("tiktokFinderPasteBtn");
  const runBtn = document.getElementById("tiktokFinderRunBtn");
  const loader = document.getElementById("tiktokFinderLoader");
  const resultContainer = document.getElementById("tiktokFinderResult");

  pasteBtn?.addEventListener("click", async () => {
    triggerHaptic("light");
    const text = await readTextFromClipboard();
    if (text && input) {
      input.value = text.trim();
      input.focus();
    } else {
      showToast(t("toast-clipboard-empty") || "Clipboard is empty");
    }
  });

  runBtn?.addEventListener("click", async () => {
    const query = input?.value?.trim();
    if (!query) {
      showToast(t("toast-no-link") || "Please enter a username or profile link");
      return;
    }
    triggerHaptic("medium");

    runBtn.disabled = true;
    loader?.classList.remove("hidden");
    if (resultContainer) resultContainer.innerHTML = "";

    try {
      const res = await findTikTokUser(query);
      if (res.status && res.profile) {
        renderTiktokProfile(res.profile, res.quota);
        showToast("Profile intelligence retrieved");
      } else {
        throw new Error(res.message || "Account not found");
      }
    } catch (err) {
      if (resultContainer) {
        resultContainer.innerHTML = `
          <div class="tool-error-card">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            <p>${esc(err.message || "Failed to lookup TikTok account")}</p>
          </div>
        `;
      }
    } finally {
      runBtn.disabled = false;
      loader?.classList.add("hidden");
    }
  });

  function renderTiktokProfile(p, quota) {
    if (!resultContainer) return;

    function formatTiktokDate(isoStr) {
      if (!isoStr) return "Never";
      try {
        const d = new Date(isoStr);
        return d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch (_) {
        return isoStr.slice(0, 10);
      }
    }

    let createdDateStr = "-";
    if (p.createdAt?.value) {
      createdDateStr = formatTiktokDate(p.createdAt.value);
      if (p.createdAt?.source === "derived") {
        createdDateStr += " (Estimated)";
      }
    }

    const statusBadge = p.isPrivate
      ? `<span class="tiktok-badge private" title="Private Account">Private</span>`
      : `<span class="tiktok-badge public" title="Public Account">Public</span>`;
    const verifiedBadge = p.flags?.verified
      ? `<span class="tiktok-badge verified" title="Verified Account">✓ Verified</span>`
      : "";
    const sellerBadge = p.flags?.seller
      ? `<span class="tiktok-badge seller" title="TikTok Seller">Shop</span>`
      : "";
    const orgBadge = p.flags?.organization
      ? `<span class="tiktok-badge org" title="Organization">Org</span>`
      : "";

    const bioLinkHtml = p.bioLink
      ? `
      <div class="tiktok-biolink-wrap">
        <a href="${esc(p.bioLink)}" target="_blank" rel="noopener noreferrer" class="tiktok-biolink">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
          <span>${esc(p.bioLink)}</span>
        </a>
      </div>
      `
      : "";

    resultContainer.innerHTML = `
      <div class="tool-result-card tiktok-profile-card">
        <div class="tiktok-header-row">
          <div class="tiktok-avatar-wrap">
            <img src="${esc(p.avatarUrl || "")}" alt="${esc(p.displayName || p.username)}" class="tiktok-avatar" referrerpolicy="no-referrer" />
            <button id="tiktokDownloadAvatarBtn" class="tiktok-avatar-dl-btn" title="Download HD Avatar">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            </button>
          </div>
          <div class="tiktok-names-wrap">
            <h3 class="tiktok-display-name">${esc(p.displayName || p.username)}</h3>
            <p class="tiktok-username">@${esc(p.username)}</p>
            <div class="tiktok-badges-row">
              ${statusBadge}
              ${verifiedBadge}
              ${sellerBadge}
              ${orgBadge}
            </div>
          </div>
        </div>

        ${p.bio ? `<p class="tiktok-bio">${esc(p.bio)}</p>` : ""}
        ${bioLinkHtml}

        <div class="tiktok-stats-grid">
          <div class="tiktok-stat-box">
            <span class="tiktok-stat-val">${formatNumber(p.counts?.followers)}</span>
            <span class="tiktok-stat-lbl">Followers</span>
          </div>
          <div class="tiktok-stat-box">
            <span class="tiktok-stat-val">${formatNumber(p.counts?.following)}</span>
            <span class="tiktok-stat-lbl">Following</span>
          </div>
          <div class="tiktok-stat-box">
            <span class="tiktok-stat-val">${formatNumber(p.counts?.totalLikes)}</span>
            <span class="tiktok-stat-lbl">Total Likes</span>
          </div>
          <div class="tiktok-stat-box">
            <span class="tiktok-stat-val">${formatNumber(p.counts?.videos)}</span>
            <span class="tiktok-stat-lbl">Videos</span>
          </div>
          <div class="tiktok-stat-box">
            <span class="tiktok-stat-val">${formatNumber(p.counts?.friends)}</span>
            <span class="tiktok-stat-lbl">Friends</span>
          </div>
        </div>

        <div class="tiktok-meta-list">
          <div class="tiktok-meta-item">
            <span class="tiktok-meta-key">Account Created</span>
            <span class="tiktok-meta-val">${esc(createdDateStr)}</span>
          </div>
          <div class="tiktok-meta-item">
            <span class="tiktok-meta-key">Username Changed</span>
            <span class="tiktok-meta-val">${esc(formatTiktokDate(p.usernameChangedAt))}</span>
          </div>
          <div class="tiktok-meta-item">
            <span class="tiktok-meta-key">Nickname Changed</span>
            <span class="tiktok-meta-val">${esc(formatTiktokDate(p.nicknameChangedAt))}</span>
          </div>
          <div class="tiktok-meta-item">
            <span class="tiktok-meta-key">Account Language</span>
            <span class="tiktok-meta-val">${esc(p.language ? p.language.toUpperCase() : "Unavailable")}</span>
          </div>
          ${
            p.region
              ? `
          <div class="tiktok-meta-item">
            <span class="tiktok-meta-key">Account Region</span>
            <span class="tiktok-meta-val">${esc(p.region)}</span>
          </div>
          `
              : ""
          }
          <div class="tiktok-meta-item">
            <span class="tiktok-meta-key">Numeric User ID</span>
            <div class="tiktok-copyable-val">
              <span>${esc(p.userId || "-")}</span>
              <button class="tiktok-copy-small-btn" data-copy="${esc(p.userId || "")}" title="Copy UID">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              </button>
            </div>
          </div>
          ${
            p.secUid
              ? `
          <div class="tiktok-meta-item">
            <span class="tiktok-meta-key">SecUID</span>
            <div class="tiktok-copyable-val">
              <span class="truncate-secuid">${esc(p.secUid.slice(0, 16))}...</span>
              <button class="tiktok-copy-small-btn" data-copy="${esc(p.secUid)}" title="Copy SecUID">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              </button>
            </div>
          </div>
          `
              : ""
          }
        </div>

        <div class="tiktok-footer-actions">
          <a href="${esc(p.profileUrl || `https://www.tiktok.com/@${p.username}`)}" target="_blank" rel="noopener noreferrer" class="tool-btn-secondary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            <span>Open Profile</span>
          </a>
        </div>
      </div>
    `;

    document.getElementById("tiktokDownloadAvatarBtn")?.addEventListener("click", async (e) => {
      triggerHaptic("medium");
      const btn = e.currentTarget;
      btn.style.opacity = "0.5";
      btn.style.pointerEvents = "none";
      showToast("Downloading avatar...");
      await startNativeDownload(
        p.avatarUrl,
        "JPG",
        `tiktok_avatar_${p.username}`,
        null,
        p.avatarUrl,
      );
      btn.style.opacity = "";
      btn.style.pointerEvents = "";
    });

    resultContainer.querySelectorAll(".tiktok-copy-small-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        triggerHaptic("light");
        const val = btn.getAttribute("data-copy");
        if (val) {
          navigator.clipboard.writeText(val);
          showToast("Copied to clipboard");
        }
      });
    });
  }
}

// -------------------------------------------------------------
// 4. Anime Scene Search Controller (trace.moe)
// -------------------------------------------------------------
function initAnimeSearchController() {
  const urlInput = document.getElementById("animeUrlInput");
  const pasteBtn = document.getElementById("animePasteBtn");
  const fileInput = document.getElementById("animeFileInput");
  const uploadBtn = document.getElementById("animeUploadBtn");
  const runBtn = document.getElementById("animeRunBtn");
  const loader = document.getElementById("animeLoader");
  const resultsContainer = document.getElementById("animeResults");

  let selectedFile = null;

  pasteBtn?.addEventListener("click", async () => {
    triggerHaptic("light");
    const text = await readTextFromClipboard();
    if (text && urlInput) {
      urlInput.value = text.trim();
      selectedFile = null;
      if (uploadBtn) {
        uploadBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
          <span>${t("btn-upload-image") || "Upload Photo"}</span>
        `;
      }
      urlInput.focus();
    } else {
      showToast(t("toast-clipboard-empty") || "Clipboard is empty");
    }
  });

  uploadBtn?.addEventListener("click", () => {
    triggerHaptic("light");
    fileInput?.click();
  });

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) {
      selectedFile = file;
      if (urlInput) urlInput.value = file.name;
      if (uploadBtn) {
        uploadBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
          <span>Selected</span>
        `;
      }
      showToast(`Selected: ${file.name}`);
    }
  });

  runBtn?.addEventListener("click", async () => {
    const url = urlInput?.value?.trim();
    if (!selectedFile && !url) {
      showToast(t("toast-no-link") || "Please paste an image URL or choose a photo");
      return;
    }
    triggerHaptic("medium");

    runBtn.disabled = true;
    loader?.classList.remove("hidden");
    if (resultsContainer) resultsContainer.innerHTML = "";

    try {
      const payload = selectedFile || url;
      const data = await searchAnimeScene(payload);
      renderAnimeResults(data);
      if (data.results.length > 0) {
        showToast(`Found ${data.results.length} scene match(es)`);
      } else {
        showToast("No anime scene matched this image");
      }
    } catch (err) {
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="tool-error-card">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            <p>${esc(err.message || "Failed to search anime scene")}</p>
          </div>
        `;
      }
    } finally {
      runBtn.disabled = false;
      loader?.classList.add("hidden");
    }
  });

  function renderAnimeResults(data) {
    if (!resultsContainer) return;

    if (!data.results || data.results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="tool-empty-box">
          <p>No matching anime scenes found. Try a clearer screenshot without heavy cropping.</p>
        </div>
      `;
      return;
    }

    const list = document.createElement("div");
    list.className = "anime-results-list";

    data.results.forEach((item) => {
      const card = document.createElement("div");
      card.className = "anime-card";

      const clipHtml = item.videoUrl
        ? `
        <div class="anime-clip-wrap">
          <video src="${esc(item.videoUrl)}" poster="${esc(item.imageUrl || "")}" controls preload="metadata"></video>
        </div>
      `
        : item.imageUrl
        ? `
        <div class="anime-clip-wrap">
          <img src="${esc(item.imageUrl)}" alt="${esc(item.mainTitle)}" />
        </div>
      `
        : "";

      card.innerHTML = `
        ${clipHtml}
        <div class="anime-info-block">
          <div class="anime-title-row">
            <h4 class="anime-main-title">${esc(item.mainTitle)}</h4>
            <span class="anime-similarity-pill">${esc(item.similarityPct)}</span>
          </div>
          ${
            item.romajiTitle && item.romajiTitle !== item.mainTitle
              ? `<p class="anime-sub-titles">${esc(item.romajiTitle)}</p>`
              : ""
          }
          <div class="anime-meta-grid">
            <div class="anime-meta-col">
              <span class="lbl">Episode</span>
              <span class="val">${esc(String(item.episode))}</span>
            </div>
            <div class="anime-meta-col">
              <span class="lbl">Timestamp</span>
              <span class="val">${esc(item.timeRange)}</span>
            </div>
          </div>
          <div class="anime-actions-row">
            ${
              item.videoUrl
                ? `
              <button class="tool-btn-primary anime-dl-clip-btn" data-video="${esc(item.videoUrl)}" data-title="${esc(item.mainTitle)}_ep${item.episode}">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
                <span>Download Clip</span>
              </button>
            `
                : ""
            }
            ${
              item.anilistUrl
                ? `
              <a href="${esc(item.anilistUrl)}" target="_blank" rel="noopener noreferrer" class="tool-btn-secondary">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                <span>AniList</span>
              </a>
            `
                : ""
            }
          </div>
        </div>
      `;

      card.querySelector(".anime-dl-clip-btn")?.addEventListener("click", async (e) => {
        triggerHaptic("medium");
        const btn = e.currentTarget;
        const videoUrl = btn.getAttribute("data-video");
        const title = btn.getAttribute("data-title") || "anime_clip";
        btn.style.opacity = "0.5";
        btn.style.pointerEvents = "none";
        showToast("Downloading anime scene clip...");
        await startNativeDownload(videoUrl, "MP4", title, null, videoUrl);
        btn.style.opacity = "";
        btn.style.pointerEvents = "";
      });

      list.appendChild(card);
    });

    resultsContainer.appendChild(list);
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

// -------------------------------------------------------------
// 5. Image Converter Controller
// -------------------------------------------------------------
function initConverterController() {
  const dropzone = document.getElementById("converterDropzone");
  const fileInput = document.getElementById("converterFileInput");
  const optionsCard = document.getElementById("converterOptionsCard");
  const previewImg = document.getElementById("converterPreviewImg");
  const origName = document.getElementById("converterOrigName");
  const origDetails = document.getElementById("converterOrigDetails");
  const formatChips = document.querySelectorAll("#converterFormatChips .tool-chip");
  const qualityGroup = document.getElementById("converterQualityGroup");
  const qualitySlider = document.getElementById("converterQualitySlider");
  const qualityVal = document.getElementById("converterQualityVal");
  const scaleChips = document.querySelectorAll("#converterScaleChips .tool-chip");
  const runBtn = document.getElementById("converterRunBtn");
  const resultCard = document.getElementById("converterResultCard");
  const resultImg = document.getElementById("converterResultImg");
  const resultSize = document.getElementById("converterResultSize");
  const resultDiff = document.getElementById("converterResultDiff");
  const saveBtn = document.getElementById("converterSaveBtn");

  let selectedFile = null;
  let targetFormat = "image/jpeg";
  let targetQuality = 0.9;
  let targetScale = 1.0;
  let convertedBlob = null;
  let convertedExt = "jpg";

  dropzone?.addEventListener("click", () => {
    triggerHaptic("light");
    fileInput?.click();
  });

  dropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  dropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelected(file);
    }
  });

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  });

  function handleFileSelected(file) {
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (previewImg) previewImg.src = e.target.result;
      const img = new Image();
      img.onload = () => {
        if (origName) origName.textContent = file.name;
        if (origDetails) {
          const typeName = file.type.replace("image/", "").toUpperCase() || "IMAGE";
          origDetails.textContent = `${img.naturalWidth} × ${img.naturalHeight} · ${formatBytes(file.size)} · ${typeName}`;
        }
        optionsCard?.classList.remove("hidden");
        resultCard?.classList.add("hidden");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  formatChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      triggerHaptic("light");
      formatChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      targetFormat = chip.getAttribute("data-format") || "image/jpeg";
      if (targetFormat === "image/png") {
        qualityGroup?.classList.add("hidden");
      } else {
        qualityGroup?.classList.remove("hidden");
      }
    });
  });

  qualitySlider?.addEventListener("input", (e) => {
    const val = e.target.value;
    targetQuality = parseInt(val, 10) / 100;
    if (qualityVal) qualityVal.textContent = `${val}%`;
  });

  scaleChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      triggerHaptic("light");
      scaleChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      targetScale = parseFloat(chip.getAttribute("data-scale") || "1.0");
    });
  });

  runBtn?.addEventListener("click", async () => {
    if (!selectedFile) return;
    triggerHaptic("medium");
    runBtn.disabled = true;
    runBtn.innerHTML = `<span>${t("btn-processing") || "Processing..."}</span>`;

    try {
      const res = await convertImage(selectedFile, {
        format: targetFormat,
        quality: targetQuality,
        scale: targetScale,
      });

      convertedBlob = res.blob;
      convertedExt = res.ext;

      if (resultImg) {
        resultImg.src = URL.createObjectURL(res.blob);
      }
      if (resultSize) {
        resultSize.textContent = `${res.width} × ${res.height} · ${formatBytes(res.convertedSize)}`;
      }
      if (resultDiff) {
        const diff = ((res.convertedSize - res.originalSize) / res.originalSize) * 100;
        const diffText = diff <= 0 ? `${Math.abs(diff).toFixed(1)}% smaller` : `+${diff.toFixed(1)}%`;
        resultDiff.textContent = diffText;
      }

      resultCard?.classList.remove("hidden");
      showToast("Image converted successfully!");
    } catch (err) {
      showToast(err.message || "Failed to convert image");
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = `<span>${t("btn-convert-image") || "Convert Image"}</span>`;
    }
  });

  saveBtn?.addEventListener("click", async () => {
    if (!convertedBlob) return;
    triggerHaptic("medium");
    const baseName = (selectedFile?.name || "image").replace(/\.[^/.]+$/, "");
    const fileName = `${baseName}_converted.${convertedExt}`;
    saveBtn.disabled = true;
    await saveBlobToMori(convertedBlob, fileName, "Download/Mori");
    saveBtn.disabled = false;
  });
}

// -------------------------------------------------------------
// 6. Video to Audio Extractor Controller
// -------------------------------------------------------------
function initExtractorController() {
  const dropzone = document.getElementById("extractorDropzone");
  const fileInput = document.getElementById("extractorFileInput");
  const optionsCard = document.getElementById("extractorOptionsCard");
  const previewVideo = document.getElementById("extractorPreviewVideo");
  const videoName = document.getElementById("extractorVideoName");
  const videoDetails = document.getElementById("extractorVideoDetails");
  const channelChips = document.querySelectorAll("#extractorChannelChips .tool-chip");
  const runBtn = document.getElementById("extractorRunBtn");
  const loader = document.getElementById("extractorLoader");
  const resultCard = document.getElementById("extractorResultCard");
  const resultAudio = document.getElementById("extractorResultAudio");
  const resultDetails = document.getElementById("extractorResultDetails");
  const saveBtn = document.getElementById("extractorSaveBtn");

  let selectedVideoFile = null;
  let selectedChannels = "stereo";
  let extractedAudioBlob = null;

  dropzone?.addEventListener("click", () => {
    triggerHaptic("light");
    fileInput?.click();
  });

  dropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  dropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("video/")) {
      handleVideoSelected(file);
    }
  });

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleVideoSelected(file);
    }
  });

  function handleVideoSelected(file) {
    selectedVideoFile = file;
    const url = URL.createObjectURL(file);
    if (previewVideo) {
      previewVideo.src = url;
    }
    if (videoName) {
      videoName.textContent = file.name;
    }
    if (videoDetails) {
      videoDetails.textContent = formatBytes(file.size);
    }
    optionsCard?.classList.remove("hidden");
    resultCard?.classList.add("hidden");
  }

  channelChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      triggerHaptic("light");
      channelChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      selectedChannels = chip.getAttribute("data-channel") || "stereo";
    });
  });

  runBtn?.addEventListener("click", async () => {
    if (!selectedVideoFile) return;
    triggerHaptic("medium");

    runBtn.disabled = true;
    loader?.classList.remove("hidden");

    try {
      const res = await extractAudioFromVideoFile(selectedVideoFile, {
        channels: selectedChannels,
      });

      extractedAudioBlob = res.blob;
      if (resultAudio) {
        resultAudio.src = URL.createObjectURL(res.blob);
      }
      if (resultDetails) {
        resultDetails.textContent = `${formatTimestamp(res.duration)} · ${formatBytes(res.audioSize)} · ${(res.sampleRate / 1000).toFixed(1)} kHz WAV`;
      }

      resultCard?.classList.remove("hidden");
      showToast("Audio extracted successfully!");
    } catch (err) {
      showToast(err.message || "Failed to extract audio");
    } finally {
      runBtn.disabled = false;
      loader?.classList.add("hidden");
    }
  });

  saveBtn?.addEventListener("click", async () => {
    if (!extractedAudioBlob) return;
    triggerHaptic("medium");
    const baseName = (selectedVideoFile?.name || "video_audio").replace(/\.[^/.]+$/, "");
    const fileName = `${baseName}.wav`;
    saveBtn.disabled = true;
    await saveBlobToMori(extractedAudioBlob, fileName, "Download/Mori/Music");
    saveBtn.disabled = false;
  });
}

// -------------------------------------------------------------
// 7. PDF Compressor Controller
// -------------------------------------------------------------
function initPdfCompressorController() {
  const dropzone = document.getElementById("pdfDropzone");
  const fileInput = document.getElementById("pdfFileInput");
  const optionsCard = document.getElementById("pdfOptionsCard");
  const fileNameEl = document.getElementById("pdfFileName");
  const fileDetailsEl = document.getElementById("pdfFileDetails");
  const levelChips = document.querySelectorAll("#pdfLevelChips .tool-chip");
  const runBtn = document.getElementById("pdfRunBtn");
  const loader = document.getElementById("pdfLoader");
  const loaderText = document.getElementById("pdfLoaderText");
  const resultCard = document.getElementById("pdfResultCard");
  const resultSizeEl = document.getElementById("pdfResultSize");
  const resultDiffEl = document.getElementById("pdfResultDiff");
  const saveBtn = document.getElementById("pdfSaveBtn");

  let selectedPdfFile = null;
  let selectedLevel = "medium";
  let compressedPdfBlob = null;

  dropzone?.addEventListener("click", () => {
    triggerHaptic("light");
    fileInput?.click();
  });

  dropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  dropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && (file.type === "application/pdf" || file.name.endsWith(".pdf"))) {
      handlePdfSelected(file);
    }
  });

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePdfSelected(file);
    }
  });

  function handlePdfSelected(file) {
    selectedPdfFile = file;
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileDetailsEl) fileDetailsEl.textContent = formatBytes(file.size);
    optionsCard?.classList.remove("hidden");
    resultCard?.classList.add("hidden");
  }

  levelChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      triggerHaptic("light");
      levelChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      selectedLevel = chip.getAttribute("data-level") || "medium";
    });
  });

  runBtn?.addEventListener("click", async () => {
    if (!selectedPdfFile) return;
    triggerHaptic("medium");

    runBtn.disabled = true;
    loader?.classList.remove("hidden");
    if (loaderText) loaderText.textContent = "Starting PDF compression...";

    try {
      const res = await compressPdfFile(selectedPdfFile, {
        level: selectedLevel,
        onProgress: (current, total) => {
          if (loaderText) {
            loaderText.textContent = `Optimizing page ${current} of ${total}...`;
          }
        },
      });

      compressedPdfBlob = res.blob;

      if (resultSizeEl) {
        resultSizeEl.textContent = `${res.numPages} pages · ${formatBytes(res.compressedSize)}`;
      }
      if (resultDiffEl) {
        const diff = ((res.compressedSize - res.originalSize) / res.originalSize) * 100;
        const diffText = diff <= 0 ? `${Math.abs(diff).toFixed(1)}% smaller` : `+${diff.toFixed(1)}%`;
        resultDiffEl.textContent = diffText;
      }

      resultCard?.classList.remove("hidden");
      showToast("PDF compressed successfully!");
    } catch (err) {
      showToast(err.message || "Failed to compress PDF");
    } finally {
      runBtn.disabled = false;
      loader?.classList.add("hidden");
    }
  });

  saveBtn?.addEventListener("click", async () => {
    if (!compressedPdfBlob) return;
    triggerHaptic("medium");
    const baseName = (selectedPdfFile?.name || "document").replace(/\.[^/.]+$/, "");
    const fileName = `${baseName}_compressed.pdf`;
    saveBtn.disabled = true;
    await saveBlobToMori(compressedPdfBlob, fileName, "Download/Mori");
    saveBtn.disabled = false;
  });
}

// -------------------------------------------------------------
// 8. Username Checker Controller
// -------------------------------------------------------------
function initUsernameCheckerController() {
  const input = document.getElementById("usernameCheckerInput");
  const pasteBtn = document.getElementById("usernameCheckerPasteBtn");
  const runBtn = document.getElementById("usernameCheckerRunBtn");
  const summaryCard = document.getElementById("usernameCheckerSummary");
  const targetLabel = document.getElementById("usernameCheckerTarget");
  const takenBadge = document.getElementById("usernameCheckerTakenBadge");
  const availableBadge = document.getElementById("usernameCheckerAvailableBadge");
  const grid = document.getElementById("usernameCheckerGrid");

  pasteBtn?.addEventListener("click", async () => {
    triggerHaptic("light");
    const text = await readTextFromClipboard();
    if (text && input) {
      input.value = text.trim();
      input.focus();
    } else {
      showToast(t("toast-clipboard-empty") || "Clipboard is empty");
    }
  });

  runBtn?.addEventListener("click", async () => {
    const rawUser = input?.value?.trim();
    if (!rawUser) {
      showToast(t("toast-no-link") || "Please enter a username");
      return;
    }
    const cleanUser = rawUser.replace(/^[@/]+/, "").trim();
    if (!cleanUser) return;

    triggerHaptic("medium");
    runBtn.disabled = true;
    runBtn.innerHTML = `<span>${t("btn-checking") || "Checking..."}</span>`;

    if (summaryCard) summaryCard.classList.remove("hidden");
    if (targetLabel) targetLabel.textContent = `@${cleanUser}`;
    if (takenBadge) takenBadge.textContent = "0 Taken";
    if (availableBadge) availableBadge.textContent = "0 Available";

    // Pre-populate grid with checking state
    if (grid) {
      grid.innerHTML = "";
      CHECKER_PLATFORMS.forEach((p) => {
        const card = document.createElement("div");
        card.className = "username-card";
        card.id = `userCheck_${p.id}`;
        card.innerHTML = `
          <div class="username-card-left">
            <span class="username-card-platform">${esc(p.name)}</span>
            <span class="username-card-category">${esc(p.category)}</span>
          </div>
          <div class="username-card-right">
            <span class="username-status-badge checking">${t("status-checking") || "Checking..."}</span>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    let takenCount = 0;
    let availableCount = 0;

    try {
      const summary = await checkAllUsernames(cleanUser, (item) => {
        const card = document.getElementById(`userCheck_${item.id}`);
        if (!card) return;

        const rightCol = card.querySelector(".username-card-right");
        if (!rightCol) return;

        if (item.status === "taken") {
          takenCount++;
          rightCol.innerHTML = `
            <span class="username-status-badge taken">${t("status-taken") || "Taken"}</span>
            <a href="${esc(item.profileUrl)}" target="_blank" rel="noopener noreferrer" class="username-open-link" title="Open Profile">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            </a>
          `;
        } else if (item.status === "available") {
          availableCount++;
          rightCol.innerHTML = `
            <span class="username-status-badge available">${t("status-available") || "Available"}</span>
          `;
        } else {
          rightCol.innerHTML = `
            <span class="username-status-badge error">-</span>
          `;
        }

        if (takenBadge) takenBadge.textContent = `${takenCount} Taken`;
        if (availableBadge) availableBadge.textContent = `${availableCount} Available`;
      });

      showToast(`Checked: ${summary.takenCount} taken, ${summary.availableCount} available`);
    } catch (err) {
      showToast(err.message || "Failed to check username");
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = `<span>${t("btn-check-username") || "Check Availability"}</span>`;
    }
  });
}
