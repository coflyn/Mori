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
import { getUserAgent } from "./utils/index.js";
import { translations } from "./i18n/index.js";

let currentLang = localStorage.getItem("mori_lang") || "en";
let lang = translations[currentLang] || translations.en;

function applyShareLanguage() {
  currentLang = localStorage.getItem("mori_lang") || "en";
  lang = translations[currentLang] || translations.en;
  document.documentElement.lang = currentLang;
  document.documentElement.setAttribute(
    "dir",
    currentLang === "ar" ? "rtl" : "ltr",
  );

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (lang[key]) {
      el.textContent = lang[key];
    }
  });
}

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
let isAnalyzing = false;
let analyzeCancelled = false;
let statusTimer = null;

const SERVERS = {
  tiktok: [
    { id: "tiktokio", name: "Server 1", sub: "TikTokIO (HD / MP3)" },
    { id: "snaptik", name: "Server 2", sub: "SnapTik (720p / Photo)" },
  ],
  instagram: [
    { id: "indown", name: "Server 1", sub: "InDown (Reels / Posts)" },
    {
      id: "savevid",
      name: "Server 2",
      sub: "SnapSave (Reels, Posts & Photos)",
    },
  ],
  youtube: [
    { id: "gg", name: "Server 1", sub: "YTMP3.gg (1080p / MP3)" },
    { id: "mobi", name: "Server 2", sub: "YTMP3.mobi (Fast MP4/MP3)" },
  ],
  twitter: [
    { id: "tvd", name: "Server 1", sub: "TVD (Full HD 1080p / 720p)" },
    { id: "tweeload", name: "Server 2", sub: "TweeLoad (SD 320p Video)" },
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
  if (
    url.includes("twitter.com") ||
    url.includes("x.com") ||
    url.includes("t.co")
  )
    return "twitter";
  if (url.includes("spotify.com")) return "spotify";
  if (url.includes("pinterest.com") || url.includes("pin.it"))
    return "pinterest";
  if (url.includes("music.apple.com")) return "applemusic";
  if (url.includes("facebook.com") || url.includes("fb.watch"))
    return "facebook";
  if (
    url.includes("xiaohongshu.com") ||
    url.includes("rednote.com") ||
    url.includes("xhslink.com") ||
    url.includes("xhslink.cn")
  )
    return "rednote";
  if (url.includes("douyin.com")) return "douyin";
  if (
    url.includes("bilibili.com") ||
    url.includes("b23.tv") ||
    url.includes("bili.im")
  )
    return "bilibili";
  if (url.includes("threads.net") || url.includes("threads.com"))
    return "threads";
  if (url.includes("bandcamp.com")) return "bandcamp";
  if (url.includes("pixiv.net")) return "pixiv";
  return "unknown";
}

function initUI() {
  applyShareLanguage();

  const theme = localStorage.getItem("mori_theme") || "dark";
  if (theme === "light") document.body.classList.add("light-theme");
  else document.body.classList.remove("light-theme");

  const font = localStorage.getItem("mori_font") || "display";
  document.body.classList.remove(
    "font-default",
    "font-jakarta",
    "font-serif",
    "font-mono",
    "font-display",
  );
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
    const serverName = srv.name.replace(
      "Server",
      lang["label-server"] || "Server",
    );
    btn.innerHTML = `<div class="pill-name">${serverName}</div><div class="pill-sub">${srv.sub}</div>`;
    btn.onclick = () => {
      selectedServer = srv.id;
      document
        .querySelectorAll(".server-pill")
        .forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
    };
    serverPills.appendChild(btn);
  });
}

window.dismissPanel = function () {
  if (window.MoriShareBridge?.dismiss) window.MoriShareBridge.dismiss();
};

