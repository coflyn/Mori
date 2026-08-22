// share.js — Quick Download Share Overlay Handler
import {
  setTikTokSource,
  scrapeTikTok,
  setInstagramSource,
  scrapeInstagram,
  setYouTubeSource,
  scrapeYouTube,
  setTwitterSource,
  scrapeTwitter,
  setSpotifySource,
  scrapeSpotify,
  scrapePinterest,
  scrapeAppleMusic,
  scrapeFacebook,
  scrapeRedNote,
  scrapeDouyin,
  scrapeBilibili,
  scrapeThreads,
  scrapeBandcamp,
  scrapePixiv,
} from "./scrapers/index.js";
import { cleanUrl } from "./utils/urlUtils.js";

// DOM elements
const platformBadge = document.getElementById("platformBadge");
const urlPreview = document.getElementById("urlPreview");
const serverSection = document.getElementById("serverSection");
const serverPills = document.getElementById("serverPills");
const statusSection = document.getElementById("statusSection");
const statusText = document.getElementById("statusText");
const errorSection = document.getElementById("errorSection");
const errorText = document.getElementById("errorText");
const downloadListSection = document.getElementById("downloadListSection");
const downloadList = document.getElementById("downloadList");
const analyzeBtn = document.getElementById("analyzeBtn");

let targetUrl = "";
let selectedServer = null;
let currentPlatform = null;
let activeResult = null;

const SERVERS = {
  tiktok: [
    { id: "tiktokio", name: "Server 1", sub: "TikTokIO (HD / MP3)" },
    { id: "snaptik", name: "Server 2", sub: "SnapTik (HD / Photo)" },
  ],
  instagram: [
    { id: "indown", name: "Server 1", sub: "InDown (Reels / Posts)" },
    { id: "downreels", name: "Server 2", sub: "DownReels (Reels)" },
  ],
  youtube: [
    { id: "gg", name: "Server 1", sub: "YTMP3.gg (1080p / MP3)" },
    { id: "mobi", name: "Server 2", sub: "YTMP3.mobi (Fast MP4/MP3)" },
  ],
  twitter: [
    { id: "tweeload", name: "Server 1", sub: "TweeLoad (HD Video)" },
    { id: "tvd", name: "Server 2", sub: "TVD (HD Video)" },
  ],
  spotify: [
    { id: "spotidown", name: "Server 1", sub: "SpotiDown (Album / Track)" },
    { id: "soundloaders", name: "Server 2", sub: "SoundLoaders (Track)" },
  ],
};

function detectPlatform(url) {
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("twitter.com") || url.includes("x.com") || url.includes("t.co")) return "twitter";
  if (url.includes("spotify.com")) return "spotify";
  if (url.includes("pinterest.com") || url.includes("pin.it")) return "pinterest";
  if (url.includes("music.apple.com")) return "applemusic";
  if (url.includes("facebook.com") || url.includes("fb.watch")) return "facebook";
  if (url.includes("xiaohongshu.com") || url.includes("rednote.com")) return "rednote";
  if (url.includes("douyin.com")) return "douyin";
  if (url.includes("bilibili.com") || url.includes("b23.tv") || url.includes("bili.im")) return "bilibili";
  if (url.includes("threads.net") || url.includes("threads.com")) return "threads";
  if (url.includes("bandcamp.com")) return "bandcamp";
  if (url.includes("pixiv.net")) return "pixiv";
  return "unknown";
}

function initUI() {
  const theme = localStorage.getItem("mori_theme") || "dark";
  if (theme === "light") document.body.classList.add("light-theme");
  else document.body.classList.remove("light-theme");

  const font = localStorage.getItem("mori_font") || "default";
  document.body.classList.remove("font-default", "font-jakarta", "font-serif", "font-mono", "font-display");
  document.body.classList.add(`font-${font}`);

  targetUrl = window.__MORI_SHARE_URL || "";
  if (!targetUrl) return;

  urlPreview.textContent = targetUrl;
  currentPlatform = detectPlatform(targetUrl);
  platformBadge.textContent = currentPlatform.toUpperCase();

  const preferServer = localStorage.getItem("mori_prefer_server") || "ask";
  if (SERVERS[currentPlatform]) {
    const list = SERVERS[currentPlatform];
    selectedServer = preferServer === "server2" ? list[1].id : list[0].id;
    renderServerPills(list);
    serverSection.style.display = "block";
  } else {
    serverSection.style.display = "none";
  }

  if (preferServer === "server1" || preferServer === "server2") {
    startAnalyze();
  }
}

