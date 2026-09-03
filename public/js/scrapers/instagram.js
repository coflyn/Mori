import {
  CHROME_UA,
  SAFARI_MOBILE_UA,
  getCookiesFromHeaders,
  serializeData,
} from "../utils/index.js";
import { getCleanUrl } from "../utils/urlUtils.js";
import { scraperFetch, createScraperResult } from "./httpHelper.js";

export let _igSource = null;
export function setInstagramSource(src) {
  _igSource = src;
}

function extractInstagramTitle(doc, cleanUrl) {
  let title = "";

  if (doc) {
    // 1. Text/caption element in scraper response
    const titleEl = doc.querySelector(
      ".download-items__title, .card-title, .caption, .desc, .post-title, h3, h4, h5, p.card-text, .text-center > p",
    );
    if (titleEl) {
      const txt = titleEl.textContent?.trim().replace(/\s+/g, " ");
      if (
        txt &&
        txt.length > 3 &&
        !txt.toLowerCase().includes("download") &&
        !txt.toLowerCase().includes("snapsave") &&
        !txt.toLowerCase().includes("indown") &&
        !txt.toLowerCase().includes("private")
      ) {
        title = txt;
      }
    }

    // 2. Alt text on thumbnail (scrapers often store post caption in alt)
    if (!title) {
      const imgs = doc.querySelectorAll(
        ".download-items__thumb img, .card img, img",
      );
      for (const img of imgs) {
        const alt = img.getAttribute("alt")?.trim().replace(/\s+/g, " ");
        if (
          alt &&
          alt.length > 3 &&
          alt.toLowerCase() !== "thumbnail" &&
          alt.toLowerCase() !== "instagram" &&
          alt.toLowerCase() !== "image" &&
          alt.toLowerCase() !== "video" &&
          !alt.toLowerCase().includes("download")
        ) {
          title = alt;
          break;
        }
      }
    }
  }

  // 3. Meaningful title derived from Instagram URL (shortcode and username)
  if (!title) {
    const userMatch = cleanUrl.match(
      /instagram\.com\/([A-Za-z0-9_.-]+)\/(?:p|reel|reels|tv)\//i,
    );
    const shortcodeMatch = cleanUrl.match(
      /(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
    );
    const isReel = cleanUrl.includes("/reel");
    const isTv = cleanUrl.includes("/tv/");
    const mediaType = isReel ? "Reel" : isTv ? "Video" : "Post";
    const shortcode = shortcodeMatch ? shortcodeMatch[1] : "";
    const rawUser = userMatch ? userMatch[1].toLowerCase() : "";
    const username =
      userMatch &&
      !["p", "reel", "reels", "tv", "stories", "share"].includes(rawUser)
        ? `@${userMatch[1]}`
        : "";

    if (username && shortcode) {
      title = `${username} - Instagram ${mediaType} (${shortcode})`;
    } else if (username) {
      title = `${username} - Instagram ${mediaType}`;
    } else if (shortcode) {
      title = `Instagram ${mediaType} (${shortcode})`;
    } else {
      title = `Instagram ${mediaType}`;
    }
  }

  if (title.length > 90) {
    title = title.substring(0, 87) + "...";
  }
  return title;
}

async function scrapeInstagramEmbedDirect(cleanUrl) {
  try {
    const shortcodeMatch = cleanUrl.match(
      /(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/,
    );
    if (!shortcodeMatch) return null;
    const shortcode = shortcodeMatch[1];
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;

    const res = await scraperFetch(
      {
        url: embedUrl,
        headers: {
          "User-Agent": SAFARI_MOBILE_UA,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        rawResponse: true,
      },
      "Instagram Direct Embed",
    );

    if (!res || !res.data) return null;
    const htmlText = typeof res.data === "string" ? res.data : String(res.data);
    const unescaped = htmlText.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    const idx = unescaped.indexOf('"shortcode_media":');
    if (idx === -1) return null;
    const start = idx + '"shortcode_media":'.length;
    let depth = 0;
    let end = -1;

    for (let i = start; i < unescaped.length; i++) {
      const char = unescaped[i];
      if (char === "{") depth++;
      else if (char === "}") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }

    if (end === -1) return null;
    const rawJson = unescaped.slice(start, end);
    const media = JSON.parse(rawJson);

    const caption =
      media.edge_media_to_caption?.edges[0]?.node?.text || "Instagram Media";
    const downloads = [];

    if (media.edge_sidecar_to_children?.edges) {
      media.edge_sidecar_to_children.edges.forEach((edge, i) => {
        const n = edge.node;
        const mediaUrl = n.video_url || n.display_url;
        if (mediaUrl) {
          downloads.push({
            url: mediaUrl,
            type: n.is_video ? "VIDEO" : "IMAGE",
            quality: n.is_video ? `HD Video ${i + 1}` : `HD Photo ${i + 1}`,
            thumbnail: n.display_url || mediaUrl,
          });
        }
      });
    } else {
      const mediaUrl = media.video_url || media.display_url;
      if (mediaUrl) {
        downloads.push({
          url: mediaUrl,
          type: media.is_video ? "VIDEO" : "IMAGE",
          quality: media.is_video ? "HD Video" : "HD Photo",
          thumbnail: media.display_url || mediaUrl,
        });
      }
    }

    if (!downloads.length) return null;
    return createScraperResult(true, {
      title: caption.slice(0, 80),
      thumbnail: downloads[0].thumbnail || downloads[0].url,
      downloads,
      sourceUrl: cleanUrl,
    });
  } catch (err) {
    console.warn("[IG Embed Direct] Failed:", err);
    return null;
  }
}

async function scrapeSnapSave(cleanUrl) {
  try {
    const desktopUA = CHROME_UA;
    const res = await scraperFetch(
      {
        url: "https://snapsave.app/action.php",
        method: "POST",
        data: serializeData({ url: cleanUrl }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": desktopUA,
          "X-Requested-With": "XMLHttpRequest",
          Origin: "https://snapsave.app",
          Referer: "https://snapsave.app/",
        },
        rawResponse: true,
      },
      "SnapSave",
    );

    if (!res || !res.data) {
      console.warn("[SnapSave] res or res.data is empty:", res);
      return null;
    }

    let htmlContent = "";
    const rawData = res.data;

    const extractFromScriptStr = (str) => {
      if (typeof str !== "string") return "";
      let matched = "";
      const idxDouble = str.indexOf('innerHTML = "');
      if (idxDouble !== -1) {
        const start = idxDouble + 'innerHTML = "'.length;
        const lastQuote = str.lastIndexOf('"');
        if (lastQuote > start) {
          const rawString = str.slice(start, lastQuote);
          try {
            matched = (0, eval)('"' + rawString + '"');
          } catch (_) {
            matched = rawString;
          }
        }
      }
      if (!matched) {
        const idxSingle = str.indexOf("innerHTML = '");
        if (idxSingle !== -1) {
          const start = idxSingle + "innerHTML = '".length;
          const lastQuote = str.lastIndexOf("'");
          if (lastQuote > start) {
            const rawString = str.slice(start, lastQuote);
            try {
              matched = (0, eval)("'" + rawString + "'");
            } catch (_) {
              matched = rawString;
            }
          }
        }
      }
      if (!matched) {
        const boxIdx = str.indexOf("<ul class=");
        if (boxIdx !== -1) {
          const endBox = str.lastIndexOf("</ul>");
          if (endBox > boxIdx) {
            matched = str.slice(boxIdx, endBox + 5);
          }
        }
      }
      return matched;
    };

    if (typeof rawData === "string" && rawData.trim().startsWith("<")) {
      htmlContent = rawData;
    } else if (typeof rawData === "string") {
      try {
        const codeToRun = rawData.replace(
          /\beval\s*\(\s*function/g,
          "(function",
        );
        const unpackedScript = (0, eval)(codeToRun);
        htmlContent =
          extractFromScriptStr(unpackedScript) || extractFromScriptStr(rawData);
      } catch (evalErr) {
        console.warn("[SnapSave] Unpack JS failed:", evalErr);
        htmlContent = extractFromScriptStr(rawData);
      }
    }

    if (htmlContent) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");
      const downloadsMap = new Map();

      const getIsImageFromUrlOrText = (urlStr, textStr) => {
        const combined = (urlStr + " " + textStr).toUpperCase();
        if (
          combined.includes("PHOTO") ||
          combined.includes("GAMBAR") ||
          combined.includes("IMAGE") ||
          combined.includes("ICON-DLIMAGE")
        ) {
          return true;
        }
        if (combined.includes("VIDEO") || combined.includes("ICON-DLVIDEO")) {
          return false;
        }

        try {
          const match = urlStr.match(
            /token=([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/,
          );
          if (match) {
            const payloadB64 = match[1].split(".")[1];
            const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
            let decoded = "";
            if (typeof atob === "function") {
              decoded = atob(base64);
            } else if (typeof Buffer !== "undefined") {
              decoded = Buffer.from(base64, "base64").toString("utf-8");
            }
            if (/\.(jpe?g|png|webp)(\?|"|$)/i.test(decoded)) return true;
            if (/\.(mp4|mkv|mov|webm)(\?|"|$)/i.test(decoded)) return false;
          }
        } catch (_) {}

        return /\.(jpe?g|png|webp)(\?|$)/i.test(urlStr);
      };

      const addLink = (href, titleAttr, textContent, thumb) => {
        if (
          !href ||
          !href.startsWith("http") ||
          href.includes("snapsave.app") ||
          href.includes("play.google.com") ||
          href.includes("facebook.com")
        )
          return;
        const key = href;
        if (downloadsMap.has(key)) return;

        const isImage = getIsImageFromUrlOrText(
          href,
          (titleAttr || "") + " " + (textContent || ""),
        );

        let itemThumb = thumb;
        if (!itemThumb && href.includes("rapidcdn.app")) {
          itemThumb = href
            .replace("/v2?", "/thumb?")
            .replace("/download?", "/thumb?");
        }

        downloadsMap.set(key, {
          url: href,
          type: isImage ? "IMAGE" : "VIDEO",
          quality: isImage ? "HD Photo" : "HD Video",
          thumbnail: itemThumb,
        });
      };

      const items = doc.querySelectorAll(
        ".download-box > li, .download-items, li",
      );
      const targets = items.length > 0 ? items : [doc];

      targets.forEach((item) => {
        const thumbImg = item.querySelector(".download-items__thumb img, img");
        const thumb = thumbImg ? thumbImg.getAttribute("src") : null;

        const btnLinks = item.querySelectorAll(
          "a.abutton, .download-items__btn a, a[href*='rapidcdn'], a[href*='snapcdn'], a[href*='cdninstagram'], a[href*='fbcdn'], a[href]",
        );

        btnLinks.forEach((a) => {
          const href = a.getAttribute("href");
          const title = a.getAttribute("title") || "";
          const text = a.textContent || "";
          addLink(href, title, text, thumb);
        });

        const options = item.querySelectorAll("select option");
        options.forEach((opt) => {
          const val = opt.getAttribute("value");
          if (!val || !val.startsWith("http") || val.includes("snapsave.app"))
            return;
          const key = val;
          if (downloadsMap.has(key)) return;

          const qualityLabel = (opt.textContent || "").trim() || "HD";
          const isImage = getIsImageFromUrlOrText(val, qualityLabel);
          downloadsMap.set(key, {
            url: val,
            type: isImage ? "IMAGE" : "VIDEO",
            quality: qualityLabel,
            thumbnail: thumb,
          });
        });
      });

      if (downloadsMap.size === 0) {
        const rawMatches = [
          ...htmlContent.matchAll(/href=\\?["'](http[^"'\\]+)\\?["']/gi),
        ].map((m) => m[1]);
        rawMatches.forEach((href) => {
          addLink(href, "Download", "Download", null);
        });
      }

      const downloads = [...downloadsMap.values()];

      if (downloads.length > 0) {
        const thumbnail = downloads[0].thumbnail || downloads[0].url;
        const title = extractInstagramTitle(doc, cleanUrl);
        return createScraperResult(true, {
          title,
          thumbnail,
          downloads,
          sourceUrl: cleanUrl,
        });
      }
    }
  } catch (err) {
    console.warn("[SnapSave] Failed:", err);
  }
  return null;
}

export async function scrapeInstagram(url) {
  let currentStatus = null;
  try {
    const cleanUrl = getCleanUrl(url).split("?")[0];
    if (!_igSource) return { requireSource: true };

    if (
      _igSource === "savevid" ||
      _igSource === "downreels" ||
      _igSource === "snapsave"
    ) {
      const snapResult = await scrapeSnapSave(cleanUrl);
      if (snapResult) {
        _igSource = null;
        return snapResult;
      }
      throw new Error("Failed to fetch media from Server 2.");
    }

    if (_igSource === "indown") {
      try {
        const desktopUA = CHROME_UA;
        const res = await scraperFetch(
          {
            url: "https://indown.net/api/ajaxSearch",
            method: "POST",
            data: serializeData({
              q: cleanUrl,
              vt: "reel",
              t: "media",
              lang: "en",
              v: "v2",
            }),
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
              "User-Agent": desktopUA,
              "X-Requested-With": "XMLHttpRequest",
              Origin: "https://indown.net",
              Referer: "https://indown.net/",
            },
            rawResponse: true,
          },
          "Indown Net",
        );

        if (res && res.data) {
          const rawData =
            typeof res.data === "string" ? JSON.parse(res.data) : res.data;
          const htmlContent = rawData.data || "";

          if (htmlContent) {
            const parser = new DOMParser();
            const doc2 = parser.parseFromString(htmlContent, "text/html");
            const downloads = [];
            const seenUrls = new Set();

            const checkIsVideo = (href, text, title) => {
              const upper = (text + " " + title).toUpperCase();
              if (upper.includes("VIDEO") || upper.includes("MP4") || upper.includes("REEL")) {
                return true;
              }
              if (
                upper.includes("PHOTO") ||
                upper.includes("IMAGE") ||
                upper.includes("GAMBAR") ||
                upper.includes("FOTO")
              ) {
                return false;
              }

              try {
                const match = href.match(
                  /token=([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/,
                );
                if (match) {
                  const payloadB64 = match[1].split(".")[1];
                  const base64 = payloadB64
                    .replace(/-/g, "+")
                    .replace(/_/g, "/");
                  let decoded = "";
                  if (typeof atob === "function") {
                    decoded = atob(base64);
                  } else if (typeof Buffer !== "undefined") {
                    decoded = Buffer.from(base64, "base64").toString("utf-8");
                  }
                  if (/\.(mp4|mov|webm|mkv)(\?|"|$)/i.test(decoded)) return true;
                  if (/\.(jpe?g|png|webp)(\?|"|$)/i.test(decoded)) return false;
                }
              } catch (_) {}

              if (/\.(mp4|mov|webm)(\?|$)/i.test(href)) return true;
              if (/\.(jpe?g|png|webp)(\?|$)/i.test(href)) return false;

              return false;
            };

            let cards = Array.from(
              doc2.querySelectorAll(
                ".download-items, .col-md-4, .col-sm-6, .card, .thumbnail",
              ),
            );

            // Filter to leaf cards
            cards = cards.filter(
              (c) => !cards.some((other) => other !== c && other.contains(c)),
            );

            if (cards.length === 0) {
              cards = [doc2];
            }

            cards.forEach((card, idx) => {
              const thumbImg = card.querySelector("img");
              const thumbSrc = thumbImg?.getAttribute("src") || "";

              const allA = Array.from(
                card.querySelectorAll(
                  "a[href*='download'], a.abutton, a.btn, a[href*='snapcdn'], a[href*='rapidcdn'], a[href*='cdninstagram'], a[href*='fbcdn'], a[href^='http']",
                ),
              ).filter((a) => {
                let href = a.getAttribute("href") || "";
                if (!href.startsWith("http")) return false;
                if (
                  href.includes("indown.net/api") ||
                  href.includes("facebook.com") ||
                  href.includes("ads") ||
                  href === "https://indown.net/" ||
                  href === "https://indown.net"
                ) {
                  return false;
                }
                return true;
              });

              if (allA.length === 0) return;

              // Prioritize video link if present in this card
              const videoA = allA.find((a) => {
                const href = a.getAttribute("href") || "";
                const text = a.textContent || "";
                const title = a.getAttribute("title") || "";
                return checkIsVideo(href, text, title);
              });

              const chosenA = videoA || allA[0];
              let href = chosenA.getAttribute("href").replace(/&amp;/g, "&");
              if (seenUrls.has(href)) return;
              seenUrls.add(href);

              const text = chosenA.textContent || "";
              const title = chosenA.getAttribute("title") || "";
              const isVideo = checkIsVideo(href, text, title);
              const type = isVideo ? "VIDEO" : "IMAGE";
              const quality = isVideo
                ? `HD Video ${idx + 1}`
                : `HD Photo ${idx + 1}`;
              const thumbnail =
                thumbSrc && thumbSrc.startsWith("http")
                  ? thumbSrc
                  : type === "IMAGE"
                    ? href
                    : null;

              downloads.push({
                type,
                quality:
                  downloads.length > 0
                    ? quality
                    : isVideo
                      ? "HD Video"
                      : "HD Photo",
                url: href,
                thumbnail: thumbnail || href,
              });
            });

            if (downloads.length === 0) {
              const allLinks = Array.from(
                doc2.querySelectorAll(
                  "a.abutton, a.btn, a[href*='snapcdn'], a[href*='rapidcdn'], a[href*='cdninstagram'], a[href*='fbcdn'], a[href*='download']",
                ),
              );

              allLinks.forEach((a, idx) => {
                let href = a.getAttribute("href");
                if (!href || !href.startsWith("http")) return;
                href = href.replace(/&amp;/g, "&");
                if (
                  href.includes("indown.net/api") ||
                  href.includes("facebook.com") ||
                  href.includes("ads") ||
                  href === "https://indown.net/"
                )
                  return;
                if (seenUrls.has(href)) return;
                seenUrls.add(href);

                const text = a.textContent || "";
                const title = a.getAttribute("title") || "";
                const isVideo = checkIsVideo(href, text, title);
                const type = isVideo ? "VIDEO" : "IMAGE";
                downloads.push({
                  type,
                  quality:
                    type === "IMAGE"
                      ? `HD Photo ${idx + 1}`
                      : `HD Video ${idx + 1}`,
                  url: href,
                  thumbnail: href,
                });
              });
            }

            if (downloads.length > 0) {
              const firstThumb = downloads[0].thumbnail || downloads[0].url;
              const title = extractInstagramTitle(doc2, cleanUrl);

              _igSource = null;
              return createScraperResult(true, {
                title,
                thumbnail: firstThumb,
                downloads,
                sourceUrl: cleanUrl,
              });
            }
          }
        }
      } catch (err) {
        console.warn("[Indown.Net] Request failed:", err);
      }

      throw new Error(
        "Media links not found. Post might be private or invalid.",
      );
    }

    throw new Error("Invalid source selected.");
  } catch (err) {
    _igSource = null;
    return createScraperResult(false, err.message, currentStatus);
  }
}