window.cancelOrDismiss = function () {
  if (isAnalyzing) {
    // Cancel the ongoing analyze
    analyzeCancelled = true;
  } else {
    window.dismissPanel();
  }
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
  if (isAnalyzing) return;
  isAnalyzing = true;
  analyzeCancelled = false;

  const cancelBtn = document.getElementById("cancelBtn");
  const analyzingLabel = lang["loader-analyzing"] || "Analyzing link...";
  if (analyzeBtn) {
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `<span class="btn-spinner"></span><span>${analyzingLabel}</span>`;
  }
  // Repurpose cancel btn as stop-analyze
  if (cancelBtn) {
    cancelBtn.textContent = lang["btn-stop"] || "Stop";
    cancelBtn.removeAttribute("data-i18n");
  }

  errorSection.style.display = "none";
  downloadListSection.style.display = "none";
  serverSection.style.display = "none";
  statusSection.style.display = "block";

  const phrases = lang["loader-phrases"] || [analyzingLabel];
  let phraseIdx = 0;
  statusText.textContent = phrases[0];

  if (statusTimer) clearInterval(statusTimer);
  statusTimer = setInterval(() => {
    phraseIdx = (phraseIdx + 1) % phrases.length;
    statusText.textContent = phrases[phraseIdx];
  }, 1800);

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
      data = {
        status: false,
        message: lang["share-err-unsupported"] || "Unsupported platform link.",
      };
    }

    statusSection.style.display = "none";

    // Silently discard result if user cancelled during scrape
    if (analyzeCancelled) return;

    if (data && data.status) {
      activeResult = data.result;
      saveHistory(activeResult, targetUrl);
      renderDownloadList(activeResult);
    } else {
      showError(
        data?.message || lang["share-err-failed"] || "Failed to parse link.",
      );
    }
  } catch (err) {
    if (!analyzeCancelled) {
      statusSection.style.display = "none";
      showError(
        err.message ||
          lang["share-err-error"] ||
          "An error occurred during analysis.",
      );
    }
  } finally {
    if (statusTimer) {
      clearInterval(statusTimer);
      statusTimer = null;
    }
    isAnalyzing = false;
    if (analyzeBtn) {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = lang["btn-analyze"] || "Analyze";
    }
    // Restore cancel btn to dismiss
    if (cancelBtn) {
      cancelBtn.textContent = lang["btn-cancel"] || "Cancel";
      cancelBtn.setAttribute("data-i18n", "btn-cancel");
    }
    if (analyzeCancelled) {
      statusSection.style.display = "none";
      // Show server section again so user can retry
      if (SERVERS[currentPlatform]) serverSection.style.display = "block";
    }
  }
};

function showError(msg) {
  errorText.textContent = msg;
  errorSection.style.display = "block";
  if (SERVERS[currentPlatform]) {
    serverSection.style.display = "block";
  }
}

function renderDownloadList(result) {
  downloadList.innerHTML = "";
  const downloads = result.downloads || [];
  if (downloads.length === 0) {
    showError(lang["share-err-no-links"] || "No download links found.");
    return;
  }

  const optionLabel = lang["label-option"] || "Option";
  const downloadBadgeText = (
    lang["label-download"] || "DOWNLOAD"
  ).toUpperCase();

  downloads.forEach((dl, idx) => {
    const btn = document.createElement("button");
    btn.className = "dl-item-btn";
    btn.id = `dl_btn_${idx}`;
    let cleanType = (dl.type || "")
      .replace(/\s*\[(MP3|MP4|JPG|PNG|WEBP|Cover|Audio|Video)\]/gi, "")
      .trim();
    let label = cleanType || lang["label-download"] || "Download";
    if (dl.quality && !label.toLowerCase().includes(dl.quality.toLowerCase())) {
      label += ` - ${dl.quality}`;
    }

    btn.innerHTML = `
      <div style="text-align: left; flex: 1; min-width: 0; padding-right: 12px;">
        <div style="font-weight:600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${optionLabel} ${idx + 1}</div>
        <div class="dl-type" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}</div>
      </div>
      <div class="dl-badge" style="flex-shrink: 0;">${downloadBadgeText}</div>
    `;

    btn.onclick = () => triggerDownload(dl, result.title || "Mori_Media", idx);
    downloadList.appendChild(btn);
  });

  downloadListSection.style.display = "block";
  analyzeBtn.style.display = "none";
}

