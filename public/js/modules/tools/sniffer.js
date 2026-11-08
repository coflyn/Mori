// sniffer.js — Web Media Sniffer: Deep media extraction engine
import { scraperFetch } from "../../scrapers/httpHelper.js";
import { getUserAgent } from "../../utils/index.js";

// Media format regex patterns
const VIDEO_EXT = /\.(mp4|webm|mov|mkv|m4v|3gp|avi|flv)(\?|#|$)/i;
const STREAM_EXT = /\.(m3u8|mpd)(\?|#|$)/i;
const SEGMENT_EXT = /\.ts(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|m4a|wav|aac|flac|ogg|opus|weba)(\?|#|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|svg|avif|bmp)(\?|#|$)/i;

// Regex to capture full media URLs embedded inside raw scripts or JSON
const SCRIPT_MEDIA_REGEX =
  /https?:\\?\/\\?\/[^"'<>\s\\]+\.(?:mp4|webm|mov|mkv|m4v|3gp|avi|flv|m3u8|mpd|ts|mp3|m4a|wav|aac|flac|ogg|opus|weba)(?:\?[^"'<>\s\\]*)?/gi;

// Stream & CDN signature regex (TikTok, Akamai, ByteOversea)
const TIKTOK_STREAM_REGEX =
  /https?:\\?\/\\?\/[^"'<>\s\\]*(?:tiktokcdn\.com|byteoversea\.com|akamaized\.net\/video\/|\/video\/tos\/)[^"'<>\s\\]*/gi;

// Patterns to detect video player iframes
const VIDEO_IFRAME_REGEX =
  /(?:youtube(?:-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/|dailymotion\.com\/embed\/|bilibili\.com\/player|facebook\.com\/plugins\/video)/i;

/**
 * Normalizes and unescapes URLs found in JSON/HTML scripts
 * Handles escaped characters: \u0026 -> &, \/ -> /, &amp; -> &, &quot; -> "
 */
export function cleanUnescapeUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .replace(/\\/g, "");
}

/**
 * Resolves a relative URL to an absolute URL against baseUrl
 */
function toAbsolute(relUrl, baseUrl) {
  if (!relUrl || typeof relUrl !== "string") return null;
  const cleaned = cleanUnescapeUrl(relUrl);
  if (
    !cleaned ||
    cleaned.startsWith("javascript:") ||
    cleaned.startsWith("data:") ||
    cleaned.startsWith("mailto:")
  ) {
    return null;
  }
  try {
    return new URL(cleaned, baseUrl).href;
  } catch (_) {
    return null;
  }
}

/**
 * Extracts highest resolution candidate from a srcset string
 */
function getBestSrcFromSrcset(srcset, baseUrl) {
  if (!srcset || typeof srcset !== "string") return null;
  const parts = srcset.split(",");
  let maxW = 0;
  let bestUrl = null;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const tokens = trimmed.split(/\s+/);
    const url = tokens[0];
    const widthDesc = tokens[1];
    let w = 0;
    if (widthDesc && widthDesc.endsWith("w")) {
      w = parseInt(widthDesc.slice(0, -1), 10) || 0;
    }
    if (w >= maxW) {
      maxW = w;
      bestUrl = url;
    }
  }
  return bestUrl ? toAbsolute(bestUrl, baseUrl) : null;
}

/**
 * Main Web Media Sniffer Engine (Hybrid Model)
 * @param {string} targetUrl - Target webpage URL
 * @returns {Promise<object>} Extracted media categorized by video, audio, image
 */
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

  const baseUrl = res.url || cleanUrl;
  let pageTitle = "";

  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    pageTitle =
      doc.querySelector("title")?.textContent?.trim() ||
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() ||
      "";
  }
  if (!pageTitle) {
    try {
      pageTitle = new URL(baseUrl).hostname;
    } catch (_) {
      pageTitle = "Media";
    }
  }

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

  // -------------------------------------------------------------
  // TIER 1: DOM Document Parsing (if DOMParser available)
  // -------------------------------------------------------------
  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // 1. <video> elements
    doc.querySelectorAll("video").forEach((v) => {
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

    // 2. <audio> elements
    doc.querySelectorAll("audio").forEach((a) => {
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

    // 3. Iframe embed detection
    doc.querySelectorAll("iframe[src]").forEach((ifr) => {
      const ifrSrc = ifr.getAttribute("src");
      if (ifrSrc && VIDEO_IFRAME_REGEX.test(ifrSrc)) {
        addMedia(videos, {
          url: ifrSrc,
          type: "VIDEO",
          title: `${pageTitle} (Embed Player)`,
          isEmbed: true,
        });
      }
    });

    // 4. OpenGraph & Twitter metadata
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
        title: `${pageTitle} (OG Image)`,
      });
    }

    // 5. <a> anchor links to media
    doc.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      const text = a.textContent?.trim() || "Media File";
      if (VIDEO_EXT.test(href) || STREAM_EXT.test(href)) {
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

    // 6. Image Sniffing & Filtering (filters tracking pixels / icons)
    doc.querySelectorAll("img").forEach((img) => {
      const srcset = img.getAttribute("srcset");
      const src =
        getBestSrcFromSrcset(srcset, baseUrl) ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-lazy-src") ||
        img.getAttribute("src");

      if (!src || src.startsWith("data:")) return;

      const alt = img.getAttribute("alt")?.trim() || "";
      const w = parseInt(img.getAttribute("width") || "0", 10);
      const h = parseInt(img.getAttribute("height") || "0", 10);

      // Discard tiny icons, avatar badges, tracking pixels
      if ((w > 0 && w < 80) || (h > 0 && h < 80)) return;
      if (/favicon|tracker|pixel|spacer|badge|1x1/i.test(src)) return;

      addMedia(images, {
        url: src,
        type: "IMAGE",
        title: alt ? `${pageTitle} - ${alt}` : `${pageTitle} (Image ${images.length + 1})`,
      });
    });
  }

  // -------------------------------------------------------------
  // TIER 2: Script & Embedded JSON Regex Sniffer
  // Extracts media from Schema.org, Instagram video_versions,
  // Vimeo progressive configs, and JSON player scripts.
  // -------------------------------------------------------------

  // A. contentUrl (Schema.org / JSON-LD)
  const contentUrlMatches = html.matchAll(/"contentUrl"\s*:\s*"([^"]+)"/gi);
  for (const m of contentUrlMatches) {
    const raw = cleanUnescapeUrl(m[1]);
    if (VIDEO_EXT.test(raw) || STREAM_EXT.test(raw)) {
      addMedia(videos, {
        url: raw,
        type: "VIDEO",
        title: `${pageTitle} (Schema Video)`,
      });
    } else if (AUDIO_EXT.test(raw)) {
      addMedia(audios, {
        url: raw,
        type: "AUDIO",
        title: `${pageTitle} (Schema Audio)`,
      });
    }
  }

  // B. video_versions (Instagram, Threads, Facebook JSON)
  const videoVersionsMatches = html.matchAll(
    /"video_versions"\s*:\s*\[\s*\{[^}]*?"url"\s*:\s*"([^"]+)"/gi,
  );
  for (const m of videoVersionsMatches) {
    const raw = cleanUnescapeUrl(m[1]);
    addMedia(videos, {
      url: raw,
      type: "VIDEO",
      title: `${pageTitle} (Social Video)`,
    });
  }

  // C. progressive (Vimeo, Dailymotion configs)
  const progressiveMatches = html.matchAll(
    /"progressive"\s*:\s*\[\s*\{[^}]*?"url"\s*:\s*"([^"]+)"/gi,
  );
  for (const m of progressiveMatches) {
    const raw = cleanUnescapeUrl(m[1]);
    addMedia(videos, {
      url: raw,
      type: "VIDEO",
      title: `${pageTitle} (Progressive Stream)`,
    });
  }

  // D. General Script Scanner for direct media URLs
  const genericMatches = html.matchAll(SCRIPT_MEDIA_REGEX);
  for (const m of genericMatches) {
    const raw = cleanUnescapeUrl(m[0]);
    if (VIDEO_EXT.test(raw) || STREAM_EXT.test(raw)) {
      addMedia(videos, {
        url: raw,
        type: "VIDEO",
        title: `${pageTitle} (Script Video)`,
      });
    } else if (AUDIO_EXT.test(raw)) {
      addMedia(audios, {
        url: raw,
        type: "AUDIO",
        title: `${pageTitle} (Script Audio)`,
      });
    }
  }

  // E. TikTok & ByteOversea CDN Stream Scanner
  const tiktokMatches = html.matchAll(TIKTOK_STREAM_REGEX);
  for (const m of tiktokMatches) {
    const raw = cleanUnescapeUrl(m[0]);
    if (!raw.endsWith(".js") && !raw.endsWith(".css") && !raw.endsWith(".json")) {
      const isImg =
        /(?:[/-]p\d+[-.]|\/tos-[a-z0-9]+-p-)/i.test(raw) ||
        raw.includes("p16-") ||
        raw.includes("p19-");
      if (isImg) {
        addMedia(images, {
          url: raw,
          type: "IMAGE",
          title: `${pageTitle} (TikTok Cover)`,
        });
      } else {
        addMedia(videos, {
          url: raw,
          type: "VIDEO",
          title: `${pageTitle} (TikTok Stream)`,
        });
      }
    }
  }

  // F. Embedded player media definitions extraction
  const streamMatches = html.matchAll(/"videoUrl"\s*:\s*"([^"]+)"/gi);
  const _NET_SIG = atob("cGhuY2Ru");
  for (const m of streamMatches) {
    const raw = cleanUnescapeUrl(m[1]);
    if (VIDEO_EXT.test(raw) || STREAM_EXT.test(raw) || raw.includes(_NET_SIG)) {
      addMedia(videos, {
        url: raw,
        type: "VIDEO",
        title: `${pageTitle} (Stream Video ${videos.length + 1})`,
      });
    }
  }

  const hasHls = videos.some((v) => STREAM_EXT.test(v.url));
  const finalVideos = hasHls
    ? videos
        .filter((v) => !SEGMENT_EXT.test(v.url))
        .sort((a, b) => {
          const aStream = STREAM_EXT.test(a.url) ? 1 : 0;
          const bStream = STREAM_EXT.test(b.url) ? 1 : 0;
          return bStream - aStream;
        })
    : videos;

  const total = finalVideos.length + audios.length + images.length;

  return {
    status: true,
    pageTitle,
    pageUrl: baseUrl,
    videos: finalVideos,
    audios,
    images,
    total,
  };
}
