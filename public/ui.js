import { translations } from "./i18n.js";
import {
  truncate,
  showToast,
  copyToClipboard,
  cleanUrl,
  Filesystem,
  CapacitorHttp,
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
  container.innerHTML = "";
  items.forEach((dl, index) => {
    const slide = document.createElement("div");
    slide.className = "preview-slide" + (index === 0 ? " active" : "");

    const lowerUrl = dl.url ? dl.url.toLowerCase() : "";
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

    if (isVideo) {
      const playerContainer = document.createElement("div");
      playerContainer.className = "mori-player-container";
      playerContainer.style.backgroundColor = "black";
      playerContainer.style.display = "flex";
      playerContainer.style.alignItems = "center";
      playerContainer.style.justifyContent = "center";
      playerContainer.style.maxHeight = "80vh";

      const video = document.createElement("video");
      video.src = dl.url;
      video.loop = true;
      video.muted = false;
      video.preload = index === 0 ? "auto" : "metadata";
      video.autoplay = index === 0;
      video.playsInline = true;
      video.poster = dl.thumbnail || resultThumbnail || "";

      // Add loading class
      playerContainer.classList.add("mori-loading");
      video.onwaiting = () => playerContainer.classList.add("mori-loading");
      video.onplaying = () => playerContainer.classList.remove("mori-loading");
      video.oncanplay = () => playerContainer.classList.remove("mori-loading");

      // Custom Controls
      playerContainer.appendChild(video);

      const bigPlay = document.createElement("div");
      bigPlay.className = "mori-player-big-play";
      bigPlay.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
      playerContainer.appendChild(bigPlay);

      const controls = document.createElement("div");
      controls.className = "mori-player-controls";
      controls.innerHTML = `
        <div class="mori-player-progress">
          <div class="mori-player-progress-inner"></div>
        </div>
        <div class="mori-player-bottom">
          <div class="mori-player-actions">
            <button class="mori-player-btn play-toggle">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" class="play-icon"><path d="M8 5v14l11-7z"/></svg>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" class="pause-icon hidden"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <span class="mori-player-time">0:00 / 0:00</span>
          </div>
          <div class="mori-player-actions">
            <button class="mori-player-btn mute-toggle">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" class="unmute-icon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" class="mute-icon hidden"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.58.45-1.24.8-1.95.99v2.06c1.26-.26 2.4-.83 3.37-1.62l3.06 3.06L21 21.73l-16.73-16.73zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            </button>
            <button class="mori-player-btn fullscreen-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
            </button>
          </div>
        </div>
      `;
      playerContainer.appendChild(controls);

      // JS Logic for this player
      const playBtn = controls.querySelector(".play-toggle");
      const playIcon = playBtn.querySelector(".play-icon");
      const pauseIcon = playBtn.querySelector(".pause-icon");
      const timeDisplay = controls.querySelector(".mori-player-time");
      const prog = controls.querySelector(".mori-player-progress");
      const progInner = controls.querySelector(".mori-player-progress-inner");
      const muteBtn = controls.querySelector(".mute-toggle");
      const unmuteIcon = muteBtn.querySelector(".unmute-icon");
      const muteIcon = muteBtn.querySelector(".mute-icon");
      const fsBtn = controls.querySelector(".fullscreen-btn");

      const formatTime = (s) => {
        if (!s || isNaN(s)) return "0:00";
        const min = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${min}:${sec < 10 ? "0" : ""}${sec}`;
      };

      let lastShowTime = 0;
      const updateProgress = () => {
        const p = (video.currentTime / (video.duration || 1)) * 100;
        progInner.style.width = `${p}%`;
        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
      };

      const togglePlay = (e) => {
        if (e) e.stopPropagation();
        if (video.paused) {
          video.play().catch(() => {});
          playIcon.classList.add("hidden");
          pauseIcon.classList.remove("hidden");
          bigPlay.classList.remove("visible");
        } else {
          video.pause();
          playIcon.classList.remove("hidden");
          pauseIcon.classList.add("hidden");
          bigPlay.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
          bigPlay.classList.add("visible");
        }
      };

      playerContainer.onclick = (e) => {
        if (e) e.stopPropagation();
        if (Date.now() - lastShowTime < 300) return;

        if (!playerContainer.classList.contains("touching")) {
          showControls();
        } else {
          togglePlay(e);
        }
      };
      playBtn.onclick = togglePlay;

      video.ontimeupdate = updateProgress;
      video.onloadedmetadata = () => {
        updateProgress();
        // Remove fixed aspect ratio, let it be natural or max-height
        playerContainer.style.aspectRatio = "auto";
      };

      muteBtn.onclick = (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        unmuteIcon.classList.toggle("hidden", video.muted);
        muteIcon.classList.toggle("hidden", !video.muted);
      };

      fsBtn.onclick = (e) => {
        e.stopPropagation();
        if (video.requestFullscreen) {
          video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
          video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
          video.msRequestFullscreen();
        }
      };

      const seekToPos = (clientX) => {
        const rect = prog.getBoundingClientRect();
        let pos = (clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        video.currentTime = pos * (video.duration || 0);
      };

      let isDragging = false;
      const startDrag = (e) => {
        isDragging = true;
        seekToPos(e.clientX || e.touches[0].clientX);
      };
      const doDrag = (e) => {
        if (isDragging) {
          seekToPos(e.clientX || e.touches[0].clientX);
        }
      };
      const stopDrag = () => {
        isDragging = false;
      };

      prog.addEventListener("mousedown", startDrag);
      window.addEventListener("mousemove", doDrag);
      window.addEventListener("mouseup", stopDrag);

      prog.addEventListener(
        "touchstart",
        (e) => {
          e.stopPropagation();
          startDrag(e);
        },
        { passive: false },
      );
      window.addEventListener(
        "touchmove",
        (e) => {
          if (isDragging) {
            e.preventDefault();
            doDrag(e);
          }
        },
        { passive: false },
      );
      window.addEventListener("touchend", stopDrag);

      // Double Tap Seek Logic
      let lastTap = 0;
      playerContainer.addEventListener(
        "touchstart",
        (e) => {
          const now = Date.now();
          const tapDelay = now - lastTap;
          lastTap = now;

          if (tapDelay < 300) {
            // Double Tap Detected
            const rect = playerContainer.getBoundingClientRect();
            const touchX = e.touches[0].clientX - rect.left;
            const isRight = touchX > rect.width / 2;

            const seekAmount = isRight ? 5 : -5;
            video.currentTime = Math.max(
              0,
              Math.min(video.duration, video.currentTime + seekAmount),
            );

            // Visual Feedback
            bigPlay.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; gap:5px">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
              <path d="${isRight ? "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" : "M20 18l-8.5-6L20 6v12zm-9-12v12l-8.5-6L11 6z"}"/>
            </svg>
            <div style="font-size:14px; font-weight:bold">${isRight ? "+5s" : "-5s"}</div>
          </div>`;
            bigPlay.classList.add("visible");
            setTimeout(() => {
              bigPlay.classList.remove("visible");
              // Reset to play icon for next pause
              setTimeout(() => {
                bigPlay.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
              }, 300);
            }, 600);

            e.preventDefault();
          } else {
            showControls();
          }
        },
        { passive: false },
      );

      let hideTimeout;
      const showControls = () => {
        if (!playerContainer.classList.contains("touching")) {
          lastShowTime = Date.now();
        }
        playerContainer.classList.add("touching");
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(
          () => playerContainer.classList.remove("touching"),
          2000,
        );
      };
      playerContainer.onmousemove = showControls;

      slide.appendChild(playerContainer);
    } else if (isAudio) {
      const img = document.createElement("img");
      img.src = dl.thumbnail || resultThumbnail || "";
      img.style.width = "100%";
      img.style.maxHeight = "300px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "8px";
      img.style.marginBottom = "15px";
      slide.appendChild(img);

      const audio = document.createElement("audio");
      audio.src = dl.url;
      audio.controls = true;
      audio.style.width = "100%";
      slide.appendChild(audio);
    } else {
      const img = document.createElement("img");
      img.src = dl.thumbnail || dl.url || resultThumbnail || "";
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
    }
    container.appendChild(slide);
  });
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

  const sliderItems = slideData.filter((dl) => !dl.isMirror);
  const isSinglePreview =
    /youtube\.com|youtu\.be|soundcloud\.com|spotify\.com|music\.apple\.com/i.test(
      urlInput.value,
    ) ||
    (result.title &&
      /youtube|soundcloud|spotify|apple music/i.test(
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
    img.src = result.thumbnail || "";
    img.style.width = "100%";
    img.style.borderRadius = "8px";
    img.style.objectFit = "cover";
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

  let cleanTitleText = (
    result.title || translations[currentLang]["label-content"]
  )
    .replace(/#[^\s#]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (resultTitle) resultTitle.textContent = truncate(cleanTitleText, 80);

  if (downloadList) {
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

    let thumbSrc = item.thumbnail;
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
      card.querySelector(".delete-item-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        onDeleteClick(item.url);
      });
    }
    list.appendChild(card);
  });
  historyPage.appendChild(list);
}

