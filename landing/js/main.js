(function () {
  const canvas = document.getElementById("petals-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W,
    H,
    petals = [];
  const COLORS = ["#E8B4BD", "#D4849A", "#F0C8D0", "#C97A8A", "#F5DCE2"];
  const COUNT = 18;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkPetal() {
    return {
      x: Math.random() * W,
      y: Math.random() * -H,
      r: 5 + Math.random() * 8,
      speed: 0.6 + Math.random() * 0.8,
      drift: (Math.random() - 0.5) * 0.4,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: 0.3 + Math.random() * 0.5,
    };
  }

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    // Simple oval petal shape
    ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const p of petals) {
      p.y += p.speed;
      p.x += p.drift + Math.sin(p.y * 0.015) * 0.3;
      p.rot += p.rotSpeed;
      if (p.y > H + 20) {
        p.y = -20;
        p.x = Math.random() * W;
      }
      drawPetal(p);
    }
    requestAnimationFrame(tick);
  }

  resize();
  for (let i = 0; i < COUNT; i++) {
    petals.push(mkPetal());
    petals[i].y = Math.random() * H;
  }
  window.addEventListener("resize", resize);
  requestAnimationFrame(tick);
})();

(function () {
  const nav = document.getElementById("main-nav");
  const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
  const trackedIds = navLinks
    .map((a) => (a.getAttribute("href") || "").replace(/^#/, ""))
    .filter(Boolean);

  function getNavH() {
    return nav ? nav.offsetHeight : 64;
  }

  function setActive(targetId) {
    navLinks.forEach((a) => {
      const href = a.getAttribute("href");
      if (href === `#${targetId}`) {
        a.classList.add("active");
      } else {
        a.classList.remove("active");
      }
    });
  }

  function updateScrollSpy() {
    if (window.scrollY < 200) {
      setActive("");
      return;
    }

    const isBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 80;
    if (isBottom) {
      setActive(trackedIds[trackedIds.length - 1]);
      return;
    }

    const navH = getNavH() + 48;
    const scrollPos = window.scrollY + navH;
    let currentId = "";

    for (let i = 0; i < trackedIds.length; i++) {
      const sec = document.getElementById(trackedIds[i]);
      if (sec && sec.offsetTop <= scrollPos) {
        currentId = trackedIds[i];
      }
    }

    setActive(currentId);
  }

  let isNavClicking = false;
  let scrollDebounceTimer = null;

  function endNavClick() {
    isNavClicking = false;
    clearTimeout(scrollDebounceTimer);
    updateScrollSpy();
  }

  document.addEventListener("click", function (e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const hash = link.getAttribute("href");
    if (!hash || hash === "#") return;

    if (hash === "#top") {
      e.preventDefault();
      isNavClicking = true;
      setActive("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      const target = document.querySelector(hash);
      if (!target) return;

      e.preventDefault();
      const targetId = hash.slice(1);

      if (trackedIds.includes(targetId)) {
        isNavClicking = true;
        setActive(targetId);
      }

      const navH = getNavH();
      const heading = target.querySelector("h2, h3");
      const anchorEl = heading || target;
      const targetPos =
        anchorEl.getBoundingClientRect().top + window.scrollY - navH - 40;

      window.scrollTo({
        top: Math.max(0, targetPos),
        behavior: "smooth",
      });
    } catch (_) {}
  });

  ["wheel", "touchstart"].forEach((evt) => {
    window.addEventListener(
      evt,
      () => {
        if (isNavClicking) {
          endNavClick();
        }
      },
      { passive: true },
    );
  });

  function onScroll() {
    const scrollY = window.scrollY;
    nav.style.boxShadow =
      scrollY > 10 ? "0 4px 24px rgba(26,24,20,0.08)" : "none";

    if (isNavClicking) {
      clearTimeout(scrollDebounceTimer);
      scrollDebounceTimer = setTimeout(endNavClick, 120);
      return;
    }

    updateScrollSpy();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

(function () {
  const btn = document.getElementById("nav-hamburger");
  const menu = document.getElementById("mobile-menu");
  const overlay = document.getElementById("mobile-overlay");
  const closeBtn = document.getElementById("mobile-menu-close");
  const mobileLinks = document.querySelectorAll(".mobile-link");

  if (!btn || !menu) return;

  function open() {
    menu.setAttribute("aria-hidden", "false");
    if (overlay) overlay.setAttribute("aria-hidden", "false");
    btn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    if (closeBtn) closeBtn.focus();
  }

  function close(restoreFocus) {
    menu.setAttribute("aria-hidden", "true");
    if (overlay) overlay.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (restoreFocus) btn.focus();
  }

  function toggle(e) {
    if (e) e.stopPropagation();
    const isOpen = menu.getAttribute("aria-hidden") === "false";
    if (isOpen) {
      close(true);
    } else {
      open();
    }
  }

  btn.addEventListener("click", toggle);
  if (closeBtn) closeBtn.addEventListener("click", () => close(true));
  if (overlay) overlay.addEventListener("click", () => close(true));

  mobileLinks.forEach((l) => {
    l.addEventListener("click", function (e) {
      const hash = this.getAttribute("href");
      close(false);

      if (hash && hash.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(hash);
        if (target) {
          setTimeout(() => {
            const nav = document.getElementById("main-nav");
            const navH = nav ? nav.offsetHeight : 64;
            const heading = target.querySelector("h2, h3");
            const anchor = heading || target;
            const targetPos =
              anchor.getBoundingClientRect().top + window.scrollY - navH - 48;
            window.scrollTo({
              top: Math.max(0, targetPos),
              behavior: "smooth",
            });
          }, 120);
        }
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.getAttribute("aria-hidden") === "false") {
      close(true);
    }
  });
})();

(function () {
  const questions = document.querySelectorAll(".faq-question");
  questions.forEach((btn) => {
    btn.addEventListener("click", () => {
      const isExpanded = btn.getAttribute("aria-expanded") === "true";
      const answerId = btn.getAttribute("aria-controls");
      const answer = document.getElementById(answerId);

      // Close all other open items
      questions.forEach((q) => {
        if (q !== btn) {
          q.setAttribute("aria-expanded", "false");
          const a = document.getElementById(q.getAttribute("aria-controls"));
          if (a) a.classList.remove("is-open");
        }
      });

      // Toggle clicked item
      if (isExpanded) {
        btn.setAttribute("aria-expanded", "false");
        if (answer) answer.classList.remove("is-open");
      } else {
        btn.setAttribute("aria-expanded", "true");
        if (answer) answer.classList.add("is-open");
      }
    });
  });
})();

(function () {
  const container = document.getElementById("focus-carousel");
  if (!container) return;

  const track = document.getElementById("carousel-track");
  const slides = Array.from(container.querySelectorAll(".carousel-slide"));
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");
  const dotsContainer = document.getElementById("carousel-dots");
  const badgeEl = document.getElementById("carousel-badge");
  const titleEl = document.getElementById("carousel-title");
  const descEl = document.getElementById("carousel-desc");

  if (!slides.length) return;

  const total = slides.length;
  let current = 0;
  let autoplayTimer = null;
  let isUserInteracted = false;

  // Create pagination dots
  dotsContainer.innerHTML = "";
  const dots = slides.map((slide, idx) => {
    const dot = document.createElement("button");
    dot.className = "carousel-dot" + (idx === 0 ? " is-active" : "");
    dot.setAttribute("type", "button");
    dot.setAttribute("role", "tab");
    dot.setAttribute(
      "aria-label",
      `Slide ${idx + 1}: ${slide.dataset.title || ""}`,
    );
    dot.setAttribute("aria-selected", idx === 0 ? "true" : "false");
    dot.addEventListener("click", () => {
      isUserInteracted = true;
      stopAutoplay();
      goTo(idx);
    });
    dotsContainer.appendChild(dot);
    return dot;
  });

  function update() {
    slides.forEach((slide, idx) => {
      let diff = (idx - current) % total;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;

      slide.className = "carousel-slide";
      slide.setAttribute("aria-hidden", diff === 0 ? "false" : "true");

      if (diff === 0) {
        slide.classList.add("is-active");
      } else if (diff === -1) {
        slide.classList.add("is-prev");
      } else if (diff === 1) {
        slide.classList.add("is-next");
      } else if (diff === -2) {
        slide.classList.add("is-far-prev");
      } else if (diff === 2) {
        slide.classList.add("is-far-next");
      } else {
        slide.classList.add("is-hidden");
      }
    });

    dots.forEach((dot, idx) => {
      const isActive = idx === current;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    const activeSlide = slides[current];
    if (activeSlide) {
      const title = activeSlide.dataset.title || "";
      const desc = activeSlide.dataset.desc || "";
      const numStr = String(current + 1).padStart(2, "0");
      const totalStr = String(total).padStart(2, "0");

      if (badgeEl) badgeEl.textContent = `${numStr} / ${totalStr}`;
      if (titleEl) {
        titleEl.style.opacity = "0";
        setTimeout(() => {
          titleEl.textContent = title;
          titleEl.style.opacity = "1";
        }, 100);
      }
      if (descEl) {
        descEl.style.opacity = "0";
        setTimeout(() => {
          descEl.textContent = desc;
          descEl.style.opacity = "1";
        }, 100);
      }
    }
  }

  function next() {
    current = (current + 1) % total;
    update();
  }

  function prev() {
    current = (current - 1 + total) % total;
    update();
  }

  function goTo(idx) {
    current = ((idx % total) + total) % total;
    update();
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      isUserInteracted = true;
      stopAutoplay();
      prev();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      isUserInteracted = true;
      stopAutoplay();
      next();
    });
  }

  slides.forEach((slide, idx) => {
    slide.addEventListener("click", () => {
      if (idx !== current) {
        isUserInteracted = true;
        stopAutoplay();
        goTo(idx);
      }
    });
  });

  if (track) {
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        isUserInteracted = true;
        stopAutoplay();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        isUserInteracted = true;
        stopAutoplay();
        next();
      }
    });
  }

  let startX = 0;
  let isDragging = false;

  function onDragStart(x) {
    startX = x;
    isDragging = true;
  }

  function onDragEnd(x) {
    if (!isDragging) return;
    isDragging = false;
    const diff = x - startX;
    if (Math.abs(diff) > 35) {
      isUserInteracted = true;
      stopAutoplay();
      if (diff > 0) {
        prev();
      } else {
        next();
      }
    }
  }

  container.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 1) onDragStart(e.touches[0].clientX);
    },
    { passive: true },
  );

  container.addEventListener(
    "touchend",
    (e) => {
      if (e.changedTouches.length === 1) onDragEnd(e.changedTouches[0].clientX);
    },
    { passive: true },
  );

  container.addEventListener("mousedown", (e) => {
    onDragStart(e.clientX);
  });

  window.addEventListener("mouseup", (e) => {
    if (isDragging) onDragEnd(e.clientX);
  });

  function startAutoplay() {
    if (isUserInteracted) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    stopAutoplay();
    autoplayTimer = setInterval(() => {
      if (!isUserInteracted) next();
    }, 5000);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  container.addEventListener("mouseenter", stopAutoplay);
  container.addEventListener("mouseleave", () => {
    if (!isUserInteracted) startAutoplay();
  });

  update();
  startAutoplay();
})();

(function () {
  if (!window.IntersectionObserver) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const SELECTOR =
    ".step, .feature-card, .platform-item, .download-card, .faq-item, .compare-card, .changelog-entry, .focus-carousel";

  const targets = Array.from(document.querySelectorAll(SELECTOR));
  if (!targets.length) return;

  // Assign stagger delay based on sibling position, capped at 5 steps
  targets.forEach((el) => {
    const siblings = Array.from(el.parentElement.children).filter((c) =>
      c.matches(SELECTOR),
    );
    const idx = siblings.indexOf(el);
    const delay = Math.min(idx, 5) * 0.07;
    el.dataset.revealDelay = delay;
  });

  const vh = window.innerHeight;

  // Elements already on screen at load: show immediately, no animation
  targets.forEach((el) => {
    if (el.getBoundingClientRect().top < vh) {
      el.classList.add("revealed");
    } else {
      el.classList.add("reveal-pending");
    }
  });

  let lastScrollY = window.scrollY;
  let isScrollingDown = true;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      isScrollingDown = y >= lastScrollY;
      lastScrollY = y;
    },
    { passive: true },
  );

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.remove("reveal-pending");
        if (isScrollingDown) {
          const delay = el.dataset.revealDelay || 0;
          el.style.transitionDelay = delay + "s";
        } else {
          el.style.transitionDelay = "0s";
        }
        el.classList.add("revealed");
        obs.unobserve(el);
      });
    },
    { threshold: 0.08 },
  );

  targets.forEach((el) => {
    if (el.classList.contains("reveal-pending")) obs.observe(el);
  });
})();

