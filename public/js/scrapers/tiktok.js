import { CHROME_UA } from "../utils/index.js";
import { getCleanUrl } from "../utils/urlUtils.js";
import { scraperFetch, createScraperResult } from "./httpHelper.js";

async function decryptSnapTikAes(id, encryptedBase64) {
  const salt = "sn4pt1k_v3r1fy2026";
  const str = salt + ":" + id;
  const encoder = new TextEncoder();
  const keyBytes = await window.crypto.subtle.digest(
    "SHA-256",
    encoder.encode(str),
  );

  const binaryString = atob(encryptedBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const iv = bytes.slice(0, 16);
  const data = bytes.slice(16);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["decrypt"],
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    cryptoKey,
    data,
  );

  return new TextDecoder().decode(decryptedBuffer);
}

function solveSnapTikChallenge(challenge) {
  switch (challenge.t) {
    case "b":
      return ((challenge.a ^ challenge.b) >> challenge.s) & 255;
    case "r":
      return challenge.n.reduce((m, f) => m + f, 0) * 2 + 1;
    case "c":
      return challenge.w.charCodeAt(challenge.i) * challenge.m;
    case "m":
      return ((challenge.a + challenge.b) % 100) * challenge.c;
    case "n":
      return (
        challenge.a * challenge.b +
        challenge.b * challenge.c +
        challenge.c * challenge.a -
        challenge.a
      );
    default:
      throw new Error("Unknown challenge type: " + challenge.t);
  }
}

export let _ttSource = null;
export function setTikTokSource(src) {
  _ttSource = src;
}