async function triggerDownload(dlItem, title, idx) {
  const btn = document.getElementById(`dl_btn_${idx}`);
  if (btn) {
    btn.classList.add("downloading");
    const badge = btn.querySelector(".dl-badge");
    if (badge) badge.textContent = lang["label-saving"] || "SAVING...";
  }

  const filename = generateFilename(title, dlItem.type, idx);
  const folder = getFolderForPlatform(currentPlatform);

  let finalUrl = dlItem.url;

  try {
    if (finalUrl.startsWith("applemusic_resolve:")) {
      const payloadStr = finalUrl.replace("applemusic_resolve:", "");
      const resRaw = window.MoriShareBridge.httpRequest(
        JSON.stringify({
          url: "https://aplmate.com/action/track",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
            Referer: "https://aplmate.com/",
            Origin: "https://aplmate.com",
          },
          data: payloadStr,
        }),
      );
      const res = JSON.parse(resRaw);
      let dd = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      let dlHtml = (typeof dd === "object" ? dd?.data : dd) || "";
      if (typeof dlHtml !== "string") dlHtml = JSON.stringify(dlHtml);
      const parser = new DOMParser();
      const doc = parser.parseFromString(dlHtml, "text/html");
      let foundLink = "";
      doc.querySelectorAll("a").forEach((a) => {
        const href = a.getAttribute("href");
        const text = a.textContent.trim();
        if (
          href &&
          (href.includes("/dl?token=") || a.classList.contains("abutton"))
        ) {
          if (
            href.includes("ko-fi.com") ||
            href.includes("premium.html") ||
            text.toLowerCase().includes("another song") ||
            text.toLowerCase().includes("cover") ||
            href.includes("cover=")
          )
            return;
          if (!foundLink)
            foundLink = href.startsWith("http")
              ? href
              : "https://aplmate.com" + href;
        }
      });
      if (foundLink) finalUrl = foundLink;
      else throw new Error("Could not resolve Apple Music download link");
    } else if (finalUrl.startsWith("spotidown_resolve:")) {
      const parts = finalUrl.replace("spotidown_resolve:", "").split("|||");
      const payloadStr = parts[0];
      const resRaw = window.MoriShareBridge.httpRequest(
        JSON.stringify({
          url: "https://spotidown.app/action/track",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": getUserAgent(),
            "X-Requested-With": "XMLHttpRequest",
            Referer: "https://spotidown.app/",
            Origin: "https://spotidown.app",
          },
          data: payloadStr,
        }),
      );
      const res = JSON.parse(resRaw);
      let dd = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      let dlHtml = (typeof dd === "object" ? dd?.data : dd) || "";
      if (typeof dlHtml !== "string") dlHtml = JSON.stringify(dlHtml);
      const parser = new DOMParser();
      const doc = parser.parseFromString(dlHtml, "text/html");
      let foundLink = "";
      doc.querySelectorAll("a").forEach((a) => {
        const href = a.getAttribute("href");
        const text = a.textContent.trim();
        if (
          href &&
          href.startsWith("http") &&
          !href.includes("premium.html") &&
          !href.includes("ko-fi.com") &&
          text !== "Download Another Song"
        ) {
          if (!foundLink) foundLink = href;
        }
      });
      if (foundLink) finalUrl = foundLink;
      else throw new Error("Could not resolve SpotiDown download link");
    } else if (finalUrl.startsWith("soundloaders_resolve:")) {
      const parts = finalUrl.replace("soundloaders_resolve:", "").split("|||");
      const dataVal = parts[0];
      const tokenVal = parts[1];
      const BASE = "https://soundloaders.app";
      const resRaw = window.MoriShareBridge.httpRequest(
        JSON.stringify({
          url: BASE + "/action/tracks",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": getUserAgent(),
            "X-Requested-With": "XMLHttpRequest",
            Referer: BASE + "/",
            Origin: BASE,
          },
          data:
            "data=" +
            encodeURIComponent(dataVal) +
            "&track_token=" +
            encodeURIComponent(tokenVal),
        }),
      );
      const res = JSON.parse(resRaw);
      let dd = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      let dlHtml = dd?.html || "";
      const match = dlHtml.match(
        /href=["'](https:\/\/dl\.soundloaders\.app\/cdnv1\?token=[^"']+)["']/,
      );
      if (match && match[1]) finalUrl = match[1];
      else throw new Error("Could not resolve Soundloaders download link");
    } else if (
      finalUrl.startsWith("youtube_resolve:") ||
      finalUrl.startsWith("ytmp3gg_resolve:")
    ) {
      const raw = finalUrl.startsWith("youtube_resolve:")
        ? finalUrl.replace("youtube_resolve:", "")
        : finalUrl.replace("ytmp3gg_resolve:", "");
      const parts = raw.split("|||");
      const ytId = parts[0];
      const format = parts[1] || "mp3";
      let downloadUrl = null;

      try {
        const initRaw = window.MoriShareBridge.httpRequest(
          JSON.stringify({
            url: "https://a.ymcdn.org/api/v1/init?p=y&23=1llum1n471",
            method: "GET",
            headers: {
              Origin: "https://ytmp3.mobi",
              Referer: "https://ytmp3.mobi/",
              "User-Agent": getUserAgent(),
            },
          }),
        );
        const initRes = JSON.parse(initRaw);
        const initData =
          typeof initRes.data === "string"
            ? JSON.parse(initRes.data)
            : initRes.data;

        if (initData && !initData.error && initData.convertURL) {
          const convRaw = window.MoriShareBridge.httpRequest(
            JSON.stringify({
              url: `${initData.convertURL}&v=${ytId}&f=${format}`,
              method: "GET",
              headers: {
                Origin: "https://ytmp3.mobi",
                Referer: "https://ytmp3.mobi/",
                "User-Agent": getUserAgent(),
              },
            }),
          );
          const convRes = JSON.parse(convRaw);
          const convData =
            typeof convRes.data === "string"
              ? JSON.parse(convRes.data)
              : convRes.data;

          if (convData && !convData.error) {
            let dlUrl = convData.downloadURL;
            let progUrl = convData.progressURL;
            let progress = 0;
            let attempts = 0;
            const maxAttempts = 30;

            while (progress < 3 && attempts < maxAttempts) {
              await new Promise((r) => setTimeout(r, 1500));
              if (!progUrl) break;

              const progRaw = window.MoriShareBridge.httpRequest(
                JSON.stringify({
                  url: progUrl,
                  method: "GET",
                  headers: {
                    Origin: "https://ytmp3.mobi",
                    Referer: "https://ytmp3.mobi/",
                    "User-Agent": getUserAgent(),
                  },
                }),
              );
              try {
                const progRes = JSON.parse(progRaw);
                const progData =
                  typeof progRes.data === "string"
                    ? JSON.parse(progRes.data)
                    : progRes.data || progRes;
                if (!progData || progData.error) break;
                progress = progData.progress;
                if (progData.downloadURL) dlUrl = progData.downloadURL;
                if (progress >= 3) break;
              } catch (_) {
                break;
              }
              attempts++;
            }

            if (dlUrl && progress >= 3) {
              if (dlUrl.startsWith("//")) dlUrl = "https:" + dlUrl;
              if (dlUrl.startsWith("/")) dlUrl = "https://ytmp3.mobi" + dlUrl;
              downloadUrl = dlUrl;
            }
          }
        }
      } catch (e) {}

      // Fallback: convert1s / ytmp3.gg
      if (!downloadUrl) {
        try {
          const convResRaw = window.MoriShareBridge.httpRequest(
            JSON.stringify({
              url: "https://hub.convert1s.com/api/download",
              method: "POST",
              headers: {
                Origin: "https://media.ytmp3.gg",
                Referer: "https://media.ytmp3.gg/",
                "User-Agent": getUserAgent(),
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json",
              },
              data: JSON.stringify({
                url: `https://www.youtube.com/watch?v=${ytId}`,
                os: "macos",
                output: {
                  type: format === "mp4" ? "video" : "audio",
                  format,
                  quality: "128",
                },
                audio: { bitrate: "128k" },
              }),
            }),
          );
          const convResObj = JSON.parse(convResRaw);
          let parsedConv =
            typeof convResObj.data === "string"
              ? JSON.parse(convResObj.data)
              : convResObj.data;
          if (parsedConv && !parsedConv.error && parsedConv.statusUrl) {
            let pollCount = 0;
            while (!downloadUrl && pollCount < 30) {
              await new Promise((r) => setTimeout(r, 1500));
              const pollRaw = window.MoriShareBridge.httpRequest(
                JSON.stringify({
                  url: parsedConv.statusUrl,
                  method: "GET",
                  headers: {
                    Origin: "https://media.ytmp3.gg",
                    Referer: "https://media.ytmp3.gg/",
                    "User-Agent": getUserAgent(),
                    Accept: "application/json, text/plain, */*",
                  },
                }),
              );
              const pollObj = JSON.parse(pollRaw);
              let poll =
                typeof pollObj.data === "string"
                  ? JSON.parse(pollObj.data)
                  : pollObj.data;
              if (poll && poll.status === "completed" && poll.downloadUrl) {
                downloadUrl = poll.downloadUrl;
                break;
              }
              if (
                poll &&
                (poll.status === "error" || poll.status === "failed")
              ) {
                break;
              }
              pollCount++;
            }
          }
        } catch (e2) {}
      }

      if (downloadUrl) finalUrl = downloadUrl;
      else throw new Error("Could not resolve YouTube download link");
    }
  } catch (err) {
    if (window.onDownloadFailed) {
      window.onDownloadFailed(
        filename,
        err.message || "Failed to resolve link",
      );
    }
    return;
  }

  if (window.MoriShareBridge?.downloadFile) {
    let dlHeaders = {
      Referer: targetUrl,
      "User-Agent": getUserAgent(),
    };
    if (finalUrl.includes("spotidown.app"))
      dlHeaders.Referer = "https://spotidown.app/";
    else if (finalUrl.includes("soundloaders.app"))
      dlHeaders.Referer = "https://soundloaders.app/";
    else if (finalUrl.includes("aplmate.com"))
      dlHeaders.Referer = "https://aplmate.com/";
    else if (
      finalUrl.includes("media.ytmp3.gg") ||
      finalUrl.includes("convert1s.com")
    ) {
      dlHeaders.Referer = "https://media.ytmp3.gg/";
      dlHeaders.Origin = "https://media.ytmp3.gg";
    } else if (
      finalUrl.includes("ymcdn.org") ||
      finalUrl.includes("ytmp3.mobi")
    ) {
      dlHeaders.Referer = "https://ytmp3.mobi/";
      dlHeaders.Origin = "https://ytmp3.mobi";
    }

    window.MoriShareBridge.downloadFile(
      finalUrl,
      filename,
      folder,
      JSON.stringify(dlHeaders),
      title,
    );
  }
}

