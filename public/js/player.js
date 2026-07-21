import { CapacitorHttp, Filesystem, showToast, currentLang } from "./utils.js";
import { translations } from "./i18n.js";

/**
 * Creates a custom video player element with all MoriPlayer controls.
 * @param {Object} dl - Download item with url, type, thumbnail properties.
 * @param {number} index - Slide index (0-based).
 * @param {string} resultThumbnail - Fallback thumbnail URL.
 * @returns {HTMLElement} The player container element.
 */


export function createVideoPlayer(dl, index, resultThumbnail) {
  const playerContainer = document.createElement("div");
  playerContainer.className = "mori-player-container";
  playerContainer.style.backgroundColor = "black";
  playerContainer.style.display = "flex";
  playerContainer.style.alignItems = "center";
  playerContainer.style.justifyContent = "center";
  playerContainer.style.maxHeight = "80vh";

  const video = document.createElement("video");
  video.setAttribute("referrerpolicy", "no-referrer");

  let videoUrl = dl.url || "";
  const isDouyin = /douyin|snssdk/i.test(videoUrl);

  if (videoUrl.startsWith("http://") && !isDouyin) {
    videoUrl = videoUrl.replace("http://", "https://");
  }

  const isBilibili = /bilibili|bilivideo/i.test(videoUrl);
  const isRedNote = /xiaohongshu|rednote|xhscdn/i.test(videoUrl);
  const needsBypass = isDouyin || isRedNote;
  const isNative = window.Capacitor?.isNativePlatform();

  if (needsBypass && isNative && CapacitorHttp) {
    playerContainer.classList.add("mori-loading");

    let referer = "https://www.google.com/";
    let ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";

    if (isBilibili) {
      referer = videoUrl.includes("bilibili.tv") ? "https://www.bilibili.tv/" : "https://www.bilibili.com/";
      ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36";
    } else if (isDouyin) {
      referer = "https://www.douyin.com/";
    } else if (isRedNote) {
      referer = "https://www.xiaohongshu.com/";
    }

    CapacitorHttp.get({
      url: videoUrl,
      responseType: "blob",
      headers: {
        "Referer": referer,
        "User-Agent": ua,
        "Range": "bytes=0-3145728"
      }
    }).then((res) => {
      if (res.status >= 200 && res.status < 300 && res.data && (res.data instanceof Blob || res.data.constructor?.name === "Blob")) {
        const fileUrl = URL.createObjectURL(res.data);
        video.src = fileUrl;
        
        // Auto-play if active
        const isCurrentActiveSlide = playerContainer.parentElement && playerContainer.parentElement.classList.contains("active");
        const autoPlaySetting = localStorage.getItem("mori_autoplay") !== "false";
        if ((index === 0 || isCurrentActiveSlide) && autoPlaySetting && video.paused) {
          video.play().catch(() => {});
        }
      } else {
        throw new Error(`Invalid response (Status ${res.status})`);
      }
    }).catch((err) => {
      console.error("Native preview fetch failed, falling back:", err);
      video.src = videoUrl;
    });
  } else {
    video.src = videoUrl;
  }

  const loopSetting = localStorage.getItem("mori_loop") !== "false";
  video.loop = loopSetting;
  video.preload = index === 0 ? "auto" : "metadata";
  const autoPlaySetting = localStorage.getItem("mori_autoplay") !== "false";
  video.autoplay = index === 0 && autoPlaySetting;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");

  let posterThumb = dl.thumbnail || resultThumbnail || "";
  const isIndownPoster =
    posterThumb.includes("indown.io") &&
    !posterThumb.includes("url=") &&
    !posterThumb.includes("token=");

  if (
    posterThumb &&
    (posterThumb.includes("logo") ||
      posterThumb.includes("placeholder") ||
      posterThumb.includes("images/") ||
      isIndownPoster)
  ) {
    posterThumb = "";
  }
  video.poster = posterThumb;

  // Add loading & error event handlers
  const removeLoading = () => playerContainer.classList.remove("mori-loading");
  playerContainer.classList.add("mori-loading");

  video.onwaiting = () => playerContainer.classList.add("mori-loading");
  video.onplaying = removeLoading;
  video.oncanplay = removeLoading;
  video.onloadeddata = removeLoading;
  video.onloadedmetadata = removeLoading;
  video.onstalled = removeLoading;
  video.onpause = removeLoading;

  video.onerror = (e) => {
    removeLoading();
    console.error("Video element loading error:", video.error);
    if (posterThumb && !playerContainer.querySelector(".fallback-img")) {
      const fallbackImg = document.createElement("img");
      fallbackImg.className = "fallback-img";
      fallbackImg.src = posterThumb;
      fallbackImg.style.width = "100%";
      fallbackImg.style.height = "100%";
      fallbackImg.style.objectFit = "contain";
      fallbackImg.style.position = "absolute";
      fallbackImg.style.top = "0";
      fallbackImg.style.left = "0";
      playerContainer.appendChild(fallbackImg);
    }
  };

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

  video.onplay = () => {
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
    bigPlay.classList.remove("visible");
  };

  video.onpause = () => {
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
    bigPlay.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    bigPlay.classList.add("visible");
  };

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (video.paused) {
      video.loop = localStorage.getItem("mori_loop") !== "false";
      video.play().catch(() => {});
    } else {
      video.pause();
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

  // Return cleanup function to remove window listeners when player is destroyed
  playerContainer._cleanup = () => {
    window.removeEventListener("mousemove", doDrag);
    window.removeEventListener("mouseup", stopDrag);
    window.removeEventListener("touchmove", doDrag);
    window.removeEventListener("touchend", stopDrag);
    if (playerContainer._blobUrl) {
      URL.revokeObjectURL(playerContainer._blobUrl);
    }
  };

  return playerContainer;
}
