// resultModal.js — media detail modal
import { translations } from "../i18n/index.js";
import {
  showToast,
  stopAllMedia,
  truncate,
  copyToClipboard,
  Filesystem,
} from "../utils/index.js";
import { currentLang } from "../modules/core.js";
import { renderMediaSlides } from "./result.js";

export function getCleanDirectoryPath(item, rawFile, itemType) {
  let p = rawFile || "";
  if (!p) {
    if (item?.localFiles && item.localFiles.length > 0) {
      const match = itemType
        ? item.localFiles.find((f) => f.type === itemType)
        : null;
      const chosen = match || item.localFiles[0];
      p = chosen.path || chosen.uri || "";
    } else if (item?.localUri) {
      p = item.localUri;
    } else if (item?.filePath) {
      p = item.filePath;
    }
  }

  if (p) {
    let cleaned = String(p);
    try {
      cleaned = decodeURIComponent(cleaned);
    } catch (_) {}
    if (cleaned.includes("_capacitor_file_")) {
      cleaned = cleaned.substring(cleaned.indexOf("_capacitor_file_") + 16);
    }
    cleaned = cleaned.replace(/^file:\/\//i, "");
    cleaned = cleaned.replace(/^\/storage\/emulated\/0\//i, "");
    cleaned = cleaned.replace(/^\/sdcard\//i, "");
    cleaned = cleaned.replace(/^\//, "");

    const lastSlash = cleaned.lastIndexOf("/");
    if (lastSlash !== -1) {
      return cleaned.substring(0, lastSlash);
    }
    if (!cleaned.includes(".")) {
      return cleaned;
    }
  }

  // Fallback by format / category
  const type = (itemType || item?.type || "").toUpperCase();
  const title = (item?.title || item?.url || "").toLowerCase();
  const isPdf =
    type.includes("PDF") ||
    title.endsWith(".pdf") ||
    item?.type === "PDF" ||
    (item?.localFiles &&
      item.localFiles.some((f) =>
        (f?.path || f?.uri || "").toLowerCase().endsWith(".pdf"),
      )) ||
    (item?.downloads &&
      item.downloads.some((d) =>
        (d?.type || "").toUpperCase().includes("PDF"),
      ));

  if (isPdf) {
    return localStorage.getItem("mori_pdf_path") || "Download/Mori";
  }

  const isAudio =
    type === "AUDIO" ||
    type === "MP3" ||
    item?.type === "AUDIO" ||
    item?.type === "MP3" ||
    title.endsWith(".mp3") ||
    title.endsWith(".m4a") ||
    (item?.url &&
      (item.url.includes("spotify") ||
        item.url.includes("soundcloud") ||
        item.url.includes("bandcamp") ||
        item.url.includes("music.apple")));

  if (isAudio) {
    return localStorage.getItem("mori_music_path") || "Music/Mori";
  }

  const isPhoto =
    type === "IMAGE" ||
    type === "PHOTO" ||
    item?.type === "IMAGE" ||
    item?.type === "PHOTO" ||
    title.endsWith(".jpg") ||
    title.endsWith(".png") ||
    title.endsWith(".webp") ||
    (item?.url && item.url.includes("pinterest"));

  if (isPhoto) {
    return localStorage.getItem("mori_photo_path") || "Pictures/Mori";
  }

  return localStorage.getItem("mori_video_path") || "Movies/Mori";
}

let modalCurrentSlide = 0;

export async function showModal(item, onRedownload) {
  try {
    if (!item) return;
    window._moriIsModalOpen = true;

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
    stopAllMedia(slidesWrapper);
    slidesWrapper.innerHTML = "";
    modalCurrentSlide = 0;

    const localFiles = item.localFiles || [];
    const displayItems = [];

    const toRawFileUrl = (pathOrUri) => {
      if (!pathOrUri) return "";
      if (
        pathOrUri.startsWith("http://") ||
        pathOrUri.startsWith("https://") ||
        pathOrUri.startsWith("data:") ||
        pathOrUri.startsWith("blob:") ||
        pathOrUri.startsWith("content://")
      ) {
        return pathOrUri;
      }
      let full = String(pathOrUri);
      try {
        full = decodeURIComponent(full);
      } catch (_) {}
      if (full.includes("_capacitor_file_")) {
        full = full.substring(full.indexOf("_capacitor_file_") + 16);
      }
      if (full.startsWith("file://")) {
        return full;
      }
      const platform = window.Capacitor?.getPlatform?.();
      if (!full.startsWith("/")) {
        if (platform === "android") {
          full = "/storage/emulated/0/" + full.replace(/^\//, "");
        }
      }
      return full.startsWith("file://")
        ? full
        : "file://" + (full.startsWith("/") ? full : "/" + full);
    };

    const toCapacitorUrl = (pathOrUri) => {
      const rawFile = toRawFileUrl(pathOrUri);
      return window.Capacitor?.convertFileSrc(rawFile) || rawFile;
    };

    const hasDownloadedFiles =
      (localFiles && localFiles.length > 0) ||
      !!item.localUri ||
      (item.downloads &&
        item.downloads.some((dl) => dl && (dl.localUrl || dl.localSrc)));

    if (hasDownloadedFiles) {
      if (localFiles.length > 0) {
        localFiles.forEach((file) => {
          if (file && (file.path || file.uri)) {
            const fileSrc = file.uri || file.path;
            const mediaType =
              file.type ||
              (fileSrc.toLowerCase().endsWith(".mp4")
                ? "VIDEO"
                : fileSrc.toLowerCase().endsWith(".mp3")
                  ? "MP3"
                  : "IMAGE");

            const thumb = file.thumbnail || item.localThumbnail || item.thumbnail;

            displayItems.push({
              url: toCapacitorUrl(fileSrc),
              remoteUrl: null,
              rawPath: file.path || file.uri,
              rawUri: file.uri || file.path,
              type: mediaType,
              thumbnail: thumb,
              title: file.title || item.title,
              isLocal: true,
              file: file,
            });
          }
        });
      } else if (item.localUri) {
        const fileSrc = item.localUri;
        const mediaType = fileSrc.toLowerCase().endsWith(".mp4")
          ? "VIDEO"
          : fileSrc.toLowerCase().endsWith(".mp3")
            ? "MP3"
            : "IMAGE";
        displayItems.push({
          url: toCapacitorUrl(fileSrc),
          rawPath: item.localUri,
          rawUri: item.localUri,
          type: mediaType,
          thumbnail: item.localThumbnail || item.thumbnail,
          title: item.title,
          isLocal: true,
        });
      } else if (item.downloads && item.downloads.length > 0) {
        item.downloads.forEach((dl) => {
          if (dl && (dl.localUrl || dl.localSrc)) {
            const localUrl = dl.localUrl || dl.localSrc;
            const mediaType =
              dl.type ||
              (localUrl.toLowerCase().includes(".mp4")
                ? "VIDEO"
                : localUrl.toLowerCase().includes(".mp3")
                  ? "MP3"
                  : "IMAGE");
            displayItems.push({
              url: localUrl,
              remoteUrl: dl.url || dl.src,
              rawPath: dl.localPath || dl.path || localUrl,
              rawUri: dl.localUri || dl.uri || localUrl,
              type: mediaType,
              thumbnail: dl.thumbnail || item.localThumbnail || item.thumbnail,
              title: dl.title || item.title,
              isLocal: true,
            });
          }
        });
      }
    } else {
      const photoDownloads = item.downloads
        ? item.downloads.filter((dl) => {
            const t = (dl?.type || "").toUpperCase();
            return t.includes("PHOTO") || t.includes("IMAGE");
          })
        : [];

      if (photoDownloads.length > 0) {
        photoDownloads.forEach((dl) => {
          displayItems.push({
            url: dl.url || dl.src,
            type: "IMAGE",
            thumbnail: dl.thumbnail || item.thumbnail,
            title: dl.title || item.title,
            isLocal: false,
          });
        });
      } else {
        displayItems.push({
          url:
            item.thumbnail ||
            (item.downloads && item.downloads[0]?.url) ||
            item.url ||
            "",
          type: "IMAGE",
          thumbnail: item.thumbnail,
          title: item.title,
          isLocal: false,
        });
      }
    }

    renderMediaSlides(slidesWrapper, displayItems, item.thumbnail);

    const modalPath = document.getElementById("modalPath");
    const pathVal = modalPath ? modalPath.querySelector(".path-val") : null;
    const pathStatus = modalPath ? modalPath.querySelector(".path-status") : null;

    const showMissingStatus = () => {
      if (!modalPath) return;
      modalPath.classList.add("file-deleted");
      if (pathStatus) {
        const missingText =
          translations[currentLang]?.["label-file-missing"] ||
          translations["en"]?.["label-file-missing"] ||
          "File missing";
        pathStatus.textContent = `(${missingText})`;
        pathStatus.classList.remove("hidden");
      }
    };

    const clearMissingStatus = () => {
      if (!modalPath) return;
      modalPath.classList.remove("file-deleted");
      if (pathStatus) pathStatus.classList.add("hidden");
    };

    const updateModalSlider = () => {
      const slides = slidesWrapper.querySelectorAll(".preview-slide");
      slides.forEach((s, i) => {
        const isActive = i === modalCurrentSlide;
        s.classList.toggle("active", isActive);
        const media = s.querySelector("video, audio");
        if (media) {
          if (isActive) {
            media.loop = localStorage.getItem("mori_loop") !== "false";
            if (localStorage.getItem("mori_autoplay") !== "false") {
              if (media.paused) {
                media.play().catch(() => {});
              }
            }
          } else {
            media.pause();
            try {
              if (media.currentTime > 0.5) {
                media.currentTime = 0;
              }
            } catch (_) {}
          }
        }
      });

      const indicator = document.getElementById("modalSlideIndicator");
      if (indicator)
        indicator.textContent = `${modalCurrentSlide + 1} / ${displayItems.length}`;

      // Update Directory Path and open file action for the current active slide
      const currentSlide = displayItems[modalCurrentSlide];
      if (modalPath && currentSlide) {
        let rawPath =
          currentSlide.rawPath ||
          currentSlide.rawUri ||
          currentSlide.file?.path ||
          currentSlide.file?.uri ||
          "";

        if (!rawPath && item.localFiles && item.localFiles.length > 0) {
          const matched =
            item.localFiles.find((f) => f.type === currentSlide.type) ||
            item.localFiles[modalCurrentSlide] ||
            item.localFiles[0];
          rawPath = matched?.path || matched?.uri || "";
        }
        if (!rawPath) {
          rawPath = item.localUri || item.filePath || "";
        }

        const dirPath = getCleanDirectoryPath(item, rawPath, currentSlide.type);

        if (pathVal) {
          pathVal.textContent = dirPath;
        } else {
          modalPath.textContent = dirPath;
        }

        if (!hasDownloadedFiles || !currentSlide.isLocal) {
          showMissingStatus();
        } else {
          clearMissingStatus();
        }

        modalPath.onclick = () => {
          if (rawPath && window.MoriMainBridge?.openFile) {
            const opened = window.MoriMainBridge.openFile(rawPath);
            if (!opened) copyToClipboard(dirPath);
          } else {
            copyToClipboard(dirPath);
          }
        };
      }
    };

    if (displayItems.length > 1) {
      if (sliderNav) sliderNav.classList.remove("hidden");
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

      // Horizontal Touch Swipe for modal slider
      let touchStartX = 0;
      let touchStartY = 0;

      slidesWrapper.ontouchstart = (e) => {
        if (e.touches && e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      };

      slidesWrapper.ontouchend = (e) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const target = e.target;
        if (
          target.closest("input") ||
          target.closest("button") ||
          target.closest(".mori-player-controls") ||
          target.closest(".custom-controls") ||
          target.closest(".player-control-btn") ||
          target.closest(".timeline-container") ||
          target.closest(".scrubber-bar")
        ) {
          return;
        }

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;

        if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
          if (diffX > 0) {
            modalCurrentSlide = (modalCurrentSlide + 1) % displayItems.length;
            updateModalSlider();
          } else {
            modalCurrentSlide =
              (modalCurrentSlide - 1 + displayItems.length) % displayItems.length;
            updateModalSlider();
          }
        }
      };
    } else {
      if (sliderNav) sliderNav.classList.add("hidden");
      slidesWrapper.ontouchstart = null;
      slidesWrapper.ontouchend = null;
    }

    if (hasDownloadedFiles) {
      slidesWrapper.addEventListener("error", showMissingStatus, true);
      slidesWrapper.addEventListener(
        "mori_media_load_error",
        showMissingStatus,
      );
      slidesWrapper.addEventListener("loadeddata", clearMissingStatus, true);
      slidesWrapper.addEventListener("load", clearMissingStatus, true);
    }

    requestAnimationFrame(() => {
      updateModalSlider();
    });

    if (modalUrl) {
      const rawUrl = item.url || "";
      const displayUrl =
        rawUrl.length > 50 ? rawUrl.substring(0, 50) + "..." : rawUrl;
      modalUrl.textContent = displayUrl;
      modalUrl.title = rawUrl;
      modalUrl.onclick = () => copyToClipboard(rawUrl);
    }

    const modalFavBtn = document.getElementById("modalFavBtn");
    if (modalFavBtn) {
      let isFav = !!item.favorite;
      const hist = JSON.parse(localStorage.getItem("mori_history") || "[]");
      const found = hist.find((h) => h.url === item.url);
      if (found) isFav = !!found.favorite;

      const updateFavUI = (active) => {
        modalFavBtn.classList.toggle("active", active);
        const icon = modalFavBtn.querySelector(".heart-icon");
        if (icon) {
          icon.setAttribute("fill", active ? "#ff3b5c" : "none");
          icon.setAttribute("stroke", active ? "#ff3b5c" : "currentColor");
        }
      };
      updateFavUI(isFav);

      modalFavBtn.onclick = (e) => {
        e.stopPropagation();
        if (typeof window.toggleMoriFavorite === "function") {
          const newFavState = window.toggleMoriFavorite(item.url);
          updateFavUI(newFavState);
          item.favorite = newFavState;
        }
      };

      const onFavSync = (e) => {
        if (
          e.detail &&
          (e.detail.url === item.url ||
            (e.detail.item && e.detail.item.url === item.url))
        ) {
          item.favorite = e.detail.favorite;
          updateFavUI(e.detail.favorite);
        }
      };
      window.addEventListener("mori_favorite_toggled", onFavSync, {
        once: true,
      });
    }

    if (redownloadBtn) {
      redownloadBtn.onclick = (e) => {
        e.stopPropagation();
        window._moriIsModalOpen = false;
        stopAllMedia(slidesWrapper);
        slidesWrapper.innerHTML = "";
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
