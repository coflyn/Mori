const urlInput = document.getElementById("urlInput");
const clearBtn = document.getElementById("clearBtn");
const pasteBtn = document.getElementById("pasteBtn");
const downloadBtn = document.getElementById("downloadBtn");
const loader = document.getElementById("loader");
const resultSection = document.getElementById("resultSection");
const resultTitle = document.getElementById("resultTitle");
const downloadList = document.getElementById("downloadList");
const closeResult = document.getElementById("closeResult");

// Slider Elements
const slidesWrapper = document.getElementById("slidesWrapper");
const sliderNav = document.getElementById("sliderNav");
const slidePrevBtn = document.getElementById("slidePrevBtn");
const slideNextBtn = document.getElementById("slideNextBtn");
const slideIndicator = document.getElementById("slideIndicator");
let currentSlideIndex = 0;
let slideData = [];

// History Edit Elements
const editHistoryBtn = document.getElementById("editHistoryBtn");
const historyActions = document.getElementById("historyActions");
const clearAllBtn = document.getElementById("clearAllBtn");
const doneEditBtn = document.getElementById("doneEditBtn");
let isEditingHistory = false;

// Modal Elements
const modalOverlay = document.getElementById("modalOverlay");
const closeModal = document.getElementById("closeModal");
const modalThumb = document.getElementById("modalThumb");
const modalTitle = document.getElementById("modalTitle");
const modalUrl = document.getElementById("modalUrl");
const redownloadBtn = document.getElementById("redownloadBtn");

// Confirm Modal Elements
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const okConfirmBtn = document.getElementById("okConfirmBtn");
const cancelConfirmBtn = document.getElementById("cancelConfirmBtn");

// Settings Elements
const clearCacheBtn = document.getElementById("clearCacheBtn");
const wipeDataBtn = document.getElementById("wipeDataBtn");
const platformVal = document.getElementById("platformVal");
const languageDropdown = document.getElementById("languageDropdown");
const languageTrigger = document.getElementById("languageTrigger");
const languageOptions = document.getElementById("languageOptions");
const currentLangDisplay = document.getElementById("currentLangDisplay");
const darkModeToggle = document.getElementById("darkModeToggle");

// Capacitor Plugins
const { CapacitorHttp, Filesystem, Toast, Clipboard, App } =
  window.Capacitor?.Plugins || {};

const CHROME_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";

function getCookiesFromHeaders(headers) {
  const raw = headers["Set-Cookie"] || headers["set-cookie"] || "";
  if (!raw) return "";
  if (Array.isArray(raw)) return raw.map((c) => c.split(";")[0]).join("; ");
  return raw
    .split(",")
    .map((c) => c.trim().split(";")[0])
    .join("; ");
}

function serializeData(obj) {
  return Object.keys(obj)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]))
    .join("&");
}

function decodeSnapSave(data) {
  try {
    const regex =
      /eval\(function\(h,u,n,t,e,r\)\{.*?\}\("(.*?)",(\d+),"(.*?)",(\d+),(\d+),(\d+)\)\)/;
    const match = data.match(regex);
    if (match) {
      const h = match[1],
        u = parseInt(match[2]),
        n = match[3],
        t = parseInt(match[4]),
        e = parseInt(match[5]);
      const delimiter = n[e],
        parts = h.split(delimiter);
      let decoded = "";
      for (let s of parts) {
        if (s === "") continue;
        let val = 0;
        for (let j = 0; j < s.length; j++)
          val += n.indexOf(s[j]) * Math.pow(e, s.length - 1 - j);
        decoded += String.fromCharCode(val - t);
      }
      return decodeURIComponent(escape(decoded));
    }
    return data;
  } catch (err) {
    return data;
  }
}

