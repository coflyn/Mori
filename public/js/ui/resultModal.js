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

export function getCleanDirectoryPath(item, rawFile) {
  let p = rawFile || "";
  if (!p) {
    if (item?.localFiles && item.localFiles.length > 0) {
      p = item.localFiles[0].path || item.localFiles[0].uri || "";
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
  const title = (item?.title || item?.url || "").toLowerCase();
  const isPdf =
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
            const fileSrc = file.path || file.uri;
            const mediaType =
              file.type ||
              (fileSrc.toLowerCase().endsWith(".mp4")
                ? "VIDEO"
                : fileSrc.toLowerCase().endsWith(".mp3")
                  ? "MP3"
                  : "IMAGE");

            displayItems.push({
              url: toCapacitorUrl(fileSrc),
              remoteUrl: null,
              rawPath: file.path,
              rawUri: file.uri,
              type: mediaType,
              thumbnail:
                file.thumbnail || item.localThumbnail || item.thumbnail,
              isLocal: true,
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
              type: mediaType,
              thumbnail: dl.thumbnail || item.localThumbnail || item.thumbnail,
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
          isLocal: false,
        });
      }
    }

    renderMediaSlides(slidesWrapper, displayItems, item.thumbnail);

    const updateModalSlider = () => {
      const slides = slidesWrapper.querySelectorAll(".preview-slide");
      slides.forEach((s, i) => {
        const isActive = i === modalCurrentSlide;
        s.classList.toggle("active", isActive);
        const media = s.querySelector("video, audio");
        if (media) {
          if (isActive) {
            media.currentTime = 0;
            media.loop = localStorage.getItem("mori_loop") !== "false";
            if (localStorage.getItem("mori_autoplay") !== "false") {
              media.play().catch(() => {});
            }
          } else {
            media.pause();
          }
        }
      });
      const indicator = document.getElementById("modalSlideIndicator");
      if (indicator)
        indicator.textContent = `${modalCurrentSlide + 1} / ${displayItems.length}`;
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
      updateModalSlider();
    } else {
      if (sliderNav) sliderNav.classList.add("hidden");
      updateModalSlider();
    }

    if (modalUrl) {
      modalUrl.textContent = item.url || "";
      modalUrl.onclick = () => copyToClipboard(item.url);
    }

    const modalPath = document.getElementById("modalPath");
    if (modalPath) {
      let rawPath = "";
      if (item.localFiles && item.localFiles.length > 0) {
        rawPath = item.localFiles[0].path || item.localFiles[0].uri || "";
      } else if (item.localUri) {
        rawPath = item.localUri;
      } else if (item.filePath) {
        rawPath = item.filePath;
      }

      const dirPath = getCleanDirectoryPath(item, rawPath);
      const pathVal = modalPath.querySelector(".path-val");
      const pathStatus = modalPath.querySelector(".path-status");

      if (pathVal) {
        pathVal.textContent = dirPath;
      } else {
        modalPath.textContent = dirPath;
      }

      const showMissingStatus = () => {
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
        modalPath.classList.remove("file-deleted");
        if (pathStatus) pathStatus.classList.add("hidden");
      };

      if (!hasDownloadedFiles) {
        showMissingStatus();
      } else {
        clearMissingStatus();

        slidesWrapper.addEventListener("error", showMissingStatus, true);
        slidesWrapper.addEventListener(
          "mori_media_load_error",
          showMissingStatus,
        );

        slidesWrapper.addEventListener("loadeddata", clearMissingStatus, true);
        slidesWrapper.addEventListener("load", clearMissingStatus, true);
      }

      modalPath.onclick = () => {
        copyToClipboard(dirPath);
      };
    }

    if (redownloadBtn) {
      redownloadBtn.onclick = (e) => {
        e.stopPropagation();
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