function getFolderForPlatform(platform) {
  const subfolders = {
    tiktok: "TikTok",
    instagram: "Instagram",
    youtube: "YouTube",
    twitter: "Twitter",
    spotify: "Spotify",
    pinterest: "Pinterest",
    applemusic: "AppleMusic",
    facebook: "Facebook",
    rednote: "RedNote",
    douyin: "Douyin",
    bilibili: "Bilibili",
    threads: "Threads",
    bandcamp: "Bandcamp",
    pixiv: "Pixiv",
  };
  const base = localStorage.getItem("mori_download_path") || "Mori";
  const sub = subfolders[platform] || "";
  const autoFolder = localStorage.getItem("mori_auto_folder") !== "false";
  return autoFolder && sub ? `${base}/${sub}` : base;
}

function generateFilename(title, type, index) {
  const cleanTypeLabel = (type || "")
    .replace(/\s*\[(MP3|MP4|JPG|PNG|WEBP|Cover|Audio|Video)\]/gi, "")
    .trim();

  const isTrackType = /^\d+\.\s+/.test(cleanTypeLabel);
  let effectiveTitle = title || "Mori_Media";
  if (isTrackType) {
    effectiveTitle =
      cleanTypeLabel.replace(/^\d+\.\s+/, "").trim() || cleanTypeLabel;
  }

  let sanitized = (effectiveTitle || "")
    .replace(/[\\/:*?"<>|#%&{}[\]@$^+=~`';,]/g, "")
    .replace(/[^\w\s\-.\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/gi, "")
    .trim()
    .replace(/\s+/g, " ")
    .substring(0, 60);

  if (!sanitized) sanitized = "Mori_Media";

  let ext = "mp4";
  const t = (type || "").toLowerCase();
  if (t.includes("mp3") || t.includes("audio")) ext = "mp3";
  else if (t.includes("m4a")) ext = "m4a";
  else if (
    t.includes("jpg") ||
    t.includes("jpeg") ||
    t.includes("image") ||
    t.includes("photo") ||
    t.includes("cover")
  )
    ext = "jpg";
  else if (t.includes("png")) ext = "png";
  else if (t.includes("webp")) ext = "webp";

  ext = ext.toLowerCase();

  const template = localStorage.getItem("mori_filename") || "title";
  let finalName = `${sanitized}.${ext}`;

  if (template === "title-platform") {
    let platform = "Media";
    if (currentPlatform) {
      if (currentPlatform === "tiktok" || currentPlatform === "douyin")
        platform = "TikTok";
      else if (currentPlatform === "instagram") platform = "Instagram";
      else if (currentPlatform === "youtube") platform = "YouTube";
      else if (currentPlatform === "twitter") platform = "Twitter";
      else if (currentPlatform === "facebook") platform = "Facebook";
      else if (currentPlatform === "pinterest") platform = "Pinterest";
      else if (currentPlatform === "spotify") platform = "Spotify";
      else if (currentPlatform === "rednote") platform = "RedNote";
      else if (currentPlatform === "applemusic") platform = "AppleMusic";
      else if (currentPlatform === "bilibili") platform = "Bilibili";
      else if (currentPlatform === "pixiv") platform = "Pixiv";
      else if (currentPlatform === "bandcamp") platform = "Bandcamp";
    }
    finalName = `${sanitized}_${platform}.${ext}`;
  } else if (template === "title-date") {
    const dateStr = new Date().toISOString().split("T")[0];
    finalName = `${sanitized}_${dateStr}.${ext}`;
  } else if (template === "title") {
    finalName = `${sanitized}.${ext}`;
  } else {
    // title-timestamp
    finalName = `${sanitized}_${Date.now()}.${ext}`;
  }

  // Strictly enforce lowercase extension
  const dotP = finalName.lastIndexOf(".");
  if (dotP > 0 && dotP < finalName.length - 1) {
    finalName =
      finalName.substring(0, dotP) +
      "." +
      finalName.substring(dotP + 1).toLowerCase();
  }

  return finalName;
}

// Minimal History Sync
function saveHistory(result, url) {
  if (localStorage.getItem("mori_incognito") === "true") return;
  try {
    let history = JSON.parse(localStorage.getItem("mori_history") || "[]");
    let cleanTitle = (result.title || "Content")
      .replace(/#[^\s#]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    const targetClean = cleanUrl(url);

    const existingIdx = history.findIndex(
      (h) => cleanUrl(h.url) === targetClean,
    );
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
    const isAudio =
      savedPath.toLowerCase().endsWith(".mp3") ||
      savedPath.toLowerCase().endsWith(".m4a");

    if (history.length > 0) {
      const first = history[0];
      const localFiles = first.localFiles || [];
      if (!localFiles.find((f) => f.path === savedPath)) {
        const trackTitle = filename
          ? filename.replace(/\.[^/.]+$/, "")
          : first.title;
        localFiles.push({
          path: savedPath,
          uri: savedPath,
          type: isVideo ? "VIDEO" : isAudio ? "MP3" : "IMAGE",
          thumbnail: null,
          title: trackTitle,
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
  window.showToast(`${lang["toast-saved"] || "Saved:"} ${filename}`);

  const downloadBadgeText = (
    lang["label-download"] || "DOWNLOAD"
  ).toUpperCase();
  document.querySelectorAll(".dl-item-btn").forEach((btn) => {
    btn.classList.remove("downloading");
    const badge = btn.querySelector(".dl-badge");
    if (badge) badge.textContent = downloadBadgeText;
  });

  const isMulti =
    activeResult && activeResult.downloads && activeResult.downloads.length > 1;
  if (!isMulti) {
    setTimeout(() => window.dismissPanel(), 1000);
  }
};

window.onDownloadFailed = function (filename, error) {
  window.showToast(`${lang["toast-failed"] || "Failed:"} ${error}`);
  const downloadBadgeText = (
    lang["label-download"] || "DOWNLOAD"
  ).toUpperCase();
  document.querySelectorAll(".dl-item-btn").forEach((btn) => {
    btn.classList.remove("downloading");
    const badge = btn.querySelector(".dl-badge");
    if (badge) badge.textContent = downloadBadgeText;
  });
};

window.onMoriConfigReady = function () {
  initUI();
};

if (window.__MORI_SHARE_URL) {
  initUI();
}
