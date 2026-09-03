// result.js — result section rendering, slider UI, PDF gallery export
import { translations } from "../i18n/index.js";
import { createVideoPlayer } from "../components/player.js";
import {
  truncate,
  showToast,
  stopAllMedia,
  requestWakeLock,
  releaseWakeLock,
  Filesystem,
  CapacitorHttp,
  CHROME_UA,
} from "../utils/index.js";
import {
  currentLang,
  currentSlideIndex,
  slideData,
  setCurrentSlideIndex,
  setSlideData,
} from "../modules/core.js";
import { startNativeDownload } from "./nativeDownload.js";
import { escapeHtml } from "../ui.js";

export function renderMediaSlides(container, items, resultThumbnail) {
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

    const rawUrl =
      typeof dl.url === "string"
        ? dl.url
        : dl.url?.url || dl.url?.src || String(dl.url || "");
    const lowerUrl = rawUrl.toLowerCase();
    const upperType = dl.type ? dl.type.toUpperCase() : "";

    const isImage =
      lowerUrl.includes(".jpg") ||
      lowerUrl.includes(".jpeg") ||
      lowerUrl.includes(".png") ||
      lowerUrl.includes(".webp") ||
      lowerUrl.includes(".gif") ||
      /\.(jpg|jpeg|png|webp|gif)/i.test(lowerUrl) ||
      upperType.includes("IMAGE") ||
      upperType.includes("GIF") ||
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
      dl.url.startsWith("content://");

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
        placeholder.style.cursor = "pointer";
        placeholder.onclick = () => {
          slide.removeChild(placeholder);
          const playerContainer = createVideoPlayer(dl, index, resultThumbnail);
          slide.appendChild(playerContainer);
        };
        slide.appendChild(placeholder);
      } else {
        const playerContainer = createVideoPlayer(dl, index, resultThumbnail);
        slide.appendChild(playerContainer);
      }
    } else if (isAudio) {
      if (isDataSaver && !isLocal) {
        const placeholder = document.createElement("div");
        placeholder.className = "data-saver-placeholder";
        placeholder.style.cursor = "pointer";
        placeholder.innerHTML = `<p>${translations[currentLang]["label-datasaver"]}</p>`;
        placeholder.onclick = () => {
          slide.removeChild(placeholder);
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
        };
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
      audio.controls = true;
      audio.style.width = "100%";
      const autoPlaySetting = localStorage.getItem("mori_autoplay") !== "false";
      const loopSetting = localStorage.getItem("mori_loop") !== "false";
      audio.autoplay = index === 0 && autoPlaySetting;
      audio.loop = loopSetting;

      const tauriInvoke =
        window.__TAURI__?.core?.invoke ||
        window.__TAURI_INTERNALS__?.invoke ||
        window.__TAURI__?.invoke;

      let cleanPath = dl.rawUri || dl.rawPath || dl.url || "";
      if (cleanPath.includes("_capacitor_file_")) {
        cleanPath = cleanPath.substring(
          cleanPath.indexOf("_capacitor_file_") + 16,
        );
      }
      if (cleanPath.startsWith("file://")) {
        cleanPath = cleanPath.replace(/^file:\/\//, "");
      }

      if (tauriInvoke && isLocal) {
        const mime = cleanPath.toLowerCase().endsWith(".m4a")
          ? "audio/mp4"
          : "audio/mpeg";
        tauriInvoke("tauri_read_file_bytes", { path: cleanPath })
          .then((bytes) => {
            if (bytes && bytes.length > 0) {
              const blob = new Blob([new Uint8Array(bytes)], { type: mime });
              const blobUrl = URL.createObjectURL(blob);
              audio.src = blobUrl;
              audio.load();
            } else if (dl.remoteUrl && navigator.onLine) {
              audio.src = dl.remoteUrl;
              audio.load();
            } else {
              audio.style.display = "none";
            }
          })
          .catch((e) => {
            console.warn("Tauri audio read error:", e);
            if (dl.remoteUrl && navigator.onLine) {
              audio.src = dl.remoteUrl;
              audio.load();
            } else {
              audio.style.display = "none";
            }
          });
      } else {
        audio.src = dl.url;
      }

      let audioRetried = false;
      let audioRemoteRetried = false;
      audio.onerror = async () => {
        if (
          !audioRetried &&
          (dl.url.includes("_capacitor_file_") ||
            dl.url.startsWith("file://")) &&
          window.Capacitor?.isNativePlatform?.() &&
          Filesystem
        ) {
          audioRetried = true;
          console.warn("Attempting local blob fallback for audio...");
          try {
            const rawTarget = dl.rawPath || cleanPath;
            let relPath = rawTarget
              .replace(/^.*\/storage\/emulated\/0\//, "")
              .replace(/^\//, "");
            try {
              relPath = decodeURIComponent(relPath);
            } catch (_) {}

            let res;
            const dirsToTry = ["EXTERNAL_STORAGE", "DOCUMENTS", "EXTERNAL"];
            for (const d of dirsToTry) {
              try {
                res = await Filesystem.readFile({
                  path: relPath,
                  directory: d,
                });
                if (res && res.data) break;
              } catch (_) {}
            }

            if (!res && dl.rawPath) {
              let directRaw = dl.rawPath;
              try { directRaw = decodeURIComponent(directRaw); } catch (_) {}
              for (const d of dirsToTry) {
                try {
                  res = await Filesystem.readFile({
                    path: directRaw,
                    directory: d,
                  });
                  if (res && res.data) break;
                } catch (_) {}
              }
            }

            if (!res) {
              let absP = cleanPath;
              try { absP = decodeURIComponent(absP); } catch (_) {}
              try {
                res = await Filesystem.readFile({ path: absP });
              } catch (_) {}
            }

            if (res && res.data) {
              const byteChars = atob(res.data);
              const byteArr = new Uint8Array(byteChars.length);
              for (let i = 0; i < byteChars.length; i++) {
                byteArr[i] = byteChars.charCodeAt(i);
              }
              const blob = new Blob([byteArr], { type: "audio/mp3" });
              audio.src = URL.createObjectURL(blob);
              audio.load();
              return;
            }
          } catch (e) {
            console.warn("Audio blob fallback failed:", e);
          }
        }

        if (
          !audioRemoteRetried &&
          dl.remoteUrl &&
          audio.src !== dl.remoteUrl &&
          navigator.onLine
        ) {
          audioRemoteRetried = true;
          audio.src = dl.remoteUrl;
          audio.load();
          return;
        }

        audio.style.display = "none";
      };

      slide.appendChild(audio);
    } else {
      if (isDataSaver && !isLocal) {
        const placeholder = document.createElement("div");
        placeholder.className = "data-saver-placeholder";
        placeholder.innerHTML = `<p>${translations[currentLang]["label-datasaver"]}</p>`;
        slide.appendChild(placeholder);
      } else {
        const img = document.createElement("img");
        const imageSrc =
          dl.thumbnail ||
          (typeof dl.url === "string" ? dl.url : "") ||
          resultThumbnail ||
          "";
        setupImageLoading(img, imageSrc, resultThumbnail);
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
export function setupImageLoading(img, src, resultThumbnail) {
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
    const isLocal =
      img.src.includes("_capacitor_file_") ||
      img.src.startsWith("file://") ||
      img.src.startsWith("data:") ||
      img.src.startsWith("blob:");

    if (isLocal) {
      if (
        !img.dataset.localRetried &&
        window.Capacitor?.isNativePlatform?.() &&
        Filesystem
      ) {
        img.dataset.localRetried = "1";
        let cleanPath = img.src;
        if (cleanPath.includes("_capacitor_file_")) {
          cleanPath = cleanPath.substring(
            cleanPath.indexOf("_capacitor_file_") + 16,
          );
        }
        if (cleanPath.startsWith("file://")) {
          cleanPath = cleanPath.replace(/^file:\/\//, "");
        }
        Filesystem.readFile({ path: cleanPath })
          .then((res) => {
            if (res && res.data) {
              const ext = cleanPath.split(".").pop().toLowerCase();
              const mime =
                ext === "png"
                  ? "image/png"
                  : ext === "webp"
                    ? "image/webp"
                    : "image/jpeg";
              img.src = `data:${mime};base64,${res.data}`;
            } else if (fallbackThumb && img.src !== fallbackThumb) {
              img.src = fallbackThumb;
            }
          })
          .catch(() => {
            if (fallbackThumb && img.src !== fallbackThumb) {
              img.src = fallbackThumb;
            }
          });
      } else if (fallbackThumb && img.src !== fallbackThumb) {
        img.src = fallbackThumb;
      }
      return;
    }

    if (!navigator.onLine) {
      if (fallbackThumb && img.src !== fallbackThumb) {
        img.src = fallbackThumb;
      }
      return;
    }

    if (!img.dataset.retry) {
      img.dataset.retry = "1";
      const originalSrc = img.src;
      img.src = `https://images.weserv.nl/?url=${encodeURIComponent(originalSrc)}&default=${encodeURIComponent(originalSrc)}`;
    } else if (
      img.dataset.retry === "1" &&
      window.Capacitor?.isNativePlatform?.()
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
      if (
        targetUrl.includes("rapidcdn") ||
        targetUrl.includes("snapcdn") ||
        targetUrl.includes("snapsave")
      )
        referer = "https://snapsave.app/";

      if (CapacitorHttp) {
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
      }
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
    const media = slide.querySelector("video, audio");
    if (index === currentSlideIndex) {
      slide.classList.add("active");
      if (media) {
        if (media.readyState < 1) media.load();
        media.currentTime = 0;
        media.loop = localStorage.getItem("mori_loop") !== "false";
        if (localStorage.getItem("mori_autoplay") !== "false") {
          media.play().catch(() => {});
        }
      }
    } else {
      slide.classList.remove("active");
      if (media) media.pause();
    }
  });

  if (slideIndicator)
    slideIndicator.textContent = `${currentSlideIndex + 1} / ${sliderItems.length}`;
  if (slidePrevBtn) slidePrevBtn.disabled = currentSlideIndex === 0;
  if (slideNextBtn)
    slideNextBtn.disabled = currentSlideIndex === sliderItems.length - 1;
}

export function renderResult(result, originalUrl) {
  setSlideData(result.downloads);
  setCurrentSlideIndex(0);

  const slidesWrapper = document.getElementById("slidesWrapper");
  const sliderNav = document.getElementById("sliderNav");
  const resultTitle = document.getElementById("resultTitle");
  const downloadList = document.getElementById("downloadList");
  const resultSection = document.getElementById("resultSection");
  const urlInput = document.getElementById("urlInput");

  if (!slidesWrapper) return;
  stopAllMedia(slidesWrapper);
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
    const hasPhoto = sliderItems.some((dl) => {
      const type = (dl.type || "").toUpperCase();
      return type.includes("PHOTO") || type.includes("IMAGE");
    });
    if (hasPhoto) {
      sliderItems = sliderItems.filter((dl) => {
        const type = (dl.type || "").toUpperCase();
        return type.includes("PHOTO") || type.includes("IMAGE");
      });
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
        window.Capacitor?.isNativePlatform?.()
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
    const rawUrl =
      typeof item.url === "string"
        ? item.url
        : item.url?.url || item.url?.src || String(item.url || "");
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
    const isPlaylistOrAlbum =
      /playlist|album/i.test(originalUrl || "") ||
      /playlist|album/i.test(result.sourceUrl || "") ||
      (result.title && /\((Playlist|Album)\)/i.test(result.title));

    const hasTrackNumbers = result.downloads?.some((dl) =>
      /^\d+\.\s+/.test((dl.type || "").trim()),
    );

    const isMultiTrackContent = isPlaylistOrAlbum || hasTrackNumbers;

    if (
      isMultiTrackContent &&
      result.downloads &&
      result.downloads.length >= 2
    ) {
      const allBtn = document.createElement("button");
      allBtn.className = "dl-item dl-all-btn";

      const titleText =
        translations[currentLang]["btn-download-all-title"] || "Download All";
      const rawCountText =
        translations[currentLang]["label-items-count"] || "${count} Items";
      const countText = rawCountText.replace(
        "${count}",
        result.downloads.length,
      );

      allBtn.innerHTML = `
        <div class="dl-all-left">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
          </svg>
          <span class="dl-all-title">${escapeHtml(titleText)}</span>
        </div>
        <div class="dl-badge dl-all-badge">${escapeHtml(countText)}</div>
      `;

      let isDownloadingAll = false;
      let playlistCancelled = false;

      allBtn.addEventListener("click", async () => {
        // If downloading, act as CANCEL
        if (isDownloadingAll) {
          playlistCancelled = true;
          window._moriDownloadCancelled = true;
          return;
        }

        isDownloadingAll = true;
        playlistCancelled = false;
        window._moriDownloadCancelled = false;
        allBtn.disabled = false; // keep enabled to act as Cancel

        const total = result.downloads.length;
        const progressStr =
          translations[currentLang]["downloading-progress"] || "Downloading...";
        const cancelLabel = translations[currentLang]["btn-cancel"] || "Cancel";

        const titleSpan = allBtn.querySelector(".dl-all-title");
        const badgeEl = allBtn.querySelector(".dl-all-badge");

        if (titleSpan) titleSpan.textContent = progressStr;
        // Show cancel affordance in badge
        if (badgeEl) badgeEl.textContent = cancelLabel;

        for (let i = 0; i < total; i++) {
          if (playlistCancelled) break;

          const item = result.downloads[i];
          const currNum = i + 1;

          if (titleSpan)
            titleSpan.textContent = `${progressStr} ${currNum}/${total}`;

          // Target item button in UI if available
          const itemBtns = downloadList.querySelectorAll(
            ".dl-item:not(.dl-all-btn)",
          );
          const targetBtn = itemBtns[i] || null;

          try {
            await startNativeDownload(
              item.url,
              item.type,
              result.title,
              targetBtn,
              result.sourceUrl || originalUrl,
              false, // don't reset cancel flag between tracks
            );
          } catch (err) {
            console.error("Batch download track error:", err);
          }

          if (playlistCancelled) break;

          // Sequential delay of 300ms between tracks
          await new Promise((r) => setTimeout(r, 300));
        }

        if (titleSpan) titleSpan.textContent = titleText;
        if (badgeEl) badgeEl.textContent = countText;
        allBtn.disabled = false;
        isDownloadingAll = false;

        if (playlistCancelled) {
          showToast(
            translations[currentLang]["toast-download-cancelled"] ||
              "Download cancelled",
          );
        } else {
          const completeMsg = (
            translations[currentLang]["download-all-complete"] ||
            "All ${count} items queued for download!"
          ).replace("${count}", total);
          showToast(completeMsg);
        }
        playlistCancelled = false;
        window._moriDownloadCancelled = false;
      });

      downloadList.appendChild(allBtn);
    }

    result.downloads.forEach((dl, index) => {
      const btn = document.createElement("button");
      btn.className = "dl-item";

      // Clean UI display label by removing raw [MP3]/[MP4] tags
      let cleanType = (dl.type || "")
        .replace(/\s*\[(MP3|MP4|JPG|PNG|WEBP)\]/gi, "")
        .trim();
      const isTrackItem = /^\d+\.\s+/.test(cleanType);

      if (isTrackItem) {
        btn.classList.add("dl-track-item");
        btn.innerHTML = `<span class="track-title">${escapeHtml(cleanType)}</span><div class="dl-badge">${translations[currentLang]["label-download"]}</div>`;
      } else {
        const label = dl.quality ? `${cleanType} - ${dl.quality}` : cleanType;
        btn.innerHTML = `<div>${translations[currentLang]["label-download"]} ${index + 1}</div><span>${escapeHtml(label)}</span>`;
      }

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
export async function exportGalleryToPdf(title, items) {
  try {
    showToast(translations[currentLang]["pdf-toast-starting"]);

    // Acquire Wake Lock & Start Native Foreground Service for background protection
    if (typeof requestWakeLock === "function") requestWakeLock();
    if (window.MoriMainBridge?.startDownloadService) {
      try {
        window.MoriMainBridge.startDownloadService("Exporting PDF Gallery...");
      } catch (e) {}
    }

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
        if (item.url.includes("pixiv.net") || item.url.includes("pximg.net"))
          referer = "https://www.pixiv.net/";

        const tauriInvoke =
          window.__TAURI__?.core?.invoke ||
          window.__TAURI_INTERNALS__?.invoke ||
          window.__TAURI__?.invoke;

        if (CapacitorHttp) {
          return CapacitorHttp.get({
            url: item.url,
            responseType: "arraybuffer",
            connectTimeout: 30000,
            readTimeout: 60000,
            headers: { Referer: referer, "User-Agent": CHROME_UA },
          }).catch((err) => ({ status: 0, error: err }));
        } else if (tauriInvoke) {
          return tauriInvoke("tauri_fetch_bytes", {
            url: item.url,
            headers: { Referer: referer, "User-Agent": CHROME_UA },
          })
            .then((bytes) => {
              if (bytes && bytes.length > 0) {
                const arr = new Uint8Array(bytes);
                return { status: 200, data: arr.buffer };
              }
              throw new Error("Empty image bytes");
            })
            .catch((err) => ({ status: 0, error: err }));
        } else {
          return fetch(item.url, { headers: { Referer: referer } })
            .then((res) => res.arrayBuffer())
            .then((buf) => ({ status: 200, data: buf }))
            .catch((err) => ({ status: 0, error: err }));
        }
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

    // Dynamic folder structure for PDF exports
    let pdfSubfolder = localStorage.getItem("mori_download_path") || "Mori";
    if (localStorage.getItem("mori_auto_folder") !== "false") {
      const firstUrl = (items[0]?.url || "").toLowerCase();
      let platformFolder = "Other";
      if (
        firstUrl.includes("pixiv") ||
        firstUrl.includes("pximg") ||
        firstUrl.includes("pixiv.me")
      )
        platformFolder = "Pixiv";
      else if (
        firstUrl.includes("instagram") ||
        firstUrl.includes("instagr.am")
      )
        platformFolder = "Instagram";
      else if (firstUrl.includes("pinterest") || firstUrl.includes("pin.it"))
        platformFolder = "Pinterest";
      else if (
        firstUrl.includes("rednote") ||
        firstUrl.includes("xiaohongshu") ||
        firstUrl.includes("xhslink")
      )
        platformFolder = "RedNote";
      else if (
        firstUrl.includes("tiktok") ||
        firstUrl.includes("douyin") ||
        firstUrl.includes("iesdouyin")
      )
        platformFolder = "TikTok";
      else if (
        firstUrl.includes("twitter") ||
        firstUrl.includes("x.com") ||
        firstUrl.includes("t.co")
      )
        platformFolder = "Twitter";
      else if (
        firstUrl.includes("facebook") ||
        firstUrl.includes("fb.watch") ||
        firstUrl.includes("fb.com")
      )
        platformFolder = "Facebook";
      else if (
        firstUrl.includes("threads.net") ||
        firstUrl.includes("threads.com")
      )
        platformFolder = "Threads";
      else if (
        firstUrl.includes("bilibili") ||
        firstUrl.includes("b23.tv") ||
        firstUrl.includes("bili.im")
      )
        platformFolder = "Bilibili";

      pdfSubfolder = `${pdfSubfolder}/${platformFolder}`;
    }

    const targetPdfPath = `Download/${pdfSubfolder}/${fileName}`;

    if (window.Capacitor?.isNativePlatform?.()) {
      showToast(translations[currentLang]["pdf-toast-saving"]);

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(",")[1];
        try {
          await Filesystem.writeFile({
            path: targetPdfPath,
            data: base64,
            directory: "EXTERNAL_STORAGE",
            recursive: true,
          });
          showToast(translations[currentLang]["pdf-toast-saved"]);

          if (window.MoriMainBridge?.showCompleteNotification) {
            try {
              window.MoriMainBridge.showCompleteNotification(
                "PDF Gallery Complete ✓",
                targetPdfPath,
              );
            } catch (e) {}
          }
        } catch (fsErr) {
          console.error("FS Error:", fsErr);
          showToast(translations[currentLang]["toast-storage-error"]);
        }
      };
      reader.onerror = () =>
        showToast(translations[currentLang]["toast-memory-error"]);
      reader.readAsDataURL(blob);
    } else {
      const tauriInvoke =
        window.__TAURI__?.core?.invoke ||
        window.__TAURI_INTERNALS__?.invoke ||
        window.__TAURI__?.invoke;

      let savedTauri = false;
      if (tauriInvoke) {
        try {
          const customFolder =
            localStorage.getItem("mori_download_path") || "Mori";
          await tauriInvoke("tauri_save_bytes_file", {
            bytes: Array.from(pdfBytes),
            filename: fileName,
            folder: customFolder,
          });
          savedTauri = true;
          showToast(
            translations[currentLang]["pdf-toast-saved"] ||
              "PDF saved to Mori folder!",
          );
        } catch (e) {
          console.warn(
            "Tauri save PDF failed, falling back to browser download:",
            e,
          );
        }
      }

      if (!savedTauri) {
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        showToast(translations[currentLang]["toast-pdf-downloaded"]);
      }
    }
  } catch (err) {
    console.error("PDF Export failed", err);
    showToast(
      translations[currentLang]["label-error"] +
        ": " +
        (err.message.includes("memory") ? "Out of memory" : err.message),
    );
    if (window.MoriMainBridge?.showFailedNotification) {
      try {
        window.MoriMainBridge.showFailedNotification("PDF Export", err.message);
      } catch (e) {}
    }
  } finally {
    if (typeof releaseWakeLock === "function") releaseWakeLock();
    if (window.MoriMainBridge?.stopDownloadService) {
      try {
        window.MoriMainBridge.stopDownloadService();
      } catch (e) {}
    }
  }
}