export async function scrapeTikTok(url) {
  let currentStatus = null;
  try {
    const cleanUrl = getCleanUrl(url).split("?")[0];
    const regexTiktokUrl =
      /https:\/\/(?:m|www|vm|vt|lite)?\.?tiktok\.com\/((?:.*\b(?:(?:usr|v|embed|user|video|photo)\/|\?shareId=|\&item_id=)(\d+))|\w+)/;
    if (!regexTiktokUrl.test(cleanUrl)) {
      throw new Error("Must be a valid tiktok url.");
    }

    if (!_ttSource) return { requireSource: true };

    if (_ttSource === "snaptik") {
      const tokenRes = await scraperFetch(
        {
          url: "https://snaptik.app/api/token",
          method: "POST",
          headers: {
            "User-Agent": CHROME_UA,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json",
            Origin: "https://snaptik.app",
            Referer: "https://snaptik.app/",
          },
          data: {},
          rawResponse: true,
        },
        "SnapTik Token",
      );
      currentStatus = tokenRes.status;
      const tData =
        typeof tokenRes.data === "string"
          ? JSON.parse(tokenRes.data)
          : tokenRes.data;
      if (!tData || !tData.id || !tData.p)
        throw new Error("Failed to retrieve token from SnapTik API.");

      const decryptedStr = await decryptSnapTikAes(tData.id, tData.p);
      const challenge = JSON.parse(decryptedStr);
      const _e = challenge._e;
      const _h = challenge._h;
      delete challenge._e;
      delete challenge._h;
      const challengeResult = solveSnapTikChallenge(challenge);
      const xVerify = `${tData.id}:${challengeResult}:${_e}:${_h}`;

      const extractRes = await scraperFetch(
        {
          url: `https://snaptik.app/api/extract?url=${encodeURIComponent(cleanUrl)}`,
          headers: {
            "User-Agent": CHROME_UA,
            "X-Requested-With": "XMLHttpRequest",
            "X-Verify": xVerify,
            Origin: "https://snaptik.app",
            Referer: "https://snaptik.app/",
          },
          rawResponse: true,
        },
        "SnapTik Extract",
      );
      currentStatus = extractRes.status;
      const exData =
        typeof extractRes.data === "string"
          ? JSON.parse(extractRes.data)
          : extractRes.data;
      if (!exData || !exData.success || !exData.data) {
        throw new Error(exData?.message || "SnapTik extraction failed.");
      }

      const info = exData.data;
      const downloads = [];

      const photos =
        info.photoUrls || info.photos || info.images || info.slides;
      if (photos && Array.isArray(photos) && photos.length > 0) {
        photos.forEach((img) => {
          const photoUrl =
            typeof img === "string"
              ? img
              : img?.url || img?.src || img?.link || img?.downloadUrl || "";
          if (photoUrl) {
            downloads.push({ type: "PHOTO", url: photoUrl });
          }
        });
      }

      if (info.downloadUrl) {
        downloads.push({ type: "720p", url: info.downloadUrl });
      }

      if (!downloads.length)
        throw new Error("No download links found from SnapTik.");

      _ttSource = null;
      return createScraperResult(true, {
        title: info.title || "TikTok Video",
        author: info.author?.nickname || info.author?.name || "TikTok User",
        thumbnail: info.thumbnail || "",
        downloads,
        sourceUrl: url,
      });
    }

    if (_ttSource === "tiktokio") {
      const res = await scraperFetch(
        {
          url: "https://tiktokio.com/api/v1/tk/html",
          method: "POST",
          data: {
            vid: cleanUrl,
            prefix: "tiktokio.com",
          },
          headers: {
            "User-Agent": CHROME_UA,
            "Content-Type": "application/json",
            Origin: "https://tiktokio.com",
            Referer: "https://tiktokio.com/",
          },
          rawResponse: true,
        },
        "TikTokIO",
      );
      currentStatus = res.status;

      let html = res.data;
      if (typeof html === "object" && html !== null) {
        html = JSON.stringify(html);
      }
      if (typeof html !== "string") {
        html = "";
      }
      if (
        !html ||
        html.includes("Please paste a valid link") ||
        html.includes("Error")
      ) {
        throw new Error("Invalid link or failed to fetch data from tiktokio.");
      }

      let title = "TikTok Content";
      const titleMatch = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      if (titleMatch) {
        title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
      }

      let thumbnail = "";
      const thumbMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (thumbMatch) {
        thumbnail = thumbMatch[1].replace(/&#38;/g, "&");
      }

      const isSlideshow =
        html.includes('class="images-grid"') ||
        html.includes('class="image-item"');

      const authorMatch = cleanUrl.match(/@([^\/]+)/);
      const author = authorMatch ? authorMatch[1] : "Unknown";

      const downloads = [];

      if (isSlideshow) {
        const slidesRegex =
          /<div[^>]*class=["'][^"']*image-item[^"']*["'][^>]*>[\s\S]*?<\/div>/gi;
        let slideMatch;
        while ((slideMatch = slidesRegex.exec(html)) !== null) {
          const slideHtml = slideMatch[0];
          const aHref = slideHtml.match(/href=["']([^"']+)/i);
          if (aHref && aHref[1] !== "#") {
            const photoUrl = aHref[1].replace(/&#38;/g, "&");
            if (!downloads.some((d) => d.url === photoUrl)) {
              downloads.push({ type: "PHOTO", url: photoUrl, isMirror: false });
            }
          } else {
            const imgSrc = slideHtml.match(/src=["']([^"']+)/i);
            if (imgSrc) {
              const photoUrl = imgSrc[1].replace(/&#38;/g, "&");
              if (!downloads.some((d) => d.url === photoUrl)) {
                downloads.push({
                  type: "PHOTO",
                  url: photoUrl,
                  isMirror: false,
                });
              }
            }
          }
        }

        const mp3TagRegex = /<a[\s\S]*?<\/a>/gi;
        let mp3Match;
        while ((mp3Match = mp3TagRegex.exec(html)) !== null) {
          const tag = mp3Match[0];
          if (
            tag.includes("download-btn-purple") ||
            tag.toLowerCase().includes("mp3") ||
            tag.toLowerCase().includes("music")
          ) {
            const h = tag.match(/href=["']([^"']+)/i);
            if (h && h[1] !== "#") {
              const audioUrl = h[1].replace(/&#38;/g, "&");
              if (!downloads.some((d) => d.url === audioUrl)) {
                downloads.push({ type: "MP3", url: audioUrl, isMirror: false });
              }
            }
          }
        }
      } else {
        const anchorTagRegex = /<a[\s\S]*?<\/a>/gi;
        let anchorMatch;
        let videoCount = 0;
        while ((anchorMatch = anchorTagRegex.exec(html)) !== null) {
          const tag = anchorMatch[0];

          if (!tag.includes("download-btn")) continue;

          const hrefM = tag.match(/href=["']([^"']+)/i);
          if (!hrefM || hrefM[1] === "#") continue;
          const href = hrefM[1].replace(/&#38;/g, "&");

          const innerText = tag
            .replace(/<[^>]+>/g, "")
            .trim()
            .toLowerCase();

          if (
            innerText.includes("download watermark") &&
            !innerText.includes("without")
          ) {
            continue;
          }

          let isVideo = false;
          let isMp3 = false;
          if (
            innerText.includes("mp3") ||
            innerText.includes("music") ||
            tag.includes("download-btn-purple")
          ) {
            isMp3 = true;
          } else if (
            innerText.includes("without watermark") ||
            tag.includes("download-btn-blue") ||
            tag.includes("download-btn-green")
          ) {
            isVideo = true;
          }

          if (isVideo) {
            videoCount++;
            const isHd =
              tag.includes("download-btn-green") ||
              innerText.includes("(hd)") ||
              innerText.includes("1080");

            let label;
            if (isHd) {
              label = downloads.some((d) => d.type === "1080p")
                ? `VIDEO ${videoCount}`
                : "1080p";
            } else if (videoCount === 1) {
              label = "720p";
            } else if (!downloads.some((d) => d.type === "1080p")) {
              label = "1080p";
            } else if (!downloads.some((d) => d.type === "720p")) {
              label = "720p";
            } else {
              label = `VIDEO ${videoCount}`;
            }

            const isMirror = videoCount > 1;
            if (!downloads.some((d) => d.url === href)) {
              downloads.push({ type: label, url: href, isMirror });
            }
          } else if (isMp3) {
            if (!downloads.some((d) => d.url === href)) {
              downloads.push({ type: "MP3", url: href, isMirror: false });
            }
          }
        }
      }

      if (downloads.length === 0) {
        throw new Error("No download links found.");
      }

      _ttSource = null;
      return createScraperResult(true, {
        title,
        author,
        thumbnail,
        downloads,
        sourceUrl: url,
      });
    }

    throw new Error("Invalid source selected.");
  } catch (err) {
    _ttSource = null;
    return createScraperResult(false, err.message, currentStatus);
  }
}
