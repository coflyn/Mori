// sniffer.js — Web Media Sniffer: extract videos, audios, and images from any webpage
import { scraperFetch } from "../../scrapers/httpHelper.js";
import { getUserAgent } from "../../utils/index.js";

const VIDEO_EXT = /\.(mp4|webm|mov|mkv|m4v)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|m4a|wav|aac|flac|ogg|opus)(\?|#|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?|#|$)/i;

function toAbsolute(relUrl, baseUrl) {
  if (!relUrl || typeof relUrl !== "string") return null;
  const trimmed = relUrl.trim();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("mailto:")) {
    return null;
  }
  try {
    return new URL(trimmed, baseUrl).href;
  } catch (_) {
    return null;
  }
}

export async function sniffWebMedia(targetUrl) {
  if (!targetUrl || typeof targetUrl !== "string") {
    throw new Error("Invalid URL");
  }

  let cleanUrl = targetUrl.trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = "https://" + cleanUrl;
  }

  const res = await scraperFetch(
    {
      url: cleanUrl,
      method: "GET",
      headers: {
        "User-Agent": getUserAgent(),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      rawResponse: true,
      parseJson: false,
    },
    "WebSniffer",
  );

  const html = typeof res.data === "string" ? res.data : "";
  if (!html) {
    throw new Error("No HTML content returned from the webpage");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const baseUrl = res.url || cleanUrl;

  const pageTitle =
    doc.querySelector("title")?.textContent?.trim() ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() ||
    new URL(baseUrl).hostname;

  const seenUrls = new Set();
  const videos = [];
  const audios = [];
  const images = [];

  function addMedia(list, item) {
    if (!item?.url) return;
    const abs = toAbsolute(item.url, baseUrl);
    if (!abs || seenUrls.has(abs)) return;
    seenUrls.add(abs);
    list.push({ ...item, url: abs });
  }

  // 1. <video> tags
  doc.querySelectorAll("video").forEach((v, idx) => {
    const poster = toAbsolute(v.getAttribute("poster"), baseUrl);
    const vSrc = v.getAttribute("src");
    if (vSrc) {
      addMedia(videos, {
        url: vSrc,
        type: "VIDEO",
        title: `${pageTitle} (Video ${videos.length + 1})`,
        poster,
      });
    }
    v.querySelectorAll("source").forEach((s) => {
      const sSrc = s.getAttribute("src");
      if (sSrc) {
        addMedia(videos, {
          url: sSrc,
          type: "VIDEO",
          title: `${pageTitle} (Video ${videos.length + 1})`,
          poster,
        });
      }
    });
  });

  // 2. <audio> tags
  doc.querySelectorAll("audio").forEach((a, idx) => {
    const aSrc = a.getAttribute("src");
    if (aSrc) {
      addMedia(audios, {
        url: aSrc,
        type: "AUDIO",
        title: `${pageTitle} (Audio ${audios.length + 1})`,
      });
    }
    a.querySelectorAll("source").forEach((s) => {
      const sSrc = s.getAttribute("src");
      if (sSrc) {
        addMedia(audios, {
          url: sSrc,
          type: "AUDIO",
          title: `${pageTitle} (Audio ${audios.length + 1})`,
        });
      }
    });
  });

  // 3. OpenGraph / Twitter meta tags
  const ogVideo =
    doc.querySelector('meta[property="og:video"]')?.getAttribute("content") ||
    doc.querySelector('meta[property="og:video:url"]')?.getAttribute("content") ||
    doc.querySelector('meta[property="og:video:secure_url"]')?.getAttribute("content") ||
    doc.querySelector('meta[name="twitter:player:stream"]')?.getAttribute("content");
  if (ogVideo) {
    addMedia(videos, {
      url: ogVideo,
      type: "VIDEO",
      title: `${pageTitle} (OG Video)`,
    });
  }

  const ogAudio =
    doc.querySelector('meta[property="og:audio"]')?.getAttribute("content") ||
    doc.querySelector('meta[property="og:audio:url"]')?.getAttribute("content");
  if (ogAudio) {
    addMedia(audios, {
      url: ogAudio,
      type: "AUDIO",
      title: `${pageTitle} (OG Audio)`,
    });
  }

  const ogImage =
    doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
    doc.querySelector('meta[property="og:image:url"]')?.getAttribute("content") ||
    doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content");
  if (ogImage) {
    addMedia(images, {
      url: ogImage,
      type: "IMAGE",
      title: `${pageTitle} (Preview Image)`,
    });
  }

  // 4. Anchor links pointing to media files
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    const text = a.textContent?.trim() || "Media File";
    if (VIDEO_EXT.test(href)) {
      addMedia(videos, {
        url: href,
        type: "VIDEO",
        title: `${pageTitle} - ${text}`,
      });
    } else if (AUDIO_EXT.test(href)) {
      addMedia(audios, {
        url: href,
        type: "AUDIO",
        title: `${pageTitle} - ${text}`,
      });
    } else if (IMAGE_EXT.test(href)) {
      addMedia(images, {
        url: href,
        type: "IMAGE",
        title: `${pageTitle} - ${text}`,
      });
    }
  });

  // 5. Significant <img> elements (filter out small avatars/trackers)
  doc.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) return;
    const alt = img.getAttribute("alt")?.trim() || "";
    const w = parseInt(img.getAttribute("width") || "0", 10);
    const h = parseInt(img.getAttribute("height") || "0", 10);
    // Ignore icons, logos, and tiny thumbnails
    if ((w > 0 && w < 100) || (h > 0 && h < 100)) return;
    if (/logo|icon|avatar|favicon|badge/i.test(src) || /logo|icon|avatar/i.test(alt)) return;

    addMedia(images, {
      url: src,
      type: "IMAGE",
      title: alt ? `${pageTitle} - ${alt}` : `${pageTitle} (Image ${images.length + 1})`,
    });
  });

  const total = videos.length + audios.length + images.length;
  return {
    status: true,
    pageTitle,
    pageUrl: baseUrl,
    videos,
    audios,
    images,
    total,
  };
}
