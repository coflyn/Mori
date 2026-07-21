import { translations } from "./i18n.js";
import { createVideoPlayer } from "./player.js";
import {
  truncate,
  showToast,
  copyToClipboard,
  cleanUrl,
  Filesystem,
  CapacitorHttp,
  Media,
  App,
  triggerHaptic,
  playCompletionSound,
  requestWakeLock,
  releaseWakeLock,
} from "./utils.js";

// State pointers (will be updated from main script)
let currentLang = "en";
let slideData = [];
let currentSlideIndex = 0;
let isEditingHistory = false;

export function setUIState(state) {
  if (state.currentLang) currentLang = state.currentLang;
  if (state.isEditingHistory !== undefined)
    isEditingHistory = state.isEditingHistory;
  if (state.currentSlideIndex !== undefined)
    currentSlideIndex = state.currentSlideIndex;
  if (state.slideData !== undefined) slideData = state.slideData;
}

// Modal Slider State
let modalCurrentSlide = 0;

function renderMediaSlides(container, items, resultThumbnail) {
  if (!container) return;

  // Cleanup old players before clearing
  container.querySelectorAll(".mori-player-container").forEach((pc) => {
    if (pc._cleanup) pc._cleanup();
  });
  container.innerHTML = "";

  const isDataSaver = localStorage.getItem("mori_data_saver") === "true";

  items.forEach((dl, index) => {
    const slide = document.createElement("div");
    slide.className = `preview-slide ${index === 0 ? "active" : ""}`;

    const rawUrl = typeof dl.url === "string" ? dl.url : (dl.url?.url || dl.url?.src || String(dl.url || ""));
    const lowerUrl = rawUrl.toLowerCase();
    const upperType = dl.type ? dl.type.toUpperCase() : "";

    const isImage =
      lowerUrl.includes(".jpg") ||
      lowerUrl.includes(".jpeg") ||
      lowerUrl.includes(".png") ||
      lowerUrl.includes(".webp") ||
      /\.(jpg|jpeg|png|webp)/i.test(lowerUrl) ||
      upperType.includes("IMAGE") ||
      upperType.includes("PHOTO");

    const isAudio =
      lowerUrl.endsWith(".mp3") ||
      lowerUrl.includes(".mp3?") ||
      lowerUrl.includes(".m4a") ||
      lowerUrl.includes("audio") ||
      upperType.includes("MP3") ||
      upperType.includes("AUDIO");

    const isVideo =
      !isImage &&
      !isAudio &&
      (lowerUrl.includes(".mp4") ||
        lowerUrl.includes(".m3u8") ||
        lowerUrl.includes("video") ||
        upperType.includes("VIDEO") ||
        upperType.includes("MP4"));

    const isLocal =
      dl.url.includes("_capacitor_file_") ||
      dl.url.startsWith("file://") ||
      dl.isLocal === true;

    if (isVideo) {
      if (isDataSaver && !isLocal) {
        const placeholder = document.createElement("div");
        placeholder.className = "data-saver-placeholder";
        placeholder.innerHTML = `
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
          <p>${translations[currentLang]["label-datasaver"]}</p>
        `;
        slide.appendChild(placeholder);
      } else {
        const playerContainer = createVideoPlayer(dl, index, resultThumbnail);
        slide.appendChild(playerContainer);
      }
    } else if (isAudio) {
      if (isDataSaver && !isLocal) {
        const placeholder = document.createElement("div");
        placeholder.className = "data-saver-placeholder";
        placeholder.innerHTML = `<p>${translations[currentLang]["label-datasaver"]}</p>`;
        slide.appendChild(placeholder);
      } else {
        const img = document.createElement("img");
        img.style.width = "100%";
        img.style.maxHeight = "300px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "8px";
        img.style.marginBottom = "15px";

        setupImageLoading(
          img,
          dl.thumbnail || resultThumbnail || "",
          resultThumbnail,
        );
        slide.appendChild(img);
      }

      const audio = document.createElement("audio");
      audio.src = dl.url;
      audio.controls = true;
      audio.style.width = "100%";
      const autoPlaySetting = localStorage.getItem("mori_autoplay") !== "false";
      const loopSetting = localStorage.getItem("mori_loop") !== "false";
      audio.autoplay = index === 0 && autoPlaySetting;
      audio.loop = loopSetting;
      slide.appendChild(audio);
    } else {
      if (isDataSaver && !isLocal) {
        const placeholder = document.createElement("div");
        placeholder.className = "data-saver-placeholder";
        placeholder.innerHTML = `<p>${translations[currentLang]["label-datasaver"]}</p>`;
        slide.appendChild(placeholder);
      } else {
        const img = document.createElement("img");
        setupImageLoading(img, dl.thumbnail || dl.url || "", resultThumbnail);
        slide.appendChild(img);
      }
    }

    if (isLocal) {
      const badge = document.createElement("div");
      badge.className = "local-badge";
      badge.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
        </svg>
        <span>${translations[currentLang]["label-offline"] || "OFFLINE"}</span>
      `;
      slide.appendChild(badge);
    }

    container.appendChild(slide);
  });
}

/**
 * Robust image loader with proxy and referer bypass
 */
function setupImageLoading(img, src, resultThumbnail) {
  let fallbackThumb = resultThumbnail || "";
  const isIndownAsset =
    fallbackThumb.includes("indown.io") &&
    !fallbackThumb.includes("url=") &&
    !fallbackThumb.includes("token=");

  if (
    fallbackThumb &&
    (fallbackThumb.includes("logo") ||
      fallbackThumb.includes("placeholder") ||
      fallbackThumb.includes("images/") ||
      isIndownAsset)
  ) {
    fallbackThumb = "";
  }

  img.src = src || fallbackThumb || "";
  img.referrerPolicy = "no-referrer";
  img.onerror = () => {
    if (!img.dataset.retry) {
      img.dataset.retry = "1";
      const originalSrc = img.src;
      img.src = `https://images.weserv.nl/?url=${encodeURIComponent(originalSrc)}&default=${encodeURIComponent(originalSrc)}`;
    } else if (
      img.dataset.retry === "1" &&
      window.Capacitor?.isNativePlatform()
    ) {
      img.dataset.retry = "2";
      const targetUrl = img.src.includes("weserv.nl")
        ? decodeURIComponent(img.src.split("url=")[1].split("&")[0])
        : img.src;

      let referer = "https://www.google.com/";
      if (targetUrl.includes("snaptik.app")) referer = "https://snaptik.app/";
      if (targetUrl.includes("tiktokio.com")) referer = "https://tiktokio.com/";
      if (targetUrl.includes("instagram.com"))
        referer = "https://www.instagram.com/";
      if (targetUrl.includes("douyin") || targetUrl.includes("douyinpic"))
        referer = "https://www.douyin.com/";
      if (
        targetUrl.includes("xiaohongshu") ||
        targetUrl.includes("xhscdn") ||
        targetUrl.includes("rednote")
      )
        referer = "https://www.xiaohongshu.com/";
      if (
        targetUrl.includes("bilibili") ||
        targetUrl.includes("biliimg") ||
        targetUrl.includes("bili.im")
      )
        referer = "https://www.bilibili.com/";

      CapacitorHttp.get({
        url: targetUrl,
        responseType: "blob",
        headers: {
          Referer: referer,
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
        },
      })
        .then((res) => {
          if (res.data) {
            const reader = new FileReader();
            reader.onloadend = () => (img.src = reader.result);
            reader.readAsDataURL(res.data);
          }
        })
        .catch(() => {
          img.style.display = "none";
        });
    } else {
      img.style.display = "none";
    }
  };
}

export function updateSliderUI() {
  const slidesWrapper = document.getElementById("slidesWrapper");
  const slides = slidesWrapper
    ? slidesWrapper.querySelectorAll(".preview-slide")
    : [];
  const sliderItems = slideData.filter((dl) => !dl.isMirror);
  const slideIndicator = document.getElementById("slideIndicator");
  const slidePrevBtn = document.getElementById("slidePrevBtn");
  const slideNextBtn = document.getElementById("slideNextBtn");

  slides.forEach((slide, index) => {
    const video = slide.querySelector("video");
    if (index === currentSlideIndex) {
      slide.classList.add("active");
      if (video) {
        if (video.readyState < 1) video.load();
        video.currentTime = 0;
        video.loop = localStorage.getItem("mori_loop") !== "false";
        video.play().catch(() => {});
      }
    } else {
      slide.classList.remove("active");
      if (video) video.pause();
    }
  });

  if (slideIndicator)
    slideIndicator.textContent = `${currentSlideIndex + 1} / ${sliderItems.length}`;
  if (slidePrevBtn) slidePrevBtn.disabled = currentSlideIndex === 0;
  if (slideNextBtn)
    slideNextBtn.disabled = currentSlideIndex === sliderItems.length - 1;
}

export function renderResult(result, originalUrl) {
  slideData = result.downloads;
  currentSlideIndex = 0;

  const slidesWrapper = document.getElementById("slidesWrapper");
  const sliderNav = document.getElementById("sliderNav");
  const resultTitle = document.getElementById("resultTitle");
  const downloadList = document.getElementById("downloadList");
  const resultSection = document.getElementById("resultSection");
  const urlInput = document.getElementById("urlInput");

  if (!slidesWrapper) return;
  slidesWrapper.innerHTML = "";
  if (downloadList) downloadList.innerHTML = "";

  let sliderItems = slideData.filter((dl) => !dl.isMirror);

  // For platforms with multiple stream qualities (Bilibili, Douyin, and RedNote video), only keep the first video stream for the preview slides to avoid duplicates
  const isBilibili =
    /bilibili|bili\.im/i.test(urlInput.value) ||
    (result.title && /bilibili|bili\.im/i.test(result.title.toLowerCase()));
  const isDouyin =
    /douyin/i.test(urlInput.value) ||
    (result.title && /douyin/i.test(result.title.toLowerCase()));
  const isRedNoteVideo =
    (/xiaohongshu|rednote/i.test(urlInput.value) ||
      (result.title &&
        /xiaohongshu|rednote/i.test(result.title.toLowerCase()))) &&
    sliderItems.some((dl) => dl.type?.toUpperCase() === "VIDEO");
  const isTwitterVideo =
    (/twitter\.com|x\.com|fixupx|fxtwitter|vxtwitter/i.test(urlInput.value) ||
      (result.title && /twitter/i.test(result.title.toLowerCase()))) &&
    !sliderItems.some((dl) => dl.type === "IMAGE" || dl.type === "PHOTO");

  if (isDouyin) {
    const hasPhoto = sliderItems.some(
      (dl) => dl.type?.toUpperCase() === "PHOTO",
    );
    if (hasPhoto) {
      sliderItems = sliderItems.filter(
        (dl) => dl.type?.toUpperCase() === "PHOTO",
      );
    } else {
      const nonMirror = sliderItems.find((dl) => !dl.isMirror);
      sliderItems = nonMirror
        ? [nonMirror]
        : sliderItems.length > 0
          ? [sliderItems[0]]
          : [];
    }
  } else if (isBilibili || isRedNoteVideo || isTwitterVideo) {
    const firstItem = sliderItems.find((dl) => !dl.isMirror) || sliderItems[0];
    sliderItems = firstItem ? [firstItem] : [];
  }

  const isSinglePreview =
    /youtube\.com|youtu\.be|spotify\.com|music\.apple\.com|bandcamp\.com|bilibili\.com|bilibili\.tv|bilivideo|bili\.im/i.test(
      urlInput.value,
    ) ||
    (result.title &&
      /youtube|spotify|apple music|bandcamp|bilibili|bili\.im/i.test(
        result.title.toLowerCase(),
      ));

  if (sliderItems.length > 0 && !isSinglePreview) {
    renderMediaSlides(slidesWrapper, sliderItems, result.thumbnail);
    if (sliderItems.length > 1) {
      sliderNav?.classList.remove("hidden");
      updateSliderUI();
    } else {
      sliderNav?.classList.add("hidden");
    }
  } else if (sliderItems.length > 0 && isSinglePreview) {
    slidesWrapper.innerHTML = "";
    const slide = document.createElement("div");
    slide.className = "preview-slide active";
    const img = document.createElement("img");
    img.style.width = "100%";
    img.style.borderRadius = "8px";
    img.style.objectFit = "cover";
    setupImageLoading(img, result.thumbnail || "", result.thumbnail);
    slide.appendChild(img);
    slidesWrapper.appendChild(slide);
    sliderNav?.classList.add("hidden");
  } else {
    slidesWrapper.innerHTML = "";
    const slide = document.createElement("div");
    slide.className = "preview-slide active";
    const img = document.createElement("img");
    img.src = result.thumbnail || "";
    img.referrerPolicy = "no-referrer";
    img.onerror = () => {
      if (!img.dataset.retry) {
        img.dataset.retry = "1";
        const originalSrc = img.src;
        img.src = `https://images.weserv.nl/?url=${encodeURIComponent(originalSrc)}&default=${encodeURIComponent(originalSrc)}`;
      } else if (
        img.dataset.retry === "1" &&
        window.Capacitor?.isNativePlatform()
      ) {
        img.dataset.retry = "2";
        CapacitorHttp.get({
          url: img.src.includes("weserv.nl")
            ? decodeURIComponent(img.src.split("url=")[1].split("&")[0])
            : img.src,
          responseType: "blob",
          headers: { Referer: "https://www.instagram.com/" },
        })
          .then((res) => {
            if (res.data) {
              const reader = new FileReader();
              reader.onloadend = () => (img.src = reader.result);
              reader.readAsDataURL(res.data);
            }
          })
          .catch(() => {
            img.style.display = "none";
          });
      } else {
        img.style.display = "none";
      }
    };
    slide.appendChild(img);
    slidesWrapper.appendChild(slide);
    sliderNav?.classList.add("hidden");
  }

  // PDF Export Option for Galleries (Hybrid Mode)
  const imageItems = sliderItems.filter((item) => {
    const type = (item.type || "").toUpperCase();
    const rawUrl = typeof item.url === "string" ? item.url : (item.url?.url || item.url?.src || String(item.url || ""));
    const url = rawUrl.toLowerCase();
    const isImage =
      type.includes("PAGE") ||
      type.includes("IMAGE") ||
      type.includes("PHOTO") ||
      url.match(/\.(jpg|jpeg|png|webp)/);
    const isVideo = type.includes("VIDEO") || url.match(/\.(mp4|mkv|mov|avi)/);
    return isImage && !isVideo;
  });

  const isGallery = !isSinglePreview && imageItems.length >= 2;

  if (isGallery) {
    const pdfBtn = document.createElement("button");
    pdfBtn.className = "pdf-btn";
    const label =
      imageItems.length === sliderItems.length
        ? translations[currentLang]["pdf-btn-gallery"]
        : translations[currentLang]["pdf-btn-images"];
    const infoText =
      imageItems.length === sliderItems.length
        ? `${imageItems.length} ${translations[currentLang]["pdf-pages"]}`
        : `${imageItems.length} ${translations[currentLang]["pdf-images-detected"]}`;

    pdfBtn.innerHTML = `
      <div class="option-info">
        <span class="option-type">${label}</span>
        <span class="option-size">${infoText}</span>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="20" height="20" fill="currentColor">
        <path d="M13.156 9.211c-.213-.21-.686-.321-1.406-.331a11.754 11.754 0 0 0-1.69.124c-.276-.159-.561-.333-.784-.542-.601-.561-1.103-1.34-1.415-2.197.02-.08.038-.15.054-.222 0 0 .339-1.923.249-2.573a.73.73 0 0 0-.044-.184l-.029-.076c-.092-.212-.273-.437-.556-.425l-.171-.005c-.316 0-.573.161-.64.403-.205.757.007 1.889.39 3.355l-.098.239c-.275.67-.619 1.345-.923 1.94l-.04.077c-.32.626-.61 1.157-.873 1.607l-.271.144c-.02.01-.485.257-.594.323-.926.553-1.539 1.18-1.641 1.678-.032.159-.008.362.156.456l.263.132a.792.792 0 0 0 .357.086c.659 0 1.425-.821 2.48-2.662a24.79 24.79 0 0 1 3.819-.908c.926.521 2.065.883 2.783.883.128 0 .238-.012.327-.036a.558.558 0 0 0 .325-.222c.139-.21.168-.499.13-.795a.531.531 0 0 0-.157-.271zM3.307 12.72c.12-.329.596-.979 1.3-1.556.044-.036.153-.138.253-.233-.736 1.174-1.229 1.642-1.553 1.788zm4.169-9.6c.212 0 .333.534.343 1.035s-.107.853-.252 1.113c-.12-.385-.179-.992-.179-1.389 0 0-.009-.759.088-.759zM6.232 9.961c.148-.264.301-.543.458-.839.383-.724.624-1.29.804-1.755a5.813 5.813 0 0 0 1.328 1.649c.065.055.135.111.207.166-1.066.211-1.987.467-2.798.779zm6.72-.06c-.065.041-.251.064-.37.064-.386 0-.864-.176-1.533-.464.257-.019.493-.029.705-.029.387 0 .502-.002.88.095s.383.293.318.333z"/><path d="M14.341 3.579c-.347-.473-.831-1.027-1.362-1.558S11.894 1.006 11.421.659C10.615.068 10.224 0 10 0H2.25C1.561 0 1 .561 1 1.25v13.5c0 .689.561 1.25 1.25 1.25h11.5c.689 0 1.25-.561 1.25-1.25V5c0-.224-.068-.615-.659-1.421zm-2.07-.85c.48.48.856.912 1.134 1.271h-2.406V1.595c.359.278.792.654 1.271 1.134zM14 14.75c0 .136-.114.25-.25.25H2.25a.253.253 0 0 1-.25-.25V1.25c0-.135.115-.25.25-.25H10v3.5a.5.5 0 0 0 .5.5H14v9.75z"/></svg>
    `;
    pdfBtn.onclick = () => exportGalleryToPdf(result.title, imageItems);
    downloadList.appendChild(pdfBtn);
  }

  let cleanTitleText = (
    result.title || translations[currentLang]["label-content"]
  )
    .replace(/#[^\s#]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (resultTitle) resultTitle.textContent = truncate(cleanTitleText, 80);

  if (downloadList) {
    result.downloads.forEach((dl, index) => {
      const btn = document.createElement("button");
      btn.className = "dl-item";
      const label = dl.quality ? `${dl.type} - ${dl.quality}` : dl.type;
      btn.innerHTML = `<div>${translations[currentLang]["label-download"]} ${index + 1}</div><span>${label}</span>`;
      btn.addEventListener("click", (e) =>
        startNativeDownload(
          dl.url,
          dl.type,
          result.title,
          e.currentTarget,
          result.sourceUrl || originalUrl,
        ),
      );
      downloadList.appendChild(btn);
    });
  }

  resultSection?.classList.remove("hidden");
  resultSection?.scrollIntoView({ behavior: "smooth" });

  return { slideData, currentSlideIndex };
}

export function renderHistory(onItemClick, onDeleteClick) {
  const history = JSON.parse(localStorage.getItem("mori_history") || "[]");
  const historyPage = document.getElementById("historyPage");
  const editHistoryBtn = document.getElementById("editHistoryBtn");
  if (!historyPage) return;

  const emptyState = historyPage.querySelector(".empty-state");
  let list = historyPage.querySelector(".history-list");
  if (list) list.remove();

  if (history.length === 0) {
    emptyState?.classList.remove("hidden");
    editHistoryBtn?.classList.add("hidden");
    return;
  }

  emptyState?.classList.add("hidden");
  if (editHistoryBtn && !isEditingHistory)
    editHistoryBtn.classList.remove("hidden");

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
      if (item.localThumbnail) {
        thumbSrc = item.localThumbnail;
      } else if (item.localFiles && item.localFiles.length > 0) {
        const first = item.localFiles[0];
        if (first.thumbnail) {
          thumbSrc = first.thumbnail;
        } else if (first.type === "IMAGE") {
          thumbSrc = window.Capacitor?.convertFileSrc(first.path);
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
          <h3>${truncate(item.title, 60)}</h3>
          <p>${new Date(item.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</p>
      </div>
      ${isEditingHistory ? `<button class="delete-item-btn" data-url="${item.url}">×</button>` : ""}
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

export async function showModal(item, onRedownload) {
  try {
    if (!item) return;

    const modalTitle = document.getElementById("modalTitle");
    const modalUrl = document.getElementById("modalUrl");
    const modalOverlay = document.getElementById("modalOverlay");
    const slidesWrapper = document.getElementById("modalSlidesWrapper");
    const sliderNav = document.getElementById("modalSliderNav");
    const redownloadBtn = document.getElementById("redownloadBtn");

    if (!modalOverlay || !slidesWrapper) {
      console.error("Modal elements not found!");
      return;
    }

    // Reset visibility and content
    modalOverlay.classList.remove("hidden");
    modalOverlay.style.display = "flex";

    if (modalTitle)
      modalTitle.textContent = truncate(item.title || "Detail", 100);
    slidesWrapper.innerHTML = "";
    modalCurrentSlide = 0;

    const localFiles = item.localFiles || [];
    const displayItems = [];

    const resolveNativeUrl = async (filePath) => {
      if (!filePath) return "";
      if (
        filePath.startsWith("http://") ||
        filePath.startsWith("https://") ||
        filePath.startsWith("data:") ||
        filePath.startsWith("blob:")
      ) {
        return filePath;
      }
      let fullPath = filePath;
      if (
        window.Capacitor &&
        Filesystem &&
        !fullPath.startsWith("file://") &&
        !fullPath.startsWith("_capacitor_file_")
      ) {
        try {
          const uriObj =
            (await Filesystem.getUri({ path: fullPath, directory: "EXTERNAL_STORAGE" }).catch(() => null)) ||
            (await Filesystem.getUri({ path: fullPath, directory: "DOCUMENTS" }).catch(() => null));
          if (uriObj && uriObj.uri) {
            fullPath = uriObj.uri;
          }
        } catch (e) {}
      }
      return window.Capacitor?.convertFileSrc(fullPath) || fullPath;
    };

    if (localFiles.length > 0) {
      for (const file of localFiles) {
        if (file && file.path) {
          const resolvedUrl = await resolveNativeUrl(file.path);
          displayItems.push({
            url: resolvedUrl,
            type:
              file.type ||
              (file.path.toLowerCase().endsWith(".mp4")
                ? "VIDEO"
                : file.path.toLowerCase().endsWith(".mp3")
                  ? "MP3"
                  : "IMAGE"),
            thumbnail: file.thumbnail,
            isLocal: true,
          });
        }
      }
    } else if (item.localUri) {
      const resolvedUrl = await resolveNativeUrl(item.localUri);
      displayItems.push({
        url: resolvedUrl,
        type: item.localUri.toLowerCase().endsWith(".mp4")
          ? "VIDEO"
          : item.localUri.toLowerCase().endsWith(".mp3")
            ? "MP3"
            : "IMAGE",
        thumbnail: item.localThumbnail,
        isLocal: true,
      });
    }

    // Final fallback if nothing found
    if (displayItems.length === 0) {
      displayItems.push({
        url: item.thumbnail || item.url || "",
        type: "IMAGE",
        thumbnail: item.thumbnail,
      });
    }

    renderMediaSlides(slidesWrapper, displayItems, item.thumbnail);

    if (displayItems.length > 1) {
      if (sliderNav) sliderNav.classList.remove("hidden");
      const indicator = document.getElementById("modalSlideIndicator");
      const updateModalSlider = () => {
        const slides = slidesWrapper.querySelectorAll(".preview-slide");
        slides.forEach((s, i) => {
          const isActive = i === modalCurrentSlide;
          s.classList.toggle("active", isActive);
          const video = s.querySelector("video");
          if (video) {
            if (isActive) {
              video.currentTime = 0;
              video.loop = localStorage.getItem("mori_loop") !== "false";
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          }
        });
        if (indicator)
          indicator.textContent = `${modalCurrentSlide + 1} / ${displayItems.length}`;
      };

      const prevBtn = document.getElementById("modalSlidePrevBtn");
      const nextBtn = document.getElementById("modalSlideNextBtn");
      if (prevBtn) {
        prevBtn.onclick = (e) => {
          e.stopPropagation();
          modalCurrentSlide =
            (modalCurrentSlide - 1 + displayItems.length) % displayItems.length;
          updateModalSlider();
        };
      }
      if (nextBtn) {
        nextBtn.onclick = (e) => {
          e.stopPropagation();
          modalCurrentSlide = (modalCurrentSlide + 1) % displayItems.length;
          updateModalSlider();
        };
      }
      updateModalSlider();
    } else {
      if (sliderNav) sliderNav.classList.add("hidden");
    }

    if (modalUrl) {
      modalUrl.textContent = item.url || "";
      modalUrl.onclick = () => copyToClipboard(item.url);
    }

    if (redownloadBtn) {
      redownloadBtn.onclick = (e) => {
        e.stopPropagation();
        modalOverlay.classList.add("hidden");
        modalOverlay.style.display = "none";
        onRedownload(item.url);
      };
    }
  } catch (err) {
    console.error("showModal error:", err);
    showToast(
      translations[currentLang]["label-modal-error"] + ": " + err.message,
    );
  }
}

export async function startNativeDownload(url, type, title, btn, sourceUrl) {
  if (!Filesystem) {
    window.open(url, "_blank");
    return;
  }

  const progressBar = document.getElementById("progressBar");
  const progressContainer = document.getElementById("progressContainer");
  const originalContent = btn.innerHTML;

  // Request permissions for Android
  if (window.Capacitor?.getPlatform() === "android") {
    try {
      const status = await Filesystem.checkPermissions();
      if (status.publicStorage !== "granted") {
        const request = await Filesystem.requestPermissions();
        if (request.publicStorage !== "granted") {
          showToast(translations[currentLang]["toast-storage-denied"]);
          return;
        }
      }
    } catch (e) {
      console.warn("Permission check failed", e);
    }
  }

  let progressListener = null;

  try {
    btn.disabled = true;
    if (progressContainer) progressContainer.classList.remove("hidden");
    if (progressBar) progressBar.style.width = "0%";

    // Acquire Wake Lock if enabled
    requestWakeLock();

    btn.innerHTML = `<div>0%</div>`;
    console.log("Starting download for:", url);

    // Remove any existing listeners first to avoid double-firing
    if (window._moriProgressListener) {
      await window._moriProgressListener.remove();
    }

    // Listen for progress
    window._moriProgressListener = await Filesystem.addListener(
      "downloadProgress",
      (progress) => {
        let percentage = 0;
        if (progress.contentLength > 0) {
          percentage = Math.round(
            (progress.bytesWritten / progress.contentLength) * 100,
          );
        } else {
          percentage = Math.min(
            99,
            Math.round(progress.bytesWritten / (1024 * 1024)),
          );
        }

        if (progressBar) progressBar.style.width = `${percentage}%`;
        btn.innerHTML = `<div>${percentage}%</div>`;
      },
    );

    const isAudio = /mp3|audio|128k|48k|m4a/i.test(type);
    const isImage =
      /image|photo|jpg|png|webp/i.test(type) ||
      /\.(jpg|jpeg|png|webp)/i.test(url);
    const ext = isAudio ? "MP3" : isImage ? "JPG" : "MP4";

    let sanitizedTitle = (title || "Mori Media")
      .replace(/[\\/:*?"<>|#%&{}[\]()@$^+=~`';,]/g, "")
      .replace(/[^\w\s\-.\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/gi, "")
      .trim()
      .replace(/\s+/g, " ")
      .substring(0, 60);

    if (!sanitizedTitle) sanitizedTitle = "Mori_Media";

    const template = localStorage.getItem("mori_filename") || "default";
    let fileName = `${sanitizedTitle}_${Date.now()}.${ext}`;

    if (template === "title") {
      fileName = `${sanitizedTitle}.${ext}`;
    } else if (template === "title-platform") {
      let platform = "Media";
      const lowerUrl = (sourceUrl || url).toLowerCase();
      if (lowerUrl.includes("tiktok")) platform = "TikTok";
      else if (lowerUrl.includes("instagram")) platform = "Instagram";
      else if (lowerUrl.includes("youtube") || lowerUrl.includes("youtu.be"))
        platform = "YouTube";
      else if (lowerUrl.includes("twitter") || lowerUrl.includes("x.com"))
        platform = "Twitter";
      else if (lowerUrl.includes("facebook")) platform = "Facebook";
      fileName = `${sanitizedTitle}_${platform}.${ext}`;
    } else if (template === "title-date") {
      const dateStr = new Date().toISOString().split("T")[0];
      fileName = `${sanitizedTitle}_${dateStr}.${ext}`;
    }

    const videoSubfolder = localStorage.getItem("mori_download_path") || "Mori";
    const musicSubfolder =
      localStorage.getItem("mori_music_path") || "Mori/Music";
    let fullPath = isAudio
      ? `Download/${musicSubfolder}`
      : `Download/${videoSubfolder}`;

    // Auto-Categorize Subfolder per Platform
    if (localStorage.getItem("mori_auto_folder") === "true") {
      const src = (sourceUrl || url || "").toLowerCase();
      let platformFolder = "Other";
      if (src.includes("tiktok") || src.includes("douyin")) platformFolder = "TikTok";
      else if (src.includes("instagram")) platformFolder = "Instagram";
      else if (src.includes("youtube") || src.includes("youtu.be")) platformFolder = "YouTube";
      else if (src.includes("twitter") || src.includes("x.com")) platformFolder = "Twitter";
      else if (src.includes("facebook")) platformFolder = "Facebook";
      else if (src.includes("pinterest")) platformFolder = "Pinterest";
      else if (src.includes("bilibili") || src.includes("b23.tv")) platformFolder = "Bilibili";
      else if (src.includes("pixiv") || src.includes("pximg")) platformFolder = "Pixiv";
      else if (src.includes("spotify")) platformFolder = "Spotify";
      else if (src.includes("rednote") || src.includes("xiaohongshu")) platformFolder = "RedNote";

      fullPath = `${fullPath}/${platformFolder}`;
    }

    await Filesystem.mkdir({
      path: fullPath,
      directory: "EXTERNAL_STORAGE",
      recursive: true,
    }).catch((e) => {
      console.warn("Mkdir failed, might already exist or permission issue", e);
    });

    if (progressBar) progressBar.style.width = "100%";
    btn.innerHTML =
      translations[currentLang]["btn-processing"] || "Processing...";

    let actualDownloadUrl = url;
    const needsResolving =
      (url.includes("ytdown") ||
        url.includes("worker") ||
        (url.includes("token=") && url.includes("snapsave"))) &&
      !url
        .toLowerCase()
        .match(/\.(mp4|mp3|m4a|zip|pdf|jpg|jpeg|png|webp)(\?|$)/);

    if (needsResolving) {
      try {
        // Handle SnapSave tokens or general worker resolves
        let resolved = false;
        let pollCount = 0;
        const maxPolls = 15;

        while (!resolved && pollCount < maxPolls) {
          btn.innerHTML = `<div>${translations[currentLang]["btn-processing"] || "Processing..."} ${pollCount > 0 ? `(${pollCount})` : ""}</div>`;

          try {
            const statusRes = await CapacitorHttp.get({
              url: actualDownloadUrl,
            });

            if (statusRes && statusRes.data) {
              let data = statusRes.data;
              if (typeof data === "string") {
                try {
                  data = JSON.parse(data);
                } catch (e) {}
              }

              if (data.fileUrl || data.url || data.download_url) {
                actualDownloadUrl =
                  data.fileUrl || data.url || data.download_url;
                resolved = true;
              } else if (data.status === "success" && data.download_url) {
                actualDownloadUrl = data.download_url;
                resolved = true;
              } else if (
                typeof data === "string" &&
                data.includes('"fileUrl":')
              ) {
                const match = data.match(/"fileUrl"\s*:\s*"([^"]+)"/);
                if (match) {
                  actualDownloadUrl = match[1];
                  resolved = true;
                }
              }
            }
          } catch (err) {
            console.warn("Poll attempt failed", err);
          }

          if (!resolved) {
            pollCount++;
            await new Promise((r) => setTimeout(r, 1500)); // Faster polling
          }
        }
      } catch (e) {
        console.error("Worker resolve fatal failure", e);
      }
    }

    const isYoutube =
      actualDownloadUrl.includes("ytmp3.mobi") ||
      actualDownloadUrl.includes("ytdown");
    const isTwitter =
      actualDownloadUrl.includes("tweeload") ||
      actualDownloadUrl.includes("twimg.com") ||
      actualDownloadUrl.includes("acxcdn.com") ||
      (url && (url.includes("twitter") || url.includes("x.com")));

    const downloadHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    };

    const isPixivDirect =
      actualDownloadUrl.includes("pixiv.net") ||
      actualDownloadUrl.includes("pximg.net") ||
      actualDownloadUrl.includes("pixiv.re");
    const isUgoiraCom = actualDownloadUrl.includes("ugoira");
    const isBilibili =
      actualDownloadUrl.includes("bilibili") ||
      actualDownloadUrl.includes("bilivideo") ||
      actualDownloadUrl.includes("bstarstatic") ||
      actualDownloadUrl.includes("akamaized.net") ||
      (url &&
        (url.includes("bilibili") ||
          url.includes("b23.tv") ||
          url.includes("bili.im")));

    if (isYoutube) downloadHeaders["Referer"] = "https://ytmp3.mobi/";
    if (isPixivDirect) downloadHeaders["Referer"] = "https://www.pixiv.net/";
    if (isUgoiraCom) downloadHeaders["Referer"] = "https://ugoira.com/";
    if (isBilibili) downloadHeaders["Referer"] = "https://www.bilibili.tv/";
    if (isTwitter) {
      if (actualDownloadUrl.includes("twimg.com")) {
        downloadHeaders["Referer"] = "https://twitter.com/";
      } else {
        downloadHeaders["Referer"] = "https://tweeload.com/";
      }
    }

    let savedFile;
    let attempts = 0;
    const isAutoRetry = localStorage.getItem("mori_auto_retry") !== "false";
    const maxAttempts = isAutoRetry ? 3 : 1;

    while (attempts < maxAttempts && !savedFile) {
      attempts++;
      try {
        if (attempts > 1) {
          showToast(`Retrying download (${attempts}/${maxAttempts})...`);
          await new Promise((r) => setTimeout(r, 1500));
        }
        savedFile = await Filesystem.downloadFile({
          url: actualDownloadUrl,
          path: fullPath + "/" + fileName,
          directory: "EXTERNAL_STORAGE",
          progress: true,
          headers: downloadHeaders,
        });
      } catch (dlErr) {
        console.warn(`Download attempt ${attempts} failed:`, dlErr);
        if (attempts >= maxAttempts) {
          try {
            const httpRes = await CapacitorHttp.get({
              url: actualDownloadUrl,
              responseType: "blob",
              headers: downloadHeaders,
            });
            if (httpRes && httpRes.data && typeof httpRes.data === "string") {
              await Filesystem.writeFile({
                path: fullPath + "/" + fileName,
                directory: "EXTERNAL_STORAGE",
                data: httpRes.data,
              });
              savedFile = { path: fullPath + "/" + fileName };
            } else {
              throw dlErr;
            }
          } catch (fallbackErr) {
            throw dlErr;
          }
        }
      }
    }

    if (progressBar) progressBar.style.width = "100%";
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="margin-right:8px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> SAVED`;

    // Save to Gallery natively
    if (Media && window.Capacitor?.isNativePlatform()) {
      try {
        let uriToSave = savedFile.path;
        if (!uriToSave.startsWith("file://")) {
           const uriObj = await Filesystem.getUri({ path: savedFile.path, directory: "EXTERNAL_STORAGE" }).catch(() => null);
           if (uriObj && uriObj.uri) uriToSave = uriObj.uri;
        }
        
        if (!isAudio) {
          if (isImage) {
             await Media.savePhoto({ path: uriToSave, album: 'Mori' });
          } else {
             await Media.saveVideo({ path: uriToSave, album: 'Mori' });
          }
        }
      } catch (mediaErr) {
        console.warn("Failed to save to native gallery:", mediaErr);
      }
    }

    // Trigger Haptic & Sound Feedback
    triggerHaptic("success");
    playCompletionSound();

    // Auto-Clear Input Box after Download
    if (localStorage.getItem("mori_auto_clear_input") === "true") {
      const urlInput = document.getElementById("urlInput");
      const clearBtn = document.getElementById("clearBtn");
      const pasteBtn = document.getElementById("pasteBtn");
      if (urlInput) {
        urlInput.value = "";
        if (clearBtn) clearBtn.classList.add("hidden");
        if (pasteBtn) pasteBtn.classList.remove("hidden");
      }
    }

    window.dispatchEvent(
      new CustomEvent("mori_file_saved", {
        detail: { url: sourceUrl || url, path: savedFile.path },
      }),
    );

    showToast(translations[currentLang]["label-saved"]);

    setTimeout(() => {
      btn.innerHTML = originalContent;
      btn.disabled = false;
      progressContainer?.classList.add("hidden");
    }, 2500);
  } catch (err) {
    console.error("Download failed", err);
    let errorMsg = err.message;
    if (
      errorMsg.includes("Network") ||
      errorMsg.includes("timeout") ||
      errorMsg.includes("connection")
    ) {
      errorMsg = translations[currentLang]["toast-connection-lost"];
    }
    showToast(translations[currentLang]["label-error"] + ": " + errorMsg);
    btn.disabled = false;
    btn.innerHTML = originalContent;
    if (progressContainer) progressContainer.classList.add("hidden");
  } finally {
    releaseWakeLock();
    if (window._moriProgressListener) {
      await window._moriProgressListener.remove();
      window._moriProgressListener = null;
    }
  }
}

async function exportGalleryToPdf(title, items) {
  try {
    showToast(translations[currentLang]["pdf-toast-starting"]);
    const { PDFDocument } = window.PDFLib;
    const pdfDoc = await PDFDocument.create();

    // Process in smaller chunks for better stability
    const chunkSize = 2;
    let processedCount = 0;

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const downloadPromises = chunk.map((item) => {
        let referer = "https://www.google.com/";
        if (item.url.includes("snaptik.app")) referer = "https://snaptik.app/";
        if (item.url.includes("instagram.com"))
          referer = "https://www.instagram.com/";

        return CapacitorHttp.get({
          url: item.url,
          responseType: "arraybuffer",
          connectTimeout: 30000,
          readTimeout: 60000,
          headers: { Referer: referer },
        }).catch((err) => ({ status: 0, error: err }));
      });

      const results = await Promise.all(downloadPromises);

      for (let j = 0; j < results.length; j++) {
        const res = results[j];
        const itemIndex = i + j;
        const item = chunk[j];

        try {
          if (res.status !== 200) throw new Error("Download failed");

          let imgBytes;
          if (typeof res.data === "string") {
            const binaryString = atob(res.data);
            imgBytes = new Uint8Array(binaryString.length);
            for (let k = 0; k < binaryString.length; k++) {
              imgBytes[k] = binaryString.charCodeAt(k);
            }
          } else {
            imgBytes = new Uint8Array(res.data);
          }

          const isPng =
            item.url.toLowerCase().endsWith(".png") ||
            (res.headers &&
              res.headers["Content-Type"] &&
              res.headers["Content-Type"].includes("png"));

          const compressImage = async (bytes, isOriginalPng) => {
            return new Promise((resolve) => {
              const blob = new Blob([bytes], {
                type: isOriginalPng ? "image/png" : "image/jpeg",
              });
              const url = URL.createObjectURL(blob);
              const img = new Image();
              img.onload = () => {
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1200;

                if (width > MAX_WIDTH) {
                  height = Math.round(height * (MAX_WIDTH / width));
                  width = MAX_WIDTH;
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d", { alpha: false });
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
                URL.revokeObjectURL(url);

                const base64 = dataUrl.split(",")[1];
                const binaryString = atob(base64);
                const compressedBytes = new Uint8Array(binaryString.length);
                for (let k = 0; k < binaryString.length; k++) {
                  compressedBytes[k] = binaryString.charCodeAt(k);
                }

                // Aggressive GC
                canvas.width = 0;
                canvas.height = 0;
                resolve({ bytes: compressedBytes, isJpeg: true });
              };
              img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve({ bytes, isJpeg: false });
              };
              img.src = url;
            });
          };

          const optimized = await compressImage(imgBytes, isPng);

          // Allow GC of original large buffer
          imgBytes = null;
          res.data = null;

          let image;
          try {
            if (optimized.isJpeg) {
              image = await pdfDoc.embedJpg(optimized.bytes);
            } else {
              if (isPng) image = await pdfDoc.embedPng(optimized.bytes);
              else image = await pdfDoc.embedJpg(optimized.bytes);
            }
          } catch (e) {
            // Fallback for misidentified formats
            try {
              if (isPng) image = await pdfDoc.embedJpg(optimized.bytes);
              else image = await pdfDoc.embedPng(optimized.bytes);
            } catch (e2) {
              console.warn(
                `Skipping image ${itemIndex + 1}: Unsupported format`,
              );
              continue;
            }
          }

          const { width, height } = image.scale(1);
          const page = pdfDoc.addPage([width, height]);
          page.drawImage(image, { x: 0, y: 0, width, height });
          processedCount++;

          if (processedCount % 5 === 0 || processedCount === items.length) {
            let msg = translations[currentLang]["pdf-toast-processing"]
              .replace("${count}", processedCount)
              .replace("${total}", items.length);
            showToast(msg);
          }
        } catch (e) {
          console.error(`Page ${itemIndex + 1} failed:`, e);
        }
      }
    }

    if (processedCount === 0)
      throw new Error(translations[currentLang]["pdf-error-no-images"]);

    showToast(translations[currentLang]["pdf-toast-finalizing"]);
    const pdfBytes = await pdfDoc.save();

    const fileName = `${(title || "Gallery").replace(/[^\w\s]/gi, "").trim()}_${Date.now()}.pdf`;

    if (window.Capacitor?.isNativePlatform()) {
      showToast(translations[currentLang]["pdf-toast-saving"]);

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(",")[1];
        try {
          await Filesystem.writeFile({
            path: `Download/Mori/${fileName}`,
            data: base64,
            directory: "EXTERNAL_STORAGE",
            recursive: true,
          });
          showToast(translations[currentLang]["pdf-toast-saved"]);
        } catch (fsErr) {
          console.error("FS Error:", fsErr);
          showToast(translations[currentLang]["toast-storage-error"]);
        }
      };
      reader.onerror = () =>
        showToast(translations[currentLang]["toast-memory-error"]);
      reader.readAsDataURL(blob);
    } else {
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      showToast(translations[currentLang]["toast-pdf-downloaded"]);
    }
  } catch (err) {
    console.error("PDF Export failed", err);
    showToast(
      translations[currentLang]["label-error"] +
        ": " +
        (err.message.includes("memory") ? "Out of memory" : err.message),
    );
  }
}