// Github Stars
(function () {
  const starEls = document.querySelectorAll(".js-github-stars");
  if (!starEls.length) return;

  function formatCount(count) {
    return count >= 1000
      ? (count / 1000).toFixed(1).replace(/\.0$/, "") + "k"
      : String(count);
  }

  function render(countStr) {
    starEls.forEach((el) => {
      el.textContent = "★ " + countStr;
      el.removeAttribute("hidden");
    });
  }

  const CACHE_KEY = "mori_gh_stars_count";

  let currentStars = null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const num = parseInt(cached, 10);
      if (!isNaN(num) && num > 0) {
        currentStars = num;
        render(formatCount(currentStars));
      }
    }
  } catch (_) {}

  // Fetch updated count; fallback to shields.io when GitHub API hits rate limit
  function fetchStars() {
    return fetch("https://api.github.com/repos/coflyn/Mori")
      .then((res) => {
        if (!res.ok) throw new Error("GitHub API " + res.status);
        return res.json().then((d) => d.stargazers_count);
      })
      .catch(() => {
        return fetch(
          "https://img.shields.io/github/stars/coflyn/Mori.json",
        ).then((res) => {
          if (!res.ok) throw new Error("Shields API " + res.status);
          return res.json().then((d) => parseInt(d.value, 10));
        });
      });
  }

  fetchStars()
    .then((count) => {
      if (typeof count === "number" && !isNaN(count) && count > 0) {
        if (currentStars === null || count >= currentStars) {
          currentStars = count;
          try {
            localStorage.setItem(CACHE_KEY, String(count));
          } catch (_) {}
          render(formatCount(count));
        }
      }
    })
    .catch(() => {});
})();