function extractFinalUrl(input) {
  if (!input) return null;
  let raw = input.trim().replace(/^["'\\]+|["'\\]+$/g, ""),
    isRender = false;
  if (raw.includes("get_progressApi")) {
    isRender = true;
    const tokenMatch = raw.match(/token=([^&'"]+)/);
    if (tokenMatch) raw = tokenMatch[1];
  }
  if (raw.includes(".") && !raw.startsWith("http")) {
    try {
      const payloadPart = raw.split(".")[1];
      if (payloadPart) {
        const payload = JSON.parse(atob(payloadPart));
        if (payload.video_url)
          return { url: payload.video_url, isRender: true };
        if (payload.url) return { url: payload.url, isRender: false };
      }
    } catch (e) {}
  }
  if (raw.startsWith("//")) return { url: "https:" + raw, isRender };
  if (raw.startsWith("/"))
    return { url: "https://snapsave.app" + raw, isRender };
  return { url: raw, isRender };
}

const progressBar = document.getElementById("progressBar");
const progressContainer = document.getElementById("progressContainer");
const loaderText = document.getElementById("loaderText");

// Init Theme
const savedTheme = localStorage.getItem("mori_theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
if (darkModeToggle) darkModeToggle.checked = savedTheme === "dark";

darkModeToggle?.addEventListener("change", (e) => {
  const theme = e.target.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("mori_theme", theme);
});

// Language Logic
const translations = {
  en: {
    "app-desc": "Minimalist Media Downloader",
    "input-placeholder": "Paste link here...",
    "btn-configure": "Configure",
    "loader-analyzing": "Analyzing link...",
    "greeting-ready": "Ready to save?",
    "greeting-morning": "Good Morning!",
    "greeting-afternoon": "Good Afternoon!",
    "greeting-evening": "Good Evening!",
    "greeting-night": "Good Night!",
    "label-platforms": "Supported Platforms",
    "nav-home": "Home",
    "nav-history": "History",
    "nav-settings": "Settings",
    "history-desc": "Your recent downloads",
    "settings-desc": "Configure your experience",
    "items-history": "items in your history",
    "label-general": "General Settings",
    "label-language": "Language",
    "label-darkmode": "Dark Mode",
    "label-storage": "Storage & Data",
    "label-storagesize": "Total Media Size",
    "label-clearcache": "Clear Cache",
    "label-wipedata": "Wipe All Data",
    "label-appinfo": "App Info",
    "label-version": "Version",
    "label-platform": "Platform",
    "label-developer": "Developer",
    "quote-simplicity": '"Simplicity is the ultimate sophistication."',
    "btn-edit": "EDIT",
    "btn-clear-all": "CLEAR ALL",
    "btn-done": "DONE",
    "btn-clear": "CLEAR",
    "btn-reset": "RESET",
    "btn-processing": "Processing...",
    "btn-downloading": "Downloading...",
    "label-content": "Content",
    "label-download": "Download",
    "label-error": "Error",
    "label-fatal": "Fatal",
    "loader-phrases": [
      "Analyzing link...",
      "Fetching media...",
      "Extracting data...",
      "Scraping content...",
      "Hunting for pixels...",
      "Processing request...",
      "Almost there...",
    ],
  },
  id: {
    "app-desc": "Pengunduh Media Minimalis",
    "input-placeholder": "Tempel tautan di sini...",
    "btn-configure": "Konfigurasi",
    "loader-analyzing": "Menganalisis tautan...",
    "greeting-ready": "Siap menyimpan?",
    "greeting-morning": "Selamat Pagi!",
    "greeting-afternoon": "Selamat Siang!",
    "greeting-sore": "Selamat Sore!",
    "greeting-evening": "Selamat Malam!",
    "greeting-night": "Selamat Malam!",
    "label-platforms": "Platform Didukung",
    "nav-home": "Beranda",
    "nav-history": "Riwayat",
    "nav-settings": "Pengaturan",
    "history-desc": "Unduhan terakhir Anda",
    "settings-desc": "Konfigurasi pengalaman Anda",
    "items-history": "item dalam riwayat",
    "label-general": "Pengaturan Umum",
    "label-language": "Bahasa",
    "label-darkmode": "Mode Gelap",
    "label-storage": "Penyimpanan & Data",
    "label-storagesize": "Total Ukuran Media",
    "label-clearcache": "Hapus Cache",
    "label-wipedata": "Hapus Semua Data",
    "label-appinfo": "Info Aplikasi",
    "label-version": "Versi",
    "label-platform": "Platform",
    "label-developer": "Pengembang",
    "quote-simplicity": '"Kesederhanaan adalah kecanggihan tertinggi."',
    "btn-edit": "UBAH",
    "btn-clear-all": "HAPUS SEMUA",
    "btn-done": "SELESAI",
    "btn-clear": "BERSIHKAN",
    "btn-reset": "RESET",
    "btn-processing": "Memproses...",
    "btn-downloading": "Mengunduh...",
    "label-content": "Konten",
    "label-download": "Unduh",
    "label-error": "Kesalahan",
    "label-fatal": "Fatal",
    "loader-phrases": [
      "Menganalisis tautan...",
      "Mengambil media...",
      "Mengekstrak data...",
      "Scraping konten...",
      "Mencari piksel...",
      "Memproses permintaan...",
      "Hampir selesai...",
    ],
  },
  ja: {
    "app-desc": "ミニマリストメディアダウンローダー",
    "input-placeholder": "リンクをここに貼り付け...",
    "btn-configure": "解析する",
    "loader-analyzing": "リンクを解析中...",
    "greeting-ready": "保存する准备はいい？",
    "greeting-morning": "おはよう！",
    "greeting-afternoon": "こんにちは！",
    "greeting-evening": "こんばんは！",
    "greeting-night": "おやすみなさい！",
    "label-platforms": "対応プラットフォーム",
    "nav-home": "ホーム",
    "nav-history": "履歴",
    "nav-settings": "設定",
    "history-desc": "最近のダウンロード",
    "settings-desc": "アプリの設定",
    "items-history": "件の履歴があります",
    "label-general": "一般設定",
    "label-language": "言語",
    "label-darkmode": "ダークモード",
    "label-storage": "ストレージとデータ",
    "label-storagesize": "合計メディアサイズ",
    "label-clearcache": "キャッシュを消去",
    "label-wipedata": "すべてのデータを消去",
    "label-appinfo": "アプリ情報",
    "label-version": "バージョン",
    "label-platform": "プラットフォーム",
    "label-developer": "開発者",
    "quote-simplicity": '"シンプルさは究極の洗練である。"',
    "btn-edit": "編集",
    "btn-clear-all": "すべて削除",
    "btn-done": "完了",
    "btn-clear": "クリア",
    "btn-reset": "リセット",
    "btn-processing": "処理中...",
    "btn-downloading": "ダウンロード中...",
    "label-content": "コンテンツ",
    "label-download": "ダウンロード",
    "label-error": "エラー",
    "label-fatal": "致命的",
    "loader-phrases": [
      "リンクを解析中...",
      "メディアを取得中...",
      "データを抽出中...",
      "コンテンツを収集中...",
      "ピクセルを探しています...",
      "リクエストを処理中...",
      "もうすぐ完了です...",
    ],
  },
};

let currentLang = localStorage.getItem("mori_lang") || "en";

function updateLanguageUI() {
  const lang = translations[currentLang];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (lang[key]) el.textContent = lang[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (lang[key]) el.placeholder = lang[key];
  });

  if (currentLangDisplay) {
    const langNames = { en: "English", id: "Indonesia", ja: "日本語" };
    currentLangDisplay.textContent = langNames[currentLang] || "English";
  }

  // Highlight selected option
  document.querySelectorAll(".dropdown-options .option").forEach((opt) => {
    opt.classList.toggle(
      "selected",
      opt.getAttribute("data-value") === currentLang,
    );
  });

  document.documentElement.lang = currentLang;

  updateGreeting();
}

const dynamicGreeting = document.getElementById("dynamicGreeting");
function updateGreeting() {
  const greetingText = document.getElementById("greetingText");
  const greetingStats = document.getElementById("greetingStats");
  const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  const lang = translations[currentLang];

  if (!greetingText || !greetingStats) return;

  const hours = new Date().getHours();
  let greeting = lang["greeting-ready"];
  if (hours >= 5 && hours < 12) greeting = lang["greeting-morning"];
  else if (hours >= 12 && hours < 15) greeting = lang["greeting-afternoon"];
  else if (hours >= 15 && hours < 18)
    greeting = lang["greeting-sore"] || lang["greeting-afternoon"];
  else if (hours >= 18 && hours < 21) greeting = lang["greeting-evening"];
  else greeting = lang["greeting-night"] || lang["greeting-evening"];

  greetingText.textContent = greeting;

  if (currentLang === "ja") {
    greetingStats.textContent = `履歴に ${history.length} ${lang["items-history"]}`;
  } else {
    greetingStats.textContent = `${history.length} ${lang["items-history"]}`;
  }
}

// Initial calls
updateLanguageUI();
updateStorageInfo();

async function updateStorageInfo() {
  const storageVal = document.getElementById("storageSizeVal");
  if (!storageVal || !Filesystem) return;

  try {
    let totalSize = 0;

    // Check CACHE
    try {
      const cacheDir = await Filesystem.readdir({
        path: "",
        directory: "CACHE",
      });
      for (const file of cacheDir.files) {
        if (file.type === "file") {
          const stats = await Filesystem.stat({
            path: file.name,
            directory: "CACHE",
          });
          totalSize += stats.size;
        }
      }
    } catch (e) {}

    // Check Mori in DOCUMENTS
    try {
      const docDir = await Filesystem.readdir({
        path: "",
        directory: "DOCUMENTS",
      });
      if (docDir.files.find((f) => f.name === "Mori")) {
        const moriFiles = await Filesystem.readdir({
          path: "Mori",
          directory: "DOCUMENTS",
        });
        for (const file of moriFiles.files) {
          if (file.type === "file") {
            const stats = await Filesystem.stat({
              path: "Mori/" + file.name,
              directory: "DOCUMENTS",
            });
            totalSize += stats.size;
          }
        }
      }
    } catch (e) {}

    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    storageVal.textContent = `${sizeInMB} MB`;
  } catch (e) {
    console.error("Storage size error:", e);
    storageVal.textContent = "0.00 MB";
  }
}

languageTrigger?.addEventListener("click", (e) => {
  e.stopPropagation();
  const isActive = languageDropdown?.classList.toggle("active");
  languageOptions?.classList.toggle("hidden");

  // Manage parent z-index
  const parentItem = languageDropdown?.closest(".settings-item");
  const parentSection = languageDropdown?.closest(".settings-section");
  if (parentItem) {
    parentItem.classList.toggle("active-dropdown", isActive);
  }
  if (parentSection) {
    parentSection.classList.toggle("active-section", isActive);
  }
});

document.querySelectorAll(".dropdown-options .option").forEach((opt) => {
  opt.addEventListener("click", (e) => {
    e.stopPropagation();
    currentLang = opt.getAttribute("data-value");
    localStorage.setItem("mori_lang", currentLang);
    updateLanguageUI();
    languageOptions?.classList.add("hidden");
    languageDropdown?.classList.remove("active");
    languageDropdown
      ?.closest(".settings-item")
      ?.classList.remove("active-dropdown");
    languageDropdown
      ?.closest(".settings-section")
      ?.classList.remove("active-section");

    let msg = "Language updated";
    if (currentLang === "id") msg = "Bahasa diperbarui";
    if (currentLang === "ja") msg = "言語を更新しました";
    showToast(msg);
  });
});

document.addEventListener("click", () => {
  languageOptions?.classList.add("hidden");
  languageDropdown?.classList.remove("active");
  languageDropdown
    ?.closest(".settings-item")
    ?.classList.remove("active-dropdown");
  languageDropdown
    ?.closest(".settings-section")
    ?.classList.remove("active-section");
});

pasteBtn?.addEventListener("click", async () => {
  try {
    let text = "";
    if (window.Capacitor?.isNativePlatform() && Clipboard) {
      try {
        const result = await Clipboard.read();
        text = result.value;
      } catch (err) {
        console.warn("Native clipboard read failed, falling back...", err);
        // Fallback to navigator if native fails (unlikely but possible)
        text = await navigator.clipboard.readText();
      }
    } else {
      text = await navigator.clipboard.readText();
    }

    if (text) {
      urlInput.value = text;
      urlInput.dispatchEvent(new Event("input"));
      showToast("Pasted from clipboard");
    } else {
      showToast("Clipboard is empty");
    }
  } catch (e) {
    console.error("Paste Error:", e);
    showToast("Clipboard access denied");
  }
});

urlInput.addEventListener("input", () => {
  const isEmpty = urlInput.value === "";
  clearBtn.classList.toggle("hidden", isEmpty);
  pasteBtn.classList.toggle("hidden", !isEmpty);
});

clearBtn.addEventListener("click", () => {
  urlInput.value = "";
  clearBtn.classList.add("hidden");
  pasteBtn.classList.remove("hidden");
  urlInput.focus();
});

closeResult?.addEventListener("click", () => {
  document.querySelectorAll(".preview-slide video").forEach((v) => {
    v.pause();
    v.src = "";
  });
  resultSection.classList.add("hidden");
  const supportedSection = document.querySelector(".supported-section");
  if (supportedSection) supportedSection.classList.remove("hidden");
  if (dynamicGreeting) dynamicGreeting.classList.remove("hidden");
  updateGreeting();
});

// Function to process shared text
function processSharedText(text) {
  if (!text) return;
  // Find a URL in the text
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  const finalUrl = urlMatch ? urlMatch[0] : text;

  urlInput.value = finalUrl;
  urlInput.dispatchEvent(new Event("input"));

  // Highlight the input
  urlInput.focus();
  showToast("Link Pasted from Share");

  // Auto-download after a short delay
  setTimeout(() => {
    if (urlInput.value === finalUrl) {
      downloadBtn.click();
    }
  }, 800);
}

// Handle Shared Intent from Native Android
window.addEventListener("moriShareIntent", (e) => {
  try {
    let data = e.detail;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        data = { text: data };
      }
    }
    const text = data?.text || data;
    if (typeof text === "string") processSharedText(text);
  } catch (err) {
    console.error("Share Intent Error:", err);
  }
});

// Startup check for shared text (fallback for cold starts)
setTimeout(() => {
  if (window.moriShareText) {
    processSharedText(window.moriShareText);
    window.moriShareText = null; // Clear it
  }
}, 1500);

// Handle Shared Intent / Deep Links (Standard URLs)
if (App) {
  App.addListener("appUrlOpen", (data) => {
    if (data.url) {
      urlInput.value = data.url;
      urlInput.dispatchEvent(new Event("input"));
      setTimeout(() => downloadBtn.click(), 500);
    }
  });

  App.getLaunchUrl().then((data) => {
    if (data && data.url) {
      urlInput.value = data.url;
      urlInput.dispatchEvent(new Event("input"));
      setTimeout(() => downloadBtn.click(), 500);
    }
  });
}

function cleanUrl(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch (e) {
    return url.split("?")[0].replace(/\/$/, "");
  }
}

function truncate(str, num = 80) {
  if (!str) return "";
  return str.length > num ? str.slice(0, num) + "..." : str;
}

// Clipboard Helper
async function copyToClipboard(text) {
  try {
    if (window.Capacitor?.isNativePlatform() && Clipboard) {
      await Clipboard.write({ string: text });
    } else {
      await navigator.clipboard.writeText(text);
    }
    showToast("Copied to clipboard");
  } catch (err) {
    console.error("Copy failed", err);
    showToast("Copy failed");
  }
}

// Toast Function
async function showToast(message) {
  console.log("[TOAST]", message);
  if (Toast) {
    await Toast.show({ text: message, duration: "short", position: "bottom" });
  } else {
    const toastEl = document.createElement("div");
    toastEl.className = "custom-toast";
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.classList.add("show"), 10);
    setTimeout(() => {
      toastEl.classList.remove("show");
      setTimeout(() => toastEl.remove(), 300);
    }, 3000);
  }
}

// Error Handling Helper
function handleScrapeError(err, status = null) {
  let msg = "Something went wrong.";
  if (status === 403 || status === 429) {
    msg = "IP Blocked! Please use a VPN or mobile data.";
  } else if (
    err.message?.includes("Token") ||
    err.message?.includes("selector")
  ) {
    msg = "Scraper outdated. Please wait for an update.";
  } else if (
    err.message?.includes("Network") ||
    err.message?.includes("fetch")
  ) {
    msg = "Network error. Check your connection.";
  } else if (err.message) {
    msg = err.message;
  }
  showToast(msg);
}

// Custom Confirm Function
function showConfirm(title, message, onConfirm) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmOverlay.classList.remove("hidden");

  okConfirmBtn.onclick = () => {
    onConfirm();
    confirmOverlay.classList.add("hidden");
  };

  cancelConfirmBtn.onclick = () => {
    confirmOverlay.classList.add("hidden");
  };
}

// History Edit Handlers
editHistoryBtn?.addEventListener("click", () => {
  isEditingHistory = true;
  editHistoryBtn.classList.add("hidden");
  historyActions.classList.remove("hidden");
  renderHistory();
});

doneEditBtn?.addEventListener("click", () => {
  isEditingHistory = false;
  editHistoryBtn.classList.remove("hidden");
  historyActions.classList.add("hidden");
  renderHistory();
});

clearAllBtn?.addEventListener("click", () => {
  showConfirm(
    "Clear All",
    "Are you sure you want to delete all download history?",
    () => {
      localStorage.removeItem("mori_history");
      isEditingHistory = false;
      editHistoryBtn.classList.remove("hidden");
      historyActions.classList.add("hidden");
      renderHistory();
    },
  );
});

// Clear Cache Logic
// Detect Platform
if (platformVal) {
  platformVal.textContent = window.Capacitor?.isNativePlatform()
    ? "Android"
    : "Web Browser";
}

clearCacheBtn?.addEventListener("click", () => {
  showConfirm(
    "Clear Cache",
    "This will delete temporary app data (thumbnails, etc.) but keep your downloads safe. Continue?",
    async () => {
      try {
        if (Filesystem) {
          // Clear only CACHE, keep DOCUMENTS/Mori safe
          try {
            const files = await Filesystem.readdir({
              path: "",
              directory: "CACHE",
            });
            for (const file of files.files) {
              await Filesystem.deleteFile({
                path: file.name,
                directory: "CACHE",
              });
            }
          } catch (e) {}
        }
        await updateStorageInfo();
        showToast("Cache cleared.");
      } catch (e) {
        showToast("Error clearing cache.");
      }
    },
  );
});

wipeDataBtn?.addEventListener("click", () => {
  showConfirm(
    "Wipe All Data",
    "This will permanently delete your history and all saved files. Continue?",
    async () => {
      try {
        localStorage.clear();
        if (Filesystem) {
          // Clear CACHE
          try {
            const cacheFiles = await Filesystem.readdir({
              path: "",
              directory: "CACHE",
            });
            for (const file of cacheFiles.files) {
              await Filesystem.deleteFile({
                path: file.name,
                directory: "CACHE",
              });
            }
          } catch (e) {}

          // Clear Mori folder in Documents
          try {
            const docDir = await Filesystem.readdir({
              path: "",
              directory: "DOCUMENTS",
            });
            if (docDir.files.find((f) => f.name === "Mori")) {
              const docFiles = await Filesystem.readdir({
                path: "Mori",
                directory: "DOCUMENTS",
              });
              for (const file of docFiles.files) {
                await Filesystem.deleteFile({
                  path: "Mori/" + file.name,
                  directory: "DOCUMENTS",
                });
              }
            }
          } catch (e) {}
        }
        await updateStorageInfo();
        renderHistory();
        showToast("All data wiped. Restarting...");
        setTimeout(() => location.reload(), 1500);
      } catch (e) {
        localStorage.clear();
        location.reload();
      }
    },
  );
});

// SCRAPERS
async function scrapeSoundCloud(url) {
  try {
    // Klickaud logic directly in native
    const r1 = await CapacitorHttp.get({
      url: "https://www.klickaud.org/en14",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const parser = new DOMParser();
    const doc1 = parser.parseFromString(r1.data, "text/html");

    // Klickaud often needs a CSRF token or just the session cookies
    const cookies = getCookiesFromHeaders(r1.headers);

    await CapacitorHttp.post({
      url: "https://www.klickaud.org/download.php",
      data: serializeData({ value: url }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
        "User-Agent": "Mozilla/5.0",
      },
    });

    // Klickaud uses SSE for the worker. Since CapacitorHttp doesn't support streaming,
    // we try to poll the worker endpoint or fallback to proxy.
    // However, the user wants the code here.
    const sseUrl = `https://www.klickaud.org/worker_sse.php?url=${encodeURIComponent(url)}`;

    // Fallback to proxy because SSE is mandatory for Klickaud's worker to trigger
    console.warn(
      "[NATIVE] Klickaud SSE detected. Attempting proxy fallback for stability.",
    );
    const proxyData = await scrapeProxy(url);
    if (proxyData.status) return proxyData;

    throw new Error(
      "Klickaud requires Server-Sent Events which is not supported natively.",
    );
  } catch (e) {
    console.error("[NATIVE] SoundCloud failed:", e);
    return await scrapeProxy(url);
  }
}

async function scrapeThreads(url) {
  try {
    const mainRes = await CapacitorHttp.get({
      url: "https://threadster.app/",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const cookies = mainRes.headers["set-cookie"] || "";

    const dlRes = await CapacitorHttp.post({
      url: "https://threadster.app/download",
      data: { url },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
      },
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(dlRes.data, "text/html");
    const downloads = [];
    doc.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      if (href && (href.includes("token=") || href.includes("acxcdn.com"))) {
        let finalUrl = href;
        let type = "VIDEO";
        try {
          const urlObj = new URL(href);
          const token = urlObj.searchParams.get("token");
          if (token) {
            const payloadPart = token.split(".")[1];
            if (payloadPart) {
              const payload = JSON.parse(atob(payloadPart));
              if (payload.url) {
                finalUrl = payload.url;
                const lowerUrl = finalUrl.toLowerCase();
                if (
                  lowerUrl.includes(".jpg") ||
                  lowerUrl.includes(".jpeg") ||
                  lowerUrl.includes(".png") ||
                  lowerUrl.includes(".webp")
                ) {
                  type = "IMAGE";
                }
              }
            }
          }
        } catch (e) {}
        downloads.push({ type, url: finalUrl });
      }
    });

    if (downloads.length === 0) throw new Error("No download links found.");
    return { status: true, result: { title: "Threads Media", downloads } };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

async function scrapeTikTok(url) {
  let currentStatus = null;
  try {
    const mainRes = await CapacitorHttp.get({
      url: "https://snaptik.app/en",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    currentStatus = mainRes.status;

    const parser = new DOMParser();
    const doc = parser.parseFromString(mainRes.data, "text/html");
    const token = doc.querySelector('input[name="token"]')?.value;
    if (!token) throw new Error("Scraper outdated (token missing).");

    const abcRes = await CapacitorHttp.post({
      url: "https://snaptik.app/abc2.php",
      data: { token, url },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    currentStatus = abcRes.status;

    const script1 = abcRes.data;
    const script2 = await new Promise((resolve, reject) => {
      try {
        const mockEval = (s) => resolve(s);
        const fn = new Function("eval", script1);
        fn(mockEval);
      } catch (e) {
        reject(new Error("Scraper outdated (eval failed)."));
      }
    });

    const capturedHtml = await new Promise((resolve, reject) => {
      let html = "";
      const context = {
        $: () => ({
          set innerHTML(t) {
            html = t;
          },
          remove: () => {},
          style: { display: "" },
        }),
        app: { showAlert: (msg) => reject(new Error(msg)) },
        document: { getElementById: () => ({ src: "" }) },
        fetch: () => {
          resolve(html);
          return { json: () => Promise.resolve({ thumbnail_url: "" }) };
        },
        gtag: () => {},
        Math: { round: () => 0 },
        XMLHttpRequest: function () {
          return { open: () => {}, send: () => {} };
        },
        window: { location: { hostname: "snaptik.app" } },
        setTimeout: () => {},
        setInterval: () => {},
        console: { log: () => {} },
      };
      try {
        const keys = Object.keys(context);
        const values = Object.values(context);
        const fn = new Function(...keys, script2);
        fn(...values);
        setTimeout(() => {
          if (html) resolve(html);
          else reject(new Error("Request timeout."));
        }, 1000);
      } catch (e) {
        reject(new Error("Execution failed."));
      }
    });

    const resDoc = parser.parseFromString(capturedHtml, "text/html");
    const downloads = [];
    const seenVideo = false;
    resDoc.querySelectorAll("a").forEach((a) => {
      let href = a.getAttribute("href");
      let text = a.textContent.trim().toLowerCase();
      if (href) {
        if (href.startsWith("/")) href = "https://snaptik.app" + href;

        // Filter out links that are not direct media downloads (acxcdn or token-based)
        const isCdnLink =
          href.includes("acxcdn.com") ||
          href.includes("token=") ||
          href.includes("download.php");
        const isWebRedirect =
          href.includes("/en/download") ||
          href.includes("/id/download") ||
          (href.includes("snaptik.app") &&
            !href.includes("token=") &&
            !href.includes(".php"));

        if (isCdnLink && !isWebRedirect) {
          if (text.includes("app")) return;

          let label = "VIDEO";
          if (text.includes("music") || text.includes("mp3")) label = "MP3";
          if (text.includes("photo")) label = "PHOTO";

          // Detect mirrors
          const isMirror =
            (label === "VIDEO" && downloads.some((d) => d.type === "VIDEO")) ||
            (label === "MP3" && downloads.some((d) => d.type === "MP3"));

          downloads.push({ type: label, url: href, isMirror });
        }
      }
    });

    const titleEl =
      resDoc.querySelector(".video-title") || resDoc.querySelector("h3");
    if (titleEl) {
      titleEl.querySelectorAll("a").forEach((a) => a.remove());
    }
    const title = titleEl?.textContent?.trim() || "TikTok Content";
    const thumbEl = resDoc.querySelector("img");
    const thumb = thumbEl
      ? thumbEl.getAttribute("src")?.startsWith("/")
        ? "https://snaptik.app" + thumbEl.getAttribute("src")
        : thumbEl.getAttribute("src")
      : null;

    return {
      status: true,
      result: { title, thumbnail: thumb, downloads, sourceUrl: url },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

async function scrapeInstagram(url) {
  let currentStatus = null;
  try {
    const cleanUrl = url.split("?")[0];
    const res1 = await CapacitorHttp.get({
      url: "https://indown.io/",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    currentStatus = res1.status;

    const cookies =
      res1.headers["Set-Cookie"] || res1.headers["set-cookie"] || "";
    const parser = new DOMParser();
    const doc1 = parser.parseFromString(res1.data, "text/html");
    const token = doc1.querySelector('input[name="_token"]')?.value;

    if (!token) throw new Error("Scraper outdated (token missing).");

    const res2 = await CapacitorHttp.post({
      url: "https://indown.io/download",
      data: { link: cleanUrl, _token: token },
      headers: {
        Cookie: cookies,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
      },
    });
    currentStatus = res2.status;

    const doc2 = parser.parseFromString(res2.data, "text/html");
    const downloads = [];
    let thumbnail = null;

    doc2.querySelectorAll(".container .row .col-md-4").forEach((el) => {
      const a = el.querySelector("a");
      const img = el.querySelector("img");
      let href = a?.getAttribute("href");
      let imgSrc = img?.getAttribute("src");

      if (imgSrc && !imgSrc.includes("logo")) {
        imgSrc = imgSrc.startsWith("/") ? "https://indown.io" + imgSrc : imgSrc;
        if (!thumbnail) thumbnail = imgSrc;
      }

      if (href && href.includes("fetch?url=")) {
        if (href.startsWith("/")) href = "https://indown.io" + href;

        // Extract real URL for preview
        let realUrl = href;
        if (href.includes("fetch?url=")) {
          try {
            // Get everything after fetch?url= and decode it
            realUrl = decodeURIComponent(href.split("fetch?url=")[1]);
          } catch (e) {}
        }

        const type =
          href.includes(".mp4") ||
          href.includes("video") ||
          realUrl.includes(".mp4")
            ? "VIDEO"
            : "IMAGE";

        // Detect mirror: if same URL already exists
        const isMirror = downloads.some((d) => d.url === href);

        downloads.push({
          type,
          url: href,
          thumbnail: realUrl, // Use real URL as thumbnail/preview
          isMirror,
        });
      }
    });

    if (downloads.length === 0) {
      doc2.querySelectorAll("a").forEach((a) => {
        let href = a.getAttribute("href");
        if (href && href.includes("fetch?url=")) {
          if (href.startsWith("/")) href = "https://indown.io" + href;
          const type =
            href.includes(".mp4") || href.includes("video") ? "VIDEO" : "IMAGE";
          const isMirror = downloads.some((d) => d.url === href);
          downloads.push({ type, url: href, isMirror });
        }
      });
    }

    if (downloads.length === 0)
      throw new Error("Media links not found. Post might be private.");

    const title =
      doc2.querySelector("h5")?.textContent?.trim() || "Instagram Content";
    if (!thumbnail) {
      const img = doc2.querySelector('.row img:not([src*="logo"])');
      if (img) {
        thumbnail = img.src.startsWith("/")
          ? "https://indown.io" + img.src
          : img.src;
      }
    }

    return {
      status: true,
      result: { title, thumbnail, downloads, sourceUrl: url },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

async function scrapeYouTube(url) {
  let currentStatus = null;
  try {
    const res = await CapacitorHttp.post({
      url: "https://app.ytdown.to/proxy.php",
      data: { url: url },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0",
      },
    });
    currentStatus = res.status;

    const data = res.data;
    if (!data || !data.api || data.api.status !== "ok") {
      throw new Error(data?.api?.message || "YouTube scraper error.");
    }

    const { title, imagePreviewUrl, mediaItems } = data.api;
    const downloads = mediaItems.map((item) => ({
      type: `${item.mediaExtension.toUpperCase()} ${item.mediaQuality}`,
      url: item.mediaUrl,
    }));

    return {
      status: true,
      result: {
        title: title || "YouTube Content",
        thumbnail: imagePreviewUrl,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

async function scrapeTwitter(url) {
  let currentStatus = null;
  try {
    const twitterUrl = url.replace(
      /https:\/\/(fixupx|fxtwitter|vxtwitter|nitter|twitter)\.com/g,
      "https://x.com",
    );
    const r1 = await CapacitorHttp.get({
      url: "https://tweeload.com/en",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    currentStatus = r1.status;

    const parser = new DOMParser();
    const doc1 = parser.parseFromString(r1.data, "text/html");

    const r2 = await CapacitorHttp.post({
      url: "https://tweeload.com/en/download",
      data: serializeData({ url: twitterUrl }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
      },
    });
    currentStatus = r2.status;

    const doc2 = parser.parseFromString(r2.data, "text/html");
    const downloads = [];

    doc2
      .querySelectorAll(".download__item__info__actions tbody tr")
      .forEach((tr) => {
        const tds = tr.querySelectorAll("td");
        const quality = tds[0]?.textContent?.trim();
        let dlUrl = tr
          .querySelector("a.download__item__info__actions__button")
          ?.getAttribute("href");
        if (dlUrl) {
          if (dlUrl.startsWith("/")) dlUrl = "https://tweeload.com" + dlUrl;

          const label = quality ? quality + " VIDEO" : "VIDEO";
          const isMirror = downloads.some((d) => d.type.includes("VIDEO"));

          downloads.push({ type: label, url: dlUrl, isMirror });
        }
      });

    if (downloads.length === 0) {
      doc2.querySelectorAll("a.btn").forEach((a) => {
        let href = a.getAttribute("href");
        if (
          href &&
          (href.includes("downloads.acxcdn.com") ||
            href.includes("twimg.com") ||
            href.includes("tweeload"))
        ) {
          const text = a.textContent.trim();
          if (text.toLowerCase() !== "download via the mobile app") {
            // Be more aggressive: everything is a video unless it specifically says image
            const isImage =
              href.includes("/image?") || text.toLowerCase().includes("image");
            const isVideo = !isImage;

            const label = isVideo
              ? text.includes("HD")
                ? "HD VIDEO"
                : "VIDEO"
              : "IMAGE";
            const isMirror =
              isVideo && downloads.some((d) => d.type.includes("VIDEO"));

            downloads.push({ type: label, url: href, isMirror });
          }
        }
      });
    }

    if (downloads.length === 0) throw new Error("Twitter links not found.");

    const name = doc2
      .querySelector(".download__item__info__user__name")
      ?.textContent?.trim();
    const handle = doc2
      .querySelector(".download__item__info__user__handle")
      ?.textContent?.trim();

    return {
      status: true,
      result: {
        title: name ? `${name} (${handle})` : "Twitter Content",
        thumbnail: null,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

async function scrapeSpotify(url) {
  let currentStatus = null;
  try {
    const r1 = await CapacitorHttp.get({
      url: "https://spotidown.app/",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    currentStatus = r1.status;

    const parser = new DOMParser();
    const doc1 = parser.parseFromString(r1.data, "text/html");

    const form = doc1.querySelector('form[name="spotifyurl"]');
    const data = { url: url };
    form?.querySelectorAll("input").forEach((input) => {
      const name = input.getAttribute("name");
      const value = input.getAttribute("value") || "";
      if (name && name !== "url") data[name] = value;
    });

    const r2 = await CapacitorHttp.post({
      url: "https://spotidown.app/action",
      data: serializeData(data),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": CHROME_UA,
        Origin: "https://spotidown.app",
        Referer: "https://spotidown.app/",
        "X-Requested-With": "",
      },
    });

    let r2Data = r2.data;
    if (
      typeof r2Data === "string" &&
      (r2Data.trim().startsWith("{") || r2Data.trim().startsWith("["))
    ) {
      try {
        r2Data = JSON.parse(r2Data);
      } catch (e) {}
    }

    if (r2Data.error)
      throw new Error("Step 2: " + (r2Data.message || "Spotify error"));

    let finalHtml = r2Data.data;
    const doc2 = parser.parseFromString(finalHtml, "text/html");
    const form2 = doc2.querySelector('form[name="submitspurl"]');

    if (form2) {
      const data2 = {};
      form2.querySelectorAll("input").forEach((input) => {
        const name = input.getAttribute("name");
        const value = input.getAttribute("value") || "";
        if (name) data2[name] = value;
      });

      const r3 = await CapacitorHttp.post({
        url: "https://spotidown.app/action/track",
        data: serializeData(data2),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": CHROME_UA,
          Origin: "https://spotidown.app",
          Referer: "https://spotidown.app/",
          "X-Requested-With": "",
        },
      });

      let r3Data = r3.data;
      if (
        typeof r3Data === "string" &&
        (r3Data.trim().startsWith("{") || r3Data.trim().startsWith("["))
      ) {
        try {
          r3Data = JSON.parse(r3Data);
        } catch (e) {}
      }
      finalHtml = r3Data.data || r3Data;
    }

    const doc3 = parser.parseFromString(finalHtml, "text/html");
    const title =
      doc3.querySelector("h3")?.textContent?.trim() ||
      doc3.querySelector("h1")?.textContent?.trim() ||
      "Spotify Track";
    const artist = doc3.querySelector("p")?.textContent?.trim();
    const thumbnail = doc3.querySelector("img")?.getAttribute("src");
    const downloads = [];

    doc3.querySelectorAll("a").forEach((a) => {
      const link = a.getAttribute("href");
      const text = a.textContent.trim();
      if (
        link &&
        link.startsWith("http") &&
        !link.includes("premium.html") &&
        text !== "Download Another Song"
      ) {
        downloads.push({ type: text || "MP3", url: link });
      }
    });

    if (downloads.length === 0) throw new Error("Spotify links not found.");

    return {
      status: true,
      result: {
        title: artist ? `${artist} - ${title}` : title,
        thumbnail,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

async function scrapePinterest(url) {
  let currentStatus = null;
  try {
    const r1 = await CapacitorHttp.get({
      url: "https://pindown.io/",
      headers: { "User-Agent": CHROME_UA },
    });
    currentStatus = r1.status;

    const cookies = getCookiesFromHeaders(r1.headers);
    const parser = new DOMParser();
    const doc1 = parser.parseFromString(r1.data, "text/html");

    const tokenInput = doc1.querySelector(
      'input[type="hidden"]:not([name="lang"])',
    );
    const tokenName = tokenInput?.getAttribute("name");
    const tokenValue = tokenInput?.getAttribute("value");

    if (!tokenName || !tokenValue)
      throw new Error("Pinterest token not found.");

    const r2 = await CapacitorHttp.post({
      url: "https://pindown.io/action",
      data: serializeData({ url, [tokenName]: tokenValue, lang: "en" }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookies,
        "User-Agent": CHROME_UA,
      },
    });
    currentStatus = r2.status;

    let r2Data = r2.data;
    if (typeof r2Data === "string") r2Data = JSON.parse(r2Data);

    if (!r2Data.success || !r2Data.html)
      throw new Error(r2Data.message || "Pinterest extract failed.");

    const doc2 = parser.parseFromString(r2Data.html, "text/html");
    const downloads = [];

    doc2.querySelectorAll(".columns .column").forEach((el) => {
      const title = el.querySelector(".is-size-6")?.textContent?.trim();
      const btn = el.querySelector(".button");
      let dlUrl = btn?.getAttribute("href");
      const onclick = btn?.getAttribute("onclick");
      const isApi = onclick && onclick.includes("fetchVideoUrl");

      if (isApi) {
        const match = onclick.match(/'([^']+)'/);
        if (match) dlUrl = "https://pindown.io" + match[1];
      }

      if (dlUrl) {
        downloads.push({
          type: title || "DOWNLOAD",
          url: dlUrl,
          isApi: !!isApi,
        });
      }
    });

    for (let dl of downloads) {
      if (dl.isApi) {
        try {
          const apiRes = await CapacitorHttp.get({
            url: dl.url,
            headers: { Cookie: cookies },
          });
          let apiData = apiRes.data;
          if (typeof apiData === "string") apiData = JSON.parse(apiData);
          if (apiData.success && apiData.url) dl.url = apiData.url;
        } catch (e) {}
      }
    }

    return {
      status: true,
      result: {
        title:
          doc2.querySelector("h3")?.textContent?.trim() || "Pinterest Content",
        thumbnail: doc2.querySelector(".image img")?.getAttribute("src"),
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

async function scrapeAppleMusic(url) {
  let currentStatus = null;
  try {
    const headers = {
      "User-Agent": CHROME_UA,
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
    };

    const r1 = await CapacitorHttp.get({
      url: "https://aplmate.com/",
      headers: { ...headers, Accept: "text/html" },
    });
    currentStatus = r1.status;
    const cookies = getCookiesFromHeaders(r1.headers);

    const r2 = await CapacitorHttp.post({
      url: "https://aplmate.com/action/userverify",
      data: serializeData({ url }),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookies,
      },
    });

    let r2Data = r2.data;
    if (typeof r2Data === "string") r2Data = JSON.parse(r2Data);
    const token = r2Data.success ? r2Data.token : null;
    if (!token) throw new Error(r2Data.message || "Verification failed.");

    const r3 = await CapacitorHttp.post({
      url: "https://aplmate.com/action",
      data: serializeData({ url, "cf-turnstile-response": token }),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
      },
    });

    let r3Data = r3.data;
    if (typeof r3Data === "string") r3Data = JSON.parse(r3Data);
    if (r3Data.error) throw new Error(r3Data.message || "Action failed.");

    const parser = new DOMParser();
    let finalHtml = r3Data.html;
    const doc2 = parser.parseFromString(finalHtml, "text/html");
    const form2 = doc2.querySelector('form[name="submitapurl"]');

    if (form2) {
      const data2 = {};
      form2.querySelectorAll("input").forEach((input) => {
        const name = input.getAttribute("name");
        const value = input.getAttribute("value") || "";
        if (name) data2[name] = value;
      });

      const r4 = await CapacitorHttp.post({
        url: "https://aplmate.com/action/track",
        data: serializeData(data2),
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies,
        },
      });
      let r4Data = r4.data;
      if (typeof r4Data === "string") r4Data = JSON.parse(r4Data);
      finalHtml = r4Data.data || r4Data;
    }

    const doc3 = parser.parseFromString(finalHtml, "text/html");
    const title =
      doc3.querySelector(".hover-underline")?.textContent?.trim() ||
      doc3.querySelector("h3")?.textContent?.trim() ||
      "Apple Music Content";
    const artist = doc3.querySelector("p")?.textContent?.trim();
    const thumbnail = doc3.querySelector("img")?.getAttribute("src");
    const downloads = [];

    doc3.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      const text = a.textContent.trim();
      if (
        href &&
        (href.includes("/dl?token=") || a.classList.contains("abutton"))
      ) {
        if (href.includes("ko-fi.com") || href.includes("premium.html")) return;
        if (text.toLowerCase().includes("another song")) return;
        downloads.push({
          type: text || "MP3",
          url: href.startsWith("http") ? href : "https://aplmate.com" + href,
        });
      }
    });

    return {
      status: true,
      result: {
        title: artist ? `${artist} - ${title}` : title,
        thumbnail,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

async function scrapeFacebook(url) {
  let currentStatus = null;
  try {
    const headers = {
      "User-Agent": CHROME_UA,
      Origin: "https://snapsave.app",
      Referer: "https://snapsave.app/id",
    };

    const r1 = await CapacitorHttp.get({
      url: "https://snapsave.app/id",
      headers: { ...headers, Accept: "text/html" },
    });
    currentStatus = r1.status;
    const cookies = getCookiesFromHeaders(r1.headers);

    const r2 = await CapacitorHttp.post({
      url: "https://snapsave.app/action.php?lang=id",
      data: serializeData({ url }),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
      },
    });
    currentStatus = r2.status;

    const decodedHtml = decodeSnapSave(r2.data);
    const parser = new DOMParser();
    const doc = parser.parseFromString(decodedHtml, "text/html");
    const downloads = [];

    doc.querySelectorAll("table tbody tr").forEach((tr) => {
      const qTd = tr.querySelector("td.video-quality");
      const quality = qTd
        ? qTd.textContent.trim()
        : tr.querySelectorAll("td")[0]?.textContent?.trim();
      const btn =
        tr.querySelector("a.btn-download") ||
        tr.querySelector("button") ||
        tr.querySelector("a");
      let linkAttr = btn?.getAttribute("href") || btn?.getAttribute("onclick");

      const extracted = extractFinalUrl(linkAttr);
      if (extracted && extracted.url.startsWith("http")) {
        downloads.push({ type: quality || "VIDEO", url: extracted.url });
      }
    });

    if (downloads.length === 0)
      throw new Error("Could not extract download links.");
    return {
      status: true,
      result: { title: "Facebook Media", downloads, sourceUrl: url },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

async function scrapeProxy(url) {
  try {
    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return await res.json();
  } catch (e) {
    return { status: false, message: "Local server not available." };
  }
}

downloadBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  if (!url) return;

  const phrases = translations[currentLang]["loader-phrases"];
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  const loaderText = loader.querySelector("p");
  if (loaderText) loaderText.textContent = randomPhrase;

  const supportedSection = document.querySelector(".supported-section");
  resultSection.classList.add("hidden");
  // Hide supportedSection when starting a download/preview
  if (supportedSection) supportedSection.classList.add("hidden");
  if (dynamicGreeting) dynamicGreeting.classList.add("hidden");

  // Stop any previous media playing in background
  document.querySelectorAll("video").forEach((v) => {
    v.pause();
    v.src = "";
    v.load();
  });

  loader.classList.remove("hidden");
  downloadBtn.disabled = true;
  downloadBtn.textContent = translations[currentLang]["btn-processing"];

  try {
    let data;
    if (CapacitorHttp) {
      console.log("[NATIVE] Using CapacitorHttp for:", url);
      if (url.includes("tiktok.com")) {
        data = await scrapeTikTok(url);
      } else if (url.includes("instagram.com")) {
        data = await scrapeInstagram(url);
      } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
        data = await scrapeYouTube(url);
      } else if (url.includes("twitter.com") || url.includes("x.com")) {
        data = await scrapeTwitter(url);
      } else if (url.includes("spotify.com")) {
        data = await scrapeSpotify(url);
      } else if (url.includes("pinterest.com") || url.includes("pin.it")) {
        data = await scrapePinterest(url);
      } else if (url.includes("music.apple.com")) {
        data = await scrapeAppleMusic(url);
      } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
        data = await scrapeFacebook(url);
      } else if (url.includes("soundcloud.com")) {
        data = await scrapeSoundCloud(url);
      } else if (url.includes("threads.net") || url.includes("threads.com")) {
        data = await scrapeThreads(url);
      } else {
        data = { status: false, message: "URL not supported yet." };
      }
    } else {
      console.log("[PROXY] Falling back to server proxy");
      data = await scrapeProxy(url);
    }

    if (data && data.status) {
      saveToHistory(data.result, url);
      renderResult(data.result, url);
      loader.classList.add("hidden");
    } else {
      const errMsg = data?.message || "Unknown error occurred.";
      handleScrapeError(data, data?.statusCode);
      if (loaderText)
        loaderText.textContent =
          translations[currentLang]["label-error"] + ": " + errMsg;
      setTimeout(() => loader.classList.add("hidden"), 3000);
      if (supportedSection) supportedSection.classList.remove("hidden");
    }
  } catch (err) {
    console.error("[CRITICAL] Download Flow Error:", err);
    if (loaderText)
      loaderText.textContent =
        translations[currentLang]["label-fatal"] + ": " + err.message;
    showToast("Fatal error: " + err.message);
    setTimeout(() => loader.classList.add("hidden"), 5000);
    if (supportedSection) supportedSection.classList.remove("hidden");
  }

  downloadBtn.disabled = false;
  downloadBtn.textContent = translations[currentLang]["btn-configure"];
});

function updateSliderUI() {
  const slides = document.querySelectorAll(".preview-slide");
  const sliderItems = slideData.filter((dl) => !dl.isMirror);

  slides.forEach((slide, index) => {
    const video = slide.querySelector("video");
    if (index === currentSlideIndex) {
      slide.classList.add("active");
      if (video) {
        if (video.readyState < 1) video.load(); // Ensure it's loading if not yet
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    } else {
      slide.classList.remove("active");
      if (video) video.pause();
    }
  });
  slideIndicator.textContent = `${currentSlideIndex + 1} / ${sliderItems.length}`;
  slidePrevBtn.disabled = currentSlideIndex === 0;
  slidePrevBtn.disabled = currentSlideIndex === 0;
  slideNextBtn.disabled = currentSlideIndex === sliderItems.length - 1;
}

slidePrevBtn?.addEventListener("click", () => {
  const sliderItems = slideData.filter((dl) => !dl.isMirror);
  if (currentSlideIndex > 0) {
    currentSlideIndex--;
    updateSliderUI();
  }
});

slideNextBtn?.addEventListener("click", () => {
  const sliderItems = slideData.filter((dl) => !dl.isMirror);
  if (currentSlideIndex < sliderItems.length - 1) {
    currentSlideIndex++;
    updateSliderUI();
  }
});

function renderResult(result, originalUrl) {
  slideData = result.downloads;
  currentSlideIndex = 0;

  const sliderItems = slideData.filter((dl) => !dl.isMirror);

  if (slidesWrapper) {
    slidesWrapper.innerHTML = "";

    const isSinglePreview =
      /youtube\.com|youtu\.be|soundcloud\.com|spotify\.com|music\.apple\.com/i.test(
        urlInput.value,
      ) ||
      (result.title &&
        /youtube|soundcloud|spotify|apple music/i.test(
          result.title.toLowerCase(),
        ));

    if (sliderItems.length > 0 && !isSinglePreview) {
      sliderItems.forEach((dl, index) => {
        const slide = document.createElement("div");
        slide.className = "preview-slide" + (index === 0 ? " active" : "");

        const lowerUrl = dl.url.toLowerCase();
        const upperType = dl.type.toUpperCase();

        const isImage =
          lowerUrl.includes(".jpg") ||
          lowerUrl.includes(".jpeg") ||
          lowerUrl.includes(".png") ||
          lowerUrl.includes(".webp") ||
          upperType.includes("IMAGE") ||
          upperType.includes("PHOTO");

        const isVideo =
          !isImage &&
          (lowerUrl.includes(".mp4") ||
            lowerUrl.includes(".m3u8") ||
            lowerUrl.includes("video") ||
            lowerUrl.includes("tweeload.com/download") ||
            upperType.includes("VIDEO") ||
            upperType.includes("MP4") ||
            /^\d+p/.test(dl.type) ||
            (upperType === "DOWNLOAD" &&
              (lowerUrl.includes(".mp4") || lowerUrl.includes("video"))));

        if (isVideo) {
          const video = document.createElement("video");
          video.src = dl.url;
          video.controls = true;
          video.loop = true;
          video.muted = false;
          video.preload = index === 0 ? "auto" : "metadata";
          video.autoplay = index === 0;
          video.playsInline = true;
          slide.appendChild(video);
        } else if (dl.url.includes(".mp3") || dl.type.includes("MP3")) {
          // Audio preview on Home
          const img = document.createElement("img");
          img.src = dl.thumbnail || result.thumbnail || "";
          img.style.maxHeight = "200px";
          img.style.marginBottom = "10px";
          slide.appendChild(img);

          const audio = document.createElement("audio");
          audio.src = dl.url;
          audio.controls = true;
          audio.muted = false;
          audio.style.width = "100%";
          slide.appendChild(audio);
        } else {
          const img = document.createElement("img");
          const imgUrl = dl.thumbnail || dl.url;
          img.src = imgUrl;
          img.referrerPolicy = "no-referrer";
          img.decoding = "async";
          img.loading = "lazy";

          img.onerror = async () => {
            // Fallback for Android: Fetch via CapacitorHttp to bypass CORS/Hotlink protection
            if (
              window.Capacitor?.isNativePlatform() &&
              CapacitorHttp &&
              !img.dataset.retry
            ) {
              try {
                img.dataset.retry = "true";
                const res = await CapacitorHttp.get({
                  url: imgUrl,
                  responseType: "blob",
                  headers: { "User-Agent": "Mozilla/5.0" },
                });
                if (res.status === 200) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    img.src = reader.result;
                  };
                  reader.readAsDataURL(res.data);
                } else {
                  img.style.display = "none";
                }
              } catch (e) {
                img.style.display = "none";
              }
            } else {
              img.style.display = "none";
            }
          };
          slide.appendChild(img);
        }

        slidesWrapper.appendChild(slide);
      });

      if (sliderItems.length > 1) {
        sliderNav.classList.remove("hidden");
        slideIndicator.textContent = `${currentSlideIndex + 1} / ${sliderItems.length}`;
        updateSliderUI();
      } else {
        sliderNav.classList.add("hidden");
      }
    } else {
      // Single preview (YouTube or single image/video)
      const slide = document.createElement("div");
      slide.className = "preview-slide active";
      const img = document.createElement("img");
      const thumb = result.thumbnail || "";
      img.src = thumb.includes("logo") ? "" : thumb;
      img.onerror = () => (img.style.display = "none");
      slide.appendChild(img);
      slidesWrapper.appendChild(slide);
      sliderNav.classList.add("hidden");
    }
  }

  let cleanTitleText =
    result.title || translations[currentLang]["label-content"];
  // Regex to remove hashtags but preserve text around them:
  cleanTitleText = cleanTitleText
    .replace(/#[^\s#]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  resultTitle.textContent = truncate(cleanTitleText, 80);

  downloadList.innerHTML = "";
  result.downloads.forEach((dl, index) => {
    const btn = document.createElement("button");
    btn.className = "dl-item";
    btn.innerHTML = `<div>${translations[currentLang]["label-download"]} ${index + 1}</div><span>${dl.type}</span>`;
    btn.addEventListener("click", (e) =>
      startNativeDownload(
        dl.url,
        dl.type,
        result.title,
        e.currentTarget,
        result.sourceUrl || originalUrl || urlInput.value.trim(),
      ),
    );
    downloadList.appendChild(btn);
  });
  resultSection.classList.remove("hidden");
  const supportedSection = document.querySelector(".supported-section");
  if (supportedSection) supportedSection.classList.add("hidden");
  resultSection.scrollIntoView({ behavior: "smooth" });
}

async function startNativeDownload(url, type, title, btn, sourceUrl) {
  if (!Filesystem) {
    window.open(url, "_blank");
    return;
  }

  const finalUrl =
    url.startsWith("/") && !url.startsWith("/api/")
      ? "https://snaptik.app" + url
      : url;
  const originalContent = btn.innerHTML;

  try {
    btn.disabled = true;

    // Show progress UI
    progressContainer.classList.remove("hidden");
    progressBar.style.width = "0%";
    btn.innerHTML = `<div>${translations[currentLang]["btn-downloading"]}</div>`;

    const isAudio =
      type.toLowerCase().includes("mp3") ||
      type.toLowerCase().includes("audio") ||
      type.toLowerCase().includes("128k") ||
      type.toLowerCase().includes("48k") ||
      type.toLowerCase().includes("m4a");

    const isImage =
      type.toLowerCase().includes("image") ||
      type.toLowerCase().includes("photo") ||
      type.toLowerCase().includes("jpg") ||
      type.toLowerCase().includes("png") ||
      url.toLowerCase().includes(".jpg") ||
      url.toLowerCase().includes(".jpeg") ||
      url.toLowerCase().includes(".png") ||
      url.toLowerCase().includes(".webp");

    let ext = "mp4";
    if (isAudio) ext = "mp3";
    else if (isImage) ext = "jpg";

    const fileName = `MORI_${Date.now()}.${ext}`;

    let actualDownloadUrl = finalUrl;

    // Check if it's a YouTube/Worker URL that needs resolving
    if (finalUrl.includes("ytdown") || finalUrl.includes("worker")) {
      try {
        const statusRes = await CapacitorHttp.get({ url: finalUrl });
        if (statusRes.data && statusRes.data.fileUrl) {
          actualDownloadUrl = statusRes.data.fileUrl;
        } else if (
          statusRes.data &&
          typeof statusRes.data === "string" &&
          statusRes.data.includes('"fileUrl":')
        ) {
          const match = statusRes.data.match(/"fileUrl"\s*:\s*"([^"]+)"/);
          if (match) actualDownloadUrl = match[1];
        }
      } catch (e) {
        console.warn("Worker resolve failed, using original url");
      }
    }

    const downloadOptions = {
      url: actualDownloadUrl,
      path: "Mori/" + fileName,
      directory: "DOCUMENTS",
      headers: { "User-Agent": "Mozilla/5.0" },
      progress: true,
    };

    // Ensure Mori directory exists
    try {
      await Filesystem.mkdir({
        path: "Mori",
        directory: "DOCUMENTS",
        recursive: true,
      });
    } catch (e) {}

    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
      fakeProgress += 5;
      if (fakeProgress > 90) fakeProgress = 90;
      progressBar.style.width = `${fakeProgress}%`;
    }, 500);

    const savedFile = await Filesystem.downloadFile(downloadOptions);

    clearInterval(progressInterval);
    progressBar.style.width = "100%";

    // Update history with local path
    if (sourceUrl) {
      updateHistoryLocalPath(sourceUrl, savedFile.path);
    }

    btn.innerHTML = `<div>DONE!</div><span>Opening Browser...</span>`;
    showToast("Saved to History & Opening Browser");

    // Redirect to browser with the ACTUAL file url
    setTimeout(() => {
      window.open(actualDownloadUrl, "_blank");
    }, 500);

    setTimeout(() => {
      btn.innerHTML = originalContent;
      btn.disabled = false;
      progressContainer.classList.add("hidden");
    }, 3000);
  } catch (err) {
    console.error("Native Download Error:", err);
    showToast("Download failed. Opening in browser.");
    window.open(url, "_blank");
    btn.innerHTML = originalContent;
    btn.disabled = false;
    progressContainer.classList.add("hidden");
  }
}

function updateHistoryLocalPath(url, localUri) {
  const target = cleanUrl(url);
  let history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  history = history.map((item) => {
    if (cleanUrl(item.url) === target) {
      return { ...item, localUri };
    }
    return item;
  });
  localStorage.setItem("mori_history", JSON.stringify(history));
  renderHistory();
  updateGreeting();
}

// History Management
function saveToHistory(result, url) {
  let history = JSON.parse(localStorage.getItem("mori_history") || "[]");

  // Clean title before saving
  let cleanTitle = result.title || "Content";
  cleanTitle = cleanTitle
    .replace(/#[^\s#]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const newItem = {
    title: cleanTitle,
    thumbnail: result.thumbnail,
    url: url,
    timestamp: new Date().getTime(),
  };
  history = history.filter((h) => h.url !== url);
  history.unshift(newItem);
  localStorage.setItem("mori_history", JSON.stringify(history.slice(0, 50)));
  renderHistory();
  updateGreeting();
}

function deleteHistoryItem(url) {
  showConfirm("Delete Item", "Remove this item from history?", () => {
    let history = JSON.parse(localStorage.getItem("mori_history") || "[]");
    history = history.filter((h) => h.url !== url);
    localStorage.setItem("mori_history", JSON.stringify(history));
    renderHistory();
  });
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  const historyPage = document.getElementById("historyPage");
  if (!historyPage) return;
  const emptyState = historyPage.querySelector(".empty-state");

  let list = historyPage.querySelector(".history-list");
  if (list) list.remove();

  if (history.length === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    if (editHistoryBtn) editHistoryBtn.classList.add("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");
  if (editHistoryBtn && !isEditingHistory)
    editHistoryBtn.classList.remove("hidden");

  list = document.createElement("div");
  list.className = "history-list";

  history.forEach((item) => {
    const card = document.createElement("div");
    card.className = "history-item";
    card.innerHTML = `
            <div class="history-thumb-container">
                <img src="${item.thumbnail}" alt="thumb" class="hist-img" style="display: block;" referrerpolicy="no-referrer">
            </div>
            <div class="history-info">
                <h3>${truncate(item.title, 60)}</h3>
                <p>${new Date(item.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</p>
            </div>
            ${isEditingHistory ? `<button class="delete-item-btn" data-url="${item.url}">×</button>` : ""}
        `;

    const img = card.querySelector(".hist-img");
    img.onerror = () => (img.style.display = "none");

    if (!isEditingHistory) {
      card.addEventListener("click", () => showModal(item));
    } else {
      card.querySelector(".delete-item-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteHistoryItem(item.url);
      });
    }

    list.appendChild(card);
  });
  historyPage.appendChild(list);
}

// Modal Logic
function showModal(item) {
  modalTitle.textContent = truncate(item.title, 100);
  const thumbContainer = document.querySelector(".modal-thumb-container");
  thumbContainer.innerHTML = ""; // Clear previous content

  if (item.localUri) {
    const isVideo = item.localUri.toLowerCase().endsWith(".mp4");
    const isAudio = item.localUri.toLowerCase().endsWith(".mp3");
    const mediaSrc = Capacitor.convertFileSrc(item.localUri);

    if (isVideo) {
      const video = document.createElement("video");
      video.src = mediaSrc;
      video.controls = true;
      video.loop = true;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.style.display = "block";
      thumbContainer.appendChild(video);
      video.play().catch((e) => console.warn("Autoplay failed:", e));
    } else if (isAudio) {
      // Show thumbnail and audio player
      const img = document.createElement("img");
      img.src = item.thumbnail || "";
      img.style.display = "block";
      img.style.marginBottom = "10px";
      thumbContainer.appendChild(img);

      const audio = document.createElement("audio");
      audio.src = mediaSrc;
      audio.controls = true;
      audio.muted = true;
      audio.style.width = "100%";
      thumbContainer.appendChild(audio);
    } else {
      const img = document.createElement("img");
      img.src = mediaSrc;
      img.id = "modalThumb";
      img.referrerPolicy = "no-referrer";
      img.style.display = "block";
      img.onerror = () => {
        console.error("Local img load failed, falling back to remote");
        img.src = item.thumbnail || "";
      };
      thumbContainer.appendChild(img);
    }
  } else {
    const img = document.createElement("img");
    img.src = item.thumbnail || "";
    img.id = "modalThumb";
    img.referrerPolicy = "no-referrer";
    img.style.display = "block";
    img.onerror = () => (img.style.display = "none");
    thumbContainer.appendChild(img);
  }

  modalUrl.textContent = item.url;
  modalUrl.onclick = () => copyToClipboard(item.url);
  modalOverlay.classList.remove("hidden");

  // Remove the old gallery button if it exists
  const oldGalleryBtn = document.getElementById("viewGalleryBtn");
  if (oldGalleryBtn) oldGalleryBtn.remove();

  redownloadBtn.onclick = () => {
    urlInput.value = item.url;
    clearBtn.classList.remove("hidden");
    modalOverlay.classList.add("hidden");
    document.querySelector('.nav-item[data-page="home"]').click();
    downloadBtn.click();
  };
}

closeModal?.addEventListener("click", () => {
  const thumbContainer = document.querySelector(".modal-thumb-container");
  thumbContainer.querySelectorAll("video").forEach((v) => {
    v.pause();
    v.src = "";
    v.load();
  });
  thumbContainer.innerHTML = "";
  modalOverlay.classList.add("hidden");
});

modalOverlay?.addEventListener("click", (e) => {
  if (e.target === modalOverlay) {
    const thumbContainer = document.querySelector(".modal-thumb-container");
    thumbContainer.querySelectorAll("video").forEach((v) => {
      v.pause();
      v.src = "";
      v.load();
    });
    thumbContainer.innerHTML = "";
    modalOverlay.classList.add("hidden");
  }
});

// Initial Render
renderHistory();

// Nav Handling
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const targetPageId = item.getAttribute("data-page") + "Page";
    document
      .querySelectorAll(".nav-item")
      .forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
    document
      .querySelectorAll(".page-content")
      .forEach((page) => page.classList.add("hidden"));

    // Pause all videos when switching pages
    document.querySelectorAll("video").forEach((v) => v.pause());

    document.getElementById(targetPageId).classList.remove("hidden");
  });
});