function renderServerPills(list) {
  serverPills.innerHTML = "";
  list.forEach((srv) => {
    const btn = document.createElement("button");
    btn.className = `server-pill ${srv.id === selectedServer ? "active" : ""}`;
    btn.innerHTML = `<div class="pill-name">${srv.name}</div><div class="pill-sub">${srv.sub}</div>`;
    btn.onclick = () => {
      selectedServer = srv.id;
      document.querySelectorAll(".server-pill").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
    };
    serverPills.appendChild(btn);
  });
}

window.dismissPanel = function () {
  if (window.MoriShareBridge?.dismiss) window.MoriShareBridge.dismiss();
};

window.showToast = function (msg) {
  if (window.MoriShareBridge?.showToast) {
    window.MoriShareBridge.showToast(msg);
  } else {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = msg;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2000);
    }
  }
};

window.startAnalyze = async function () {
  errorSection.style.display = "none";
  downloadListSection.style.display = "none";
  statusSection.style.display = "block";
  statusText.textContent = "Analyzing link...";
  analyzeBtn.disabled = true;

  try {
    let data = null;
    if (currentPlatform === "tiktok") {
      setTikTokSource(selectedServer);
      data = await scrapeTikTok(targetUrl);
    } else if (currentPlatform === "instagram") {
      setInstagramSource(selectedServer);
      data = await scrapeInstagram(targetUrl);
    } else if (currentPlatform === "youtube") {
      setYouTubeSource(selectedServer);
      data = await scrapeYouTube(targetUrl);
    } else if (currentPlatform === "twitter") {
      setTwitterSource(selectedServer);
      data = await scrapeTwitter(targetUrl);
    } else if (currentPlatform === "spotify") {
      setSpotifySource(selectedServer);
      data = await scrapeSpotify(targetUrl);
    } else if (currentPlatform === "pinterest") {
      data = await scrapePinterest(targetUrl);
    } else if (currentPlatform === "applemusic") {
      data = await scrapeAppleMusic(targetUrl);
    } else if (currentPlatform === "facebook") {
      data = await scrapeFacebook(targetUrl);
    } else if (currentPlatform === "rednote") {
      data = await scrapeRedNote(targetUrl);
    } else if (currentPlatform === "douyin") {
      data = await scrapeDouyin(targetUrl);
    } else if (currentPlatform === "bilibili") {
      data = await scrapeBilibili(targetUrl);
    } else if (currentPlatform === "threads") {
      data = await scrapeThreads(targetUrl);
    } else if (currentPlatform === "bandcamp") {
      data = await scrapeBandcamp(targetUrl);
    } else if (currentPlatform === "pixiv") {
      data = await scrapePixiv(targetUrl);
    } else {
      data = { status: false, message: "Unsupported platform link." };
    }

    statusSection.style.display = "none";
    analyzeBtn.disabled = false;

    if (data && data.status) {
      activeResult = data.result;
      saveHistory(activeResult, targetUrl);
      renderDownloadList(activeResult);
    } else {
      showError(data?.message || "Failed to parse link.");
    }
  } catch (err) {
    statusSection.style.display = "none";
    analyzeBtn.disabled = false;
    showError(err.message || "An error occurred during analysis.");
  }
};

function showError(msg) {
  errorText.textContent = msg;
  errorSection.style.display = "block";
}

function renderDownloadList(result) {
  downloadList.innerHTML = "";
  const downloads = result.downloads || [];
  if (downloads.length === 0) {
    showError("No download links found.");
    return;
  }

  downloads.forEach((dl, idx) => {
    const btn = document.createElement("button");
    btn.className = "dl-item-btn";
    btn.id = `dl_btn_${idx}`;
    let label = dl.type || "Download";
    if (dl.quality) label += ` - ${dl.quality}`;

    btn.innerHTML = `
      <div>
        <div style="font-weight:600;">Option ${idx + 1}</div>
        <div class="dl-type">${label}</div>
      </div>
      <div class="dl-badge">DOWNLOAD</div>
    `;

    btn.onclick = () => triggerDownload(dl, result.title || "Mori_Media", idx);
    downloadList.appendChild(btn);
  });

  downloadListSection.style.display = "block";
  analyzeBtn.style.display = "none";
}

function triggerDownload(dlItem, title, idx) {
  const btn = document.getElementById(`dl_btn_${idx}`);
  if (btn) {
    btn.classList.add("downloading");
    const badge = btn.querySelector(".dl-badge");
    if (badge) badge.textContent = "SAVING...";
  }

  const filename = generateFilename(title, dlItem.type, idx);
  const folder = getFolderForPlatform(currentPlatform);

  if (window.MoriShareBridge?.downloadFile) {
    window.MoriShareBridge.downloadFile(
      dlItem.url,
      filename,
      folder,
      JSON.stringify({ Referer: targetUrl }),
      title
    );
  }
}