export function showModal(item, onRedownload) {
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

    if (localFiles.length > 0) {
      localFiles.forEach((file) => {
        if (file && file.path) {
          displayItems.push({
            url: window.Capacitor?.convertFileSrc(file.path) || file.path,
            type:
              file.type ||
              (file.path.toLowerCase().endsWith(".mp4")
                ? "VIDEO"
                : file.path.toLowerCase().endsWith(".mp3")
                  ? "MP3"
                  : "IMAGE"),
            thumbnail: file.thumbnail,
          });
        }
      });
    } else if (item.localUri) {
      displayItems.push({
        url: window.Capacitor?.convertFileSrc(item.localUri) || item.localUri,
        type: item.localUri.toLowerCase().endsWith(".mp4")
          ? "VIDEO"
          : item.localUri.toLowerCase().endsWith(".mp3")
            ? "MP3"
            : "IMAGE",
        thumbnail: item.localThumbnail,
      });
    }

    // Final fallback if nothing found
    if (displayItems.length === 0) {
      displayItems.push({
        url: item.thumbnail || "",
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
    showToast("Error opening modal: " + err.message);
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
          showToast("Storage permission denied.");
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
    const ext = isAudio ? "mp3" : isImage ? "jpg" : "mp4";

    const sanitizedTitle = (title || "Mori Media")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .substring(0, 150);

    const fileName = `${sanitizedTitle}_${Date.now()}.${ext}`;

    await Filesystem.mkdir({
      path: "Download/Mori",
      directory: "EXTERNAL_STORAGE",
      recursive: true,
    }).catch((e) => {
      console.warn("Mkdir failed, might already exist or permission issue", e);
    });

    if (progressBar) progressBar.style.width = "100%";
    btn.innerHTML =
      translations[currentLang]["btn-processing"] || "Processing...";

    let actualDownloadUrl = url;
    if (url.includes("ytdown") || url.includes("worker")) {
      try {
        const statusRes = await CapacitorHttp.get({ url: url });
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

    const savedFile = await Filesystem.downloadFile({
      url: actualDownloadUrl,
      path: "Download/Mori/" + fileName,
      directory: "EXTERNAL_STORAGE",
      progress: true,
    });

    if (progressBar) progressBar.style.width = "100%";
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="margin-right:8px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> SAVED`;

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
      errorMsg = "Connection lost. Please check your internet.";
    }
    showToast("Download failed: " + errorMsg);
    btn.disabled = false;
    btn.innerHTML = originalContent;
    if (progressContainer) progressContainer.classList.add("hidden");
  } finally {
    if (window._moriProgressListener) {
      await window._moriProgressListener.remove();
      window._moriProgressListener = null;
    }
  }
}
