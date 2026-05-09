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
const darkModeToggle = document.getElementById("darkModeToggle");

// Capacitor Plugins
const { CapacitorHttp, Filesystem, Toast, Clipboard, App } =
  window.Capacitor?.Plugins || {};

const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const loaderText = document.getElementById('loaderText');

// Init Theme
const savedTheme = localStorage.getItem("mori_theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
if (darkModeToggle) darkModeToggle.checked = savedTheme === "dark";

darkModeToggle?.addEventListener("change", (e) => {
  const theme = e.target.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("mori_theme", theme);
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
});

// Handle Shared Intent from Native Android
window.addEventListener('moriShareIntent', (e) => {
    try {
        const data = typeof e.detail === 'string' ? JSON.parse(e.detail) : e.detail;
        const text = data.text;
        if (text) {
            // Find a URL in the text
            const urlMatch = text.match(/https?:\/\/[^\s]+/);
            const finalUrl = urlMatch ? urlMatch[0] : text;
            
            urlInput.value = finalUrl;
            urlInput.dispatchEvent(new Event('input'));
            
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
    } catch (err) {
        console.error("Share Intent Error:", err);
    }
});

// Handle Shared Intent / Deep Links (Standard URLs)
if (App) {
    App.addListener('appUrlOpen', data => {
        if (data.url) {
            urlInput.value = data.url;
            urlInput.dispatchEvent(new Event('input'));
            setTimeout(() => downloadBtn.click(), 500);
        }
    });

    App.getLaunchUrl().then(data => {
        if (data && data.url) {
            urlInput.value = data.url;
            urlInput.dispatchEvent(new Event('input'));
            setTimeout(() => downloadBtn.click(), 500);
        }
    });
}

function cleanUrl(url) {
    try {
        const u = new URL(url);
        return u.origin + u.pathname;
    } catch (e) {
        return url.split('?')[0].replace(/\/$/, '');
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
clearCacheBtn?.addEventListener("click", () => {
  showConfirm(
    "Clear Cache",
    "This will delete temporary files and reset history. Continue?",
    async () => {
      try {
        localStorage.removeItem("mori_history");
        if (Filesystem) {
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
        }
        renderHistory();
        showToast("Cache cleared.");
      } catch (e) {
        console.error(e);
        showToast("Cache cleared.");
        renderHistory();
      }
    },
  );
});

// SCRAPERS
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
        if (
          href.includes("snaptik.app") ||
          href.includes("acxcdn.com") ||
          href.includes("token=")
        ) {
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
    const thumb = thumbEl ? (thumbEl.getAttribute("src")?.startsWith("/") ? "https://snaptik.app" + thumbEl.getAttribute("src") : thumbEl.getAttribute("src")) : null;

    return { status: true, result: { title, thumbnail: thumb, downloads, sourceUrl: url } };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

async function scrapeInstagram(url) {
  let currentStatus = null;
  try {
    const res1 = await CapacitorHttp.get({
      url: "https://indown.io/",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    currentStatus = res1.status;

    const rawCookies = res1.headers["Set-Cookie"] || res1.headers["set-cookie"] || "";
    const cookies = Array.isArray(rawCookies) ? rawCookies.join("; ") : rawCookies;
    
    const parser = new DOMParser();
    const doc1 = parser.parseFromString(res1.data, "text/html");
    const token = doc1.querySelector('input[name="_token"]')?.value;

    if (!token) throw new Error("Scraper Error: Token not found on page.");

    const fetchMedia = async (targetUrl) => {
        return await CapacitorHttp.post({
          url: "https://indown.io/download",
          data: { link: targetUrl, _token: token },
          headers: {
            "Cookie": cookies,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://indown.io/"
          },
        });
    };

    const cleanUrl = url.split("?")[0];
    let res2 = await fetchMedia(cleanUrl);
    let doc2 = parser.parseFromString(res2.data, "text/html");
    let downloads = [];
    let thumbnail = null;

    const parseDoc = (d) => {
        const found = [];
        d.querySelectorAll(".container .row .col-md-4, .row .col-md-4").forEach((el) => {
            const a = el.querySelector("a");
            const img = el.querySelector("img");
            let href = a?.getAttribute("href");
            let imgSrc = img?.getAttribute("src") || "";
            
            if (imgSrc && !thumbnail && !imgSrc.includes("logo")) {
                thumbnail = imgSrc.startsWith("/") ? "https://indown.io" + imgSrc : imgSrc;
            }
            if (href && href.includes("fetch?url=")) {
                if (href.startsWith("/")) href = "https://indown.io" + href;
                const type = href.includes(".mp4") || href.includes("video") ? "VIDEO" : "IMAGE";
                found.push({
                    type, url: href, 
                    thumbnail: imgSrc && !imgSrc.includes("logo") ? (imgSrc.startsWith("/") ? "https://indown.io" + imgSrc : imgSrc) : null,
                    isMirror: type === "VIDEO" && found.some((d) => d.type === "VIDEO")
                });
            }
        });
        return found;
    };

    downloads = parseDoc(doc2);

    if (downloads.length === 0 && cleanUrl !== url) {
        res2 = await fetchMedia(url);
        doc2 = parser.parseFromString(res2.data, "text/html");
        downloads = parseDoc(doc2);
    }
    currentStatus = res2.status;

    if (downloads.length === 0)
      throw new Error("Media links not found. Post might be private or scraper outdated.");

    const titleEl = doc2.querySelector("h5") || doc2.querySelector("h2");
    if (titleEl) {
      titleEl.querySelectorAll("a").forEach((a) => a.remove());
    }
    const title = titleEl?.textContent?.trim() || "Instagram Content";
    if (!thumbnail)
      thumbnail = doc2.querySelector('.row img:not([src*="logo"])')?.src;

    return { status: true, result: { title, thumbnail, downloads, sourceUrl: url } };
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
      },
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

  const loadingPhrases = [
    "Analyzing link...",
    "Fetching media...",
    "Extracting data...",
    "Scraping content...",
    "Hunting for pixels...",
    "Processing request...",
    "Almost there...",
  ];

  const randomPhrase =
    loadingPhrases[Math.floor(Math.random() * loadingPhrases.length)];
  const loaderText = loader.querySelector("p");
  if (loaderText) loaderText.textContent = randomPhrase;

  const supportedSection = document.querySelector(".supported-section");
  resultSection.classList.add("hidden");

  // Stop any previous media playing in background
  document.querySelectorAll("video").forEach((v) => {
    v.pause();
    v.src = "";
    v.load();
  });

  if (supportedSection) supportedSection.classList.add("hidden");
  loader.classList.remove("hidden");
  downloadBtn.disabled = true;
  downloadBtn.textContent = "Processing...";
  let data;
  if (CapacitorHttp) {
    if (url.includes("tiktok.com")) {
      data = await scrapeTikTok(url);
    } else if (url.includes("instagram.com")) {
      data = await scrapeInstagram(url);
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      data = await scrapeYouTube(url);
    } else {
      data = { status: false, message: "URL not supported yet." };
    }
  } else {
    data = await scrapeProxy(url);
  }

  if (data.status) {
    saveToHistory(data.result, url);
    renderResult(data.result);
  } else {
    handleScrapeError(data, data.statusCode);
    if (supportedSection) supportedSection.classList.remove("hidden");
  }

  loader.classList.add("hidden");
  downloadBtn.disabled = false;
  downloadBtn.textContent = "Configure";
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

function renderResult(result) {
  slideData = result.downloads;
  currentSlideIndex = 0;

  const sliderItems = slideData.filter((dl) => !dl.isMirror);

  if (slidesWrapper) {
    slidesWrapper.innerHTML = "";
    
    // For YouTube, always show only the main thumbnail, don't slide formats
    const isYouTube = /youtube\.com|youtu\.be/i.test(urlInput.value) || 
                      (result.title && /youtube/i.test(result.title));
    
    if (sliderItems.length > 0 && !isYouTube) {
      sliderItems.forEach((dl, index) => {
        const slide = document.createElement("div");
        slide.className = "preview-slide" + (index === 0 ? " active" : "");

        if (dl.url.includes(".mp4") || dl.type === "VIDEO") {
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
          img.style.maxHeight = '200px';
          img.style.marginBottom = '10px';
          slide.appendChild(img);

          const audio = document.createElement("audio");
          audio.src = dl.url;
          audio.controls = true;
          audio.muted = false;
          audio.style.width = '100%';
          slide.appendChild(audio);
        } else {
          const img = document.createElement("img");
          img.src = dl.thumbnail || dl.url;
          img.referrerPolicy = "no-referrer";
          img.decoding = "async";
          img.loading = "lazy";
          img.onerror = () => (img.style.display = "none");
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

  let cleanTitleText = result.title || "Content";
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
    btn.innerHTML = `<div>Download ${index + 1}</div><span>${dl.type}</span>`;
    btn.addEventListener("click", (e) =>
      startNativeDownload(dl.url, dl.type, result.title, e.currentTarget, result.sourceUrl || urlInput.value.trim()),
    );
    downloadList.appendChild(btn);
  });
  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth" });
}

async function startNativeDownload(url, type, title, btn, sourceUrl) {
  if (!Filesystem) {
    window.open(url, "_blank");
    return;
  }

  const finalUrl = url.startsWith("/") ? "https://snaptik.app" + url : url;
  const originalContent = btn.innerHTML;

  try {
    btn.disabled = true;
    
    // Show progress UI
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    btn.innerHTML = `<div>Downloading...</div>`;

    const isAudio = type.toLowerCase().includes('mp3') || type.toLowerCase().includes('audio') || type.toLowerCase().includes('128k') || type.toLowerCase().includes('48k') || type.toLowerCase().includes('m4a');
    const ext = isAudio ? 'mp3' : 'mp4';
    const fileName = `MORI_${Date.now()}.${ext}`;

    let actualDownloadUrl = finalUrl;
    
    // Check if it's a YouTube/Worker URL that needs resolving
    if (finalUrl.includes('ytdown') || finalUrl.includes('worker')) {
        try {
            const statusRes = await CapacitorHttp.get({ url: finalUrl });
            if (statusRes.data && statusRes.data.fileUrl) {
                actualDownloadUrl = statusRes.data.fileUrl;
            } else if (statusRes.data && typeof statusRes.data === 'string' && statusRes.data.includes('"fileUrl":')) {
                const match = statusRes.data.match(/"fileUrl"\s*:\s*"([^"]+)"/);
                if (match) actualDownloadUrl = match[1];
            }
        } catch (e) {
            console.warn("Worker resolve failed, using original url");
        }
    }

    const downloadOptions = {
        url: actualDownloadUrl,
        path: fileName,
        directory: 'CACHE',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        progress: true
    };

    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
        fakeProgress += 5;
        if (fakeProgress > 90) fakeProgress = 90;
        progressBar.style.width = `${fakeProgress}%`;
    }, 500);

    const savedFile = await Filesystem.downloadFile(downloadOptions);
    
    clearInterval(progressInterval);
    progressBar.style.width = '100%';

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
      progressContainer.classList.add('hidden');
    }, 3000);
  } catch (err) {
    console.error("Native Download Error:", err);
    showToast("Download failed. Opening in browser.");
    window.open(url, "_blank");
    btn.innerHTML = originalContent;
    btn.disabled = false;
    progressContainer.classList.add('hidden');
  }
}

function updateHistoryLocalPath(url, localUri) {
    const target = cleanUrl(url);
    let history = JSON.parse(localStorage.getItem('mori_history') || '[]');
    history = history.map(item => {
        if (cleanUrl(item.url) === target) {
            return { ...item, localUri };
        }
        return item;
    });
    localStorage.setItem('mori_history', JSON.stringify(history));
    renderHistory();
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
                <p>${new Date(item.timestamp).toLocaleDateString()}</p>
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
  const thumbContainer = document.querySelector('.modal-thumb-container');
  thumbContainer.innerHTML = ''; // Clear previous content

  if (item.localUri) {
      const isVideo = item.localUri.toLowerCase().endsWith('.mp4');
      const isAudio = item.localUri.toLowerCase().endsWith('.mp3');
      const mediaSrc = Capacitor.convertFileSrc(item.localUri);
      
      if (isVideo) {
          const video = document.createElement('video');
          video.src = mediaSrc;
          video.controls = true;
          video.loop = true;
          video.muted = true;
          video.autoplay = true;
          video.playsInline = true;
          video.style.display = 'block';
          thumbContainer.appendChild(video);
          video.play().catch(e => console.warn("Autoplay failed:", e));
      } else if (isAudio) {
          // Show thumbnail and audio player
          const img = document.createElement('img');
          img.src = item.thumbnail || "";
          img.style.display = 'block';
          img.style.marginBottom = '10px';
          thumbContainer.appendChild(img);

          const audio = document.createElement('audio');
          audio.src = mediaSrc;
          audio.controls = true;
          audio.muted = true;
          audio.style.width = '100%';
          thumbContainer.appendChild(audio);
      } else {
          const img = document.createElement('img');
          img.src = mediaSrc;
          img.id = 'modalThumb';
          img.referrerPolicy = "no-referrer";
          img.style.display = 'block';
          img.onerror = () => {
              console.error("Local img load failed, falling back to remote");
              img.src = item.thumbnail || "";
          };
          thumbContainer.appendChild(img);
      }
  } else {
      const img = document.createElement('img');
      img.src = item.thumbnail || "";
      img.id = 'modalThumb';
      img.referrerPolicy = "no-referrer";
      img.style.display = 'block';
      img.onerror = () => (img.style.display = "none");
      thumbContainer.appendChild(img);
  }

  modalUrl.textContent = item.url;
  modalUrl.onclick = () => copyToClipboard(item.url);
  modalOverlay.classList.remove("hidden");

  // Remove the old gallery button if it exists
  const oldGalleryBtn = document.getElementById('viewGalleryBtn');
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