function getFolderForPlatform(platform) {
  const subfolders = {
    tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube",
    twitter: "Twitter", spotify: "Spotify", pinterest: "Pinterest",
    applemusic: "AppleMusic", facebook: "Facebook", rednote: "RedNote",
    douyin: "Douyin", bilibili: "Bilibili", threads: "Threads",
    bandcamp: "Bandcamp", pixiv: "Pixiv"
  };
  const base = localStorage.getItem("mori_download_path") || "Mori";
  const sub = subfolders[platform] || "";
  const autoFolder = localStorage.getItem("mori_auto_folder") === "true";
  return autoFolder && sub ? `${base}/${sub}` : base;
}

function generateFilename(title, type, index) {
  let sanitized = (title || "")
    .replace(/[\\/:*?"<>|#%&{}[\]@$^+=~`';,]/g, "")
    .trim()
    .replace(/^\.+/, "")
    .substring(0, 50) || "Mori_Media";

  let ext = "mp4";
  const t = (type || "").toLowerCase();
  if (t.includes("mp3") || t.includes("audio")) ext = "mp3";
  else if (t.includes("jpg") || t.includes("image") || t.includes("photo")) ext = "jpg";
  else if (t.includes("png")) ext = "png";

  return `${sanitized}_${index + 1}.${ext}`;
}

// Minimal History Sync
function saveHistory(result, url) {
  if (localStorage.getItem("mori_incognito") === "true") return;
  try {
    let history = JSON.parse(localStorage.getItem("mori_history") || "[]");
    let cleanTitle = (result.title || "Content").replace(/#[^\s#]+/g, "").replace(/\s{2,}/g, " ").trim();
    const targetClean = cleanUrl(url);

    const existingIdx = history.findIndex((h) => cleanUrl(h.url) === targetClean);
    const existing = existingIdx !== -1 ? history[existingIdx] : null;

    const newItem = {
      title: cleanTitle,
      thumbnail: result.thumbnail || (existing ? existing.thumbnail : ""),
      url: url,
      sourceUrl: result.sourceUrl || url,
      timestamp: Date.now(),
      downloads: result.downloads || (existing ? existing.downloads : []),
      localFiles: existing ? existing.localFiles || [] : [],
      localUri: existing ? existing.localUri : null,
      localThumbnail: existing ? existing.localThumbnail : null,
    };

    if (existingIdx !== -1) history.splice(existingIdx, 1);
    history.unshift(newItem);

    const updated = history.slice(0, 100);
    localStorage.setItem("mori_history", JSON.stringify(updated));
    if (window.MoriShareBridge?.savePendingHistory) {
      window.MoriShareBridge.savePendingHistory(JSON.stringify(newItem));
    }
  } catch (err) {
    console.error("Save history error", err);
  }
}

function updateHistorySavedFile(filename, savedPath) {
  if (localStorage.getItem("mori_incognito") === "true" || !targetUrl) return;
  try {
    let history = JSON.parse(localStorage.getItem("mori_history") || "[]");
    const isVideo = savedPath.toLowerCase().endsWith(".mp4");
    const isAudio = savedPath.toLowerCase().endsWith(".mp3") || savedPath.toLowerCase().endsWith(".m4a");

    if (history.length > 0) {
      const first = history[0];
      const localFiles = first.localFiles || [];
      if (!localFiles.find((f) => f.path === savedPath)) {
        localFiles.push({
          path: savedPath,
          uri: savedPath,
          type: isVideo ? "VIDEO" : isAudio ? "MP3" : "IMAGE",
          thumbnail: isVideo ? null : savedPath,
          title: first.title,
        });
      }
      history[0] = { ...first, localFiles, localUri: savedPath };
      localStorage.setItem("mori_history", JSON.stringify(history));
      if (window.MoriShareBridge?.savePendingHistory) {
        window.MoriShareBridge.savePendingHistory(JSON.stringify(history[0]));
      }
    }
  } catch (err) {
    console.error("Update history saved file error", err);
  }
}

window.onDownloadComplete = function (filename, savedPath) {
  if (savedPath) updateHistorySavedFile(filename, savedPath);
  window.showToast(`Saved: ${filename}`);
  setTimeout(() => window.dismissPanel(), 1000);
};

window.onDownloadFailed = function (filename, error) {
  window.showToast(`Failed: ${error}`);
  document.querySelectorAll(".dl-item-btn").forEach((btn) => {
    btn.classList.remove("downloading");
    const badge = btn.querySelector(".dl-badge");
    if (badge) badge.textContent = "DOWNLOAD";
  });
};

window.onMoriConfigReady = function () {
  initUI();
};

if (window.__MORI_SHARE_URL) {
  initUI();
}