(function () {
  const container = document.getElementById("changelog-timeline");
  if (!container) return;

  const CACHE_KEY = "mori_changelog_data";
  const CACHE_TIME_KEY = "mori_changelog_time";
  const ONE_HOUR = 3600000;

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${months[monthIdx]} ${day}, ${year}`;
    }
    return dateStr;
  }

  function renderMd(text) {
    return text
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>',
      );
  }

  function parseChangelog(text, maxReleases = 2) {
    const versionRegex =
      /^##\s*\[?([0-9]+\.[0-9]+\.[0-9]+[^\]\s]*)\]?(?:\s*-\s*([0-9]{4}-[0-9]{2}-[0-9]{2}))?/gm;
    const releases = [];
    const indices = [];
    let match;

    while ((match = versionRegex.exec(text)) !== null) {
      indices.push({
        version: match[1],
        date: match[2] || "",
        index: match.index,
        headerLen: match[0].length,
      });
    }

    for (let i = 0; i < indices.length && i < maxReleases; i++) {
      const cur = indices[i];
      const nextIndex =
        i + 1 < indices.length ? indices[i + 1].index : text.length;
      const body = text.slice(cur.index + cur.headerLen, nextIndex);

      const bulletRegex = /^[*-]\s+(.+)$/gm;
      const bullets = [];
      let bMatch;
      while ((bMatch = bulletRegex.exec(body)) !== null) {
        bullets.push(bMatch[1].trim());
        if (bullets.length >= 4) break;
      }

      releases.push({
        version: cur.version.startsWith("v") ? cur.version : "v" + cur.version,
        date: cur.date,
        bullets,
      });
    }
    return releases;
  }

  function render(releases) {
    if (!releases || !releases.length) return;
    container.innerHTML = releases
      .map((rel, idx) => {
        const isLatest = idx === 0;
        const variantClass = isLatest
          ? "changelog-entry--latest"
          : "changelog-entry--prev";
        const badge = isLatest
          ? '<span class="changelog-badge-latest">Latest</span>'
          : "";
        const dateHtml = rel.date
          ? `<time class="changelog-date" datetime="${rel.date}">${formatDate(rel.date)}</time>`
          : "";
        const listItems = rel.bullets
          .map((b) => `<li>${renderMd(b)}</li>`)
          .join("");

        return `
        <article class="changelog-entry ${variantClass} revealed">
          <header class="changelog-header">
            <div class="changelog-tag-group">
              <span class="changelog-version">${rel.version}</span>
              ${badge}
            </div>
            ${dateHtml}
          </header>
          <ul class="changelog-highlights" role="list">
            ${listItems}
          </ul>
        </article>`;
      })
      .join("");
  }

  const GITHUB_RELEASE_KEY = "mori_latest_release_data";
  const GITHUB_RELEASE_TIME = "mori_latest_release_time";

  function detectUserOS() {
    const ua = navigator.userAgent || "";
    const platform =
      (navigator.userAgentData && navigator.userAgentData.platform) ||
      navigator.platform ||
      "";

    if (/android/i.test(ua)) return "android";
    if (
      /iphone|ipad|ipod/i.test(ua) ||
      (platform === "MacIntel" && navigator.maxTouchPoints > 1)
    ) {
      return "ios";
    }
    if (/win/i.test(platform) || /windows/i.test(ua)) return "windows";
    if (/mac/i.test(platform) || /macintosh|mac os x/i.test(ua)) return "macos";
    return null;
  }

  function applyDownloadMeta(v, assets = {}) {
    if (!v) return;
    const tag = v.startsWith("v") ? v : "v" + v;
    const num = tag.replace(/^v/, "");

    const defaultLabels = {
      android: `Mori v${num}.apk`,
      cli: "npx @coflyn/mori",
      ios: `Mori v${num}.ipa (AltStore / TrollStore)`,
    };

    document.querySelectorAll("[data-dl-file]").forEach((el) => {
      const platform = el.getAttribute("data-dl-file");
      if (defaultLabels[platform]) {
        el.textContent = defaultLabels[platform];
      }
    });

    document.querySelectorAll("[data-dl-card]").forEach((card) => {
      const platform = card.getAttribute("data-dl-card");
      if (platform === "cli") {
        card.href = "https://www.npmjs.com/package/@coflyn/mori";
      } else if (assets && assets[platform]) {
        card.href = assets[platform];
      } else {
        card.href = `https://github.com/coflyn/Mori/releases/tag/${tag}`;
      }
    });

    // Smart OS Auto-detection for Hero CTA and Floating button
    const os = detectUserOS();
    const heroBtn = document.getElementById("hero-download-btn");
    const floatingBtn = document.getElementById("floating-dl-btn");
    const floatingText = document.getElementById("floating-dl-text");

    const osMeta = {
      android: {
        heroText: "Download for Android (.apk)",
        floatingText: "Download APK",
      },
      macos: {
        heroText: "Install CLI: npx @coflyn/mori",
        floatingText: "Run Mori CLI",
      },
      windows: {
        heroText: "Install CLI: npx @coflyn/mori",
        floatingText: "Run Mori CLI",
      },
      ios: {
        heroText: "Download for iOS (.ipa)",
        floatingText: "Download .IPA",
      },
    };

    if (os && osMeta[os]) {
      const targetUrl =
        os === "macos" || os === "windows"
          ? "https://www.npmjs.com/package/@coflyn/mori"
          : assets && assets[os]
            ? assets[os]
            : `https://github.com/coflyn/Mori/releases/tag/${tag}`;

      if (heroBtn) {
        heroBtn.textContent = osMeta[os].heroText;
        heroBtn.href = targetUrl;
      }
      if (floatingBtn) {
        floatingBtn.href = targetUrl;
      }
      if (floatingText) {
        floatingText.textContent = osMeta[os].floatingText;
      }
    } else {
      if (heroBtn) {
        heroBtn.textContent = "Download free";
        heroBtn.href = "#download";
      }
      if (floatingBtn) {
        floatingBtn.href = "#download";
      }
      if (floatingText) {
        floatingText.textContent = "Download Mori";
      }
    }

    const schemaScript = document.querySelector(
      'script[type="application/ld+json"]',
    );
    if (schemaScript) {
      try {
        const schema = JSON.parse(schemaScript.textContent);
        const appNode = schema["@graph"]?.find(
          (n) => n["@type"] === "SoftwareApplication",
        );
        if (appNode) {
          appNode.softwareVersion = num;
          schemaScript.textContent = JSON.stringify(schema, null, 2);
        }
      } catch (_) {}
    }
  }

  function syncDownloadRelease(latestVersion) {
    if (latestVersion) {
      applyDownloadMeta(latestVersion);
    }

    try {
      const cached = sessionStorage.getItem(GITHUB_RELEASE_KEY);
      const cachedTime = sessionStorage.getItem(GITHUB_RELEASE_TIME);
      if (cached && cachedTime && Date.now() - Number(cachedTime) < ONE_HOUR) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.version) {
          applyDownloadMeta(parsed.version, parsed.assets);
          return;
        }
      }
    } catch (_) {}

    fetch("https://api.github.com/repos/coflyn/Mori/releases/latest")
      .then((res) => {
        if (!res.ok) throw new Error("Status " + res.status);
        return res.json();
      })
      .then((data) => {
        const version = data.tag_name || latestVersion;
        const assets = {};

        if (Array.isArray(data.assets)) {
          data.assets.forEach((a) => {
            const n = a.name || "";
            const url = a.browser_download_url;
            if (n.endsWith(".apk")) {
              assets.android = url;
            } else if (n.endsWith(".dmg")) {
              assets.macos = url;
            } else if (
              n.endsWith("Setup.exe") ||
              (n.endsWith(".exe") && !assets.windows)
            ) {
              assets.windows = url;
            } else if (n.endsWith(".ipa")) {
              assets.ios = url;
            }
          });
        }

        try {
          sessionStorage.setItem(
            GITHUB_RELEASE_KEY,
            JSON.stringify({ version, assets }),
          );
          sessionStorage.setItem(GITHUB_RELEASE_TIME, String(Date.now()));
        } catch (_) {}

        applyDownloadMeta(version, assets);
      })
      .catch(() => {
        if (latestVersion) {
          applyDownloadMeta(latestVersion);
        }
      });
  }

  // Initial check for cached download meta
  syncDownloadRelease();

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
    if (cached && cachedTime && Date.now() - Number(cachedTime) < ONE_HOUR) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length) {
        render(parsed);
        syncDownloadRelease(parsed[0].version);
        return;
      }
    }
  } catch (_) {}

  fetch("https://raw.githubusercontent.com/coflyn/Mori/main/CHANGELOG.md")
    .then((res) => {
      if (!res.ok) throw new Error("Status " + res.status);
      return res.text();
    })
    .then((text) => {
      const releases = parseChangelog(text, 2);
      if (releases && releases.length) {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(releases));
          sessionStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
        } catch (_) {}
        render(releases);
        syncDownloadRelease(releases[0].version);
      }
    })
    .catch(() => {
      container.innerHTML = `
        <div class="changelog-loading">
          <span>Unable to load updates live. <a href="https://github.com/coflyn/Mori/blob/main/CHANGELOG.md" target="_blank" rel="noopener">View full changelog on GitHub</a></span>
        </div>`;
      syncDownloadRelease();
    });

  // Floating Mobile Download Button visibility toggle on scroll
  (function () {
    const floatingDl = document.getElementById("floating-dl");
    const hero = document.querySelector(".hero");
    if (!floatingDl) return;

    let ticking = false;
    function updateFloatingVisibility() {
      const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : 450;
      if (window.scrollY > heroBottom - 80) {
        floatingDl.classList.add("is-visible");
        floatingDl.setAttribute("aria-hidden", "false");
      } else {
        floatingDl.classList.remove("is-visible");
        floatingDl.setAttribute("aria-hidden", "true");
      }
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          requestAnimationFrame(updateFloatingVisibility);
          ticking = true;
        }
      },
      { passive: true },
    );

    updateFloatingVisibility();
  })();
})();
