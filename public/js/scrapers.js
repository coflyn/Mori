import {
  CapacitorHttp,
  CHROME_UA,
  getCookiesFromHeaders,
  decodeSnapSave,
  extractFinalUrl,
  serializeData,
} from "./utils.js";

// Helper to extract clean URL from pasted text (which may contain share text, comments, etc.)
function getCleanUrl(text) {
  if (!text || typeof text !== "string") return "";
  const match = text.match(/https?:\/\/[^\s]+/);
  let clean = match ? match[0] : text.trim();
  // Ensure it has a protocol
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "https://" + clean;
  }
  return clean;
}

// Helper to safely parse JSON response data, catching HTML error responses (Cloudflare/Rate limit)
function parseJsonResponse(data, serverName = "Server") {
  if (typeof data === "object" && data !== null) return data;
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed.startsWith("<") || trimmed.startsWith("<!DOCTYPE")) {
      throw new Error(`${serverName} returned an HTML error page (blocked or unavailable). Please try another server.`);
    }
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      throw new Error(`${serverName} returned an invalid response format.`);
    }
  }
  throw new Error(`${serverName} returned an empty response.`);
}

async function sha256(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function scrapeRedNote(url) {
  try {
    let cleanUrl = getCleanUrl(url);

    // Resolve redirection if it's a short URL to get the xsec_token
    if (cleanUrl.includes("xhslink.com")) {
      try {
        const redirectRes = await CapacitorHttp.get({
          url: cleanUrl,
          headers: {
            "User-Agent": CHROME_UA,
          },
        });
        if (redirectRes.url) {
          cleanUrl = redirectRes.url;
        } else {
          const html = redirectRes.data || "";
          const canonicalMatch =
            html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/) ||
            html.match(
              /href="(https?:\/\/(?:www\.)?xiaohongshu\.com\/explore\/[^"]+)"/,
            );
          if (canonicalMatch) {
            cleanUrl = canonicalMatch[1];
          }
        }
      } catch (e) {
        console.error("RedNote redirect resolve failed:", e);
      }
    }

    const timestamp = Date.now().toString();
    const secret = "3HT8hjE79L";
    const signStr = "en" + timestamp + secret + "url=" + cleanUrl;
    const sign = await sha256(signStr);

    const res = await CapacitorHttp.post({
      url: "https://api.seekin.ai/ikool/media/download",
      data: { url: cleanUrl },
      headers: {
        "Content-Type": "application/json",
        lang: "en",
        timestamp: timestamp,
        sign: sign,
      },
    });

    const responseData =
      typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    if (!responseData || responseData.code !== "0000" || !responseData.data) {
      throw new Error(responseData?.msg || "Failed to process RedNote URL.");
    }

    const info = responseData.data;
    const title = info.title || "RedNote_Media";
    const thumbnail = info.imageUrl || null;
    const downloads = [];

    if (info.medias && info.medias.length > 0) {
      for (const item of info.medias) {
        downloads.push({
          url: item.url,
          type: "VIDEO",
          quality: item.format || "HD",
        });
      }
    } else if (info.images && info.images.length > 0) {
      for (const item of info.images) {
        downloads.push({
          url: item.url || item,
          type: "IMAGE",
          quality: "HD",
        });
      }
    }

    if (downloads.length === 0) throw new Error("No media found on this URL.");
    return {
      status: true,
      result: { title, thumbnail, downloads, sourceUrl: url },
    };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

export async function scrapeDouyin(url) {
  try {
    if (!url || typeof url !== "string") throw new Error("Invalid URL.");
    const clean = getCleanUrl(url);

    // Fetch Douyin page
    const mobileUA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";
    const pageRes = await CapacitorHttp.get({
      url: clean,
      headers: {
        "User-Agent": mobileUA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });

    const html = typeof pageRes.data === "string" ? pageRes.data : "";
    const marker = "window._ROUTER_DATA =";
    const startIdx = html.indexOf(marker);
    if (startIdx === -1) throw new Error("Could not find video data in page.");

    const slice = html.substring(startIdx + marker.length).trim();
    // Balance braces to extract JSON
    let braceCount = 0,
      inStr = false,
      strChar = null,
      escape = false,
      endIdx = -1;
    for (let i = 0; i < slice.length; i++) {
      const c = slice[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (inStr) {
        if (c === strChar) inStr = false;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = true;
        strChar = c;
        continue;
      }
      if (c === "{") braceCount++;
      else if (c === "}") {
        braceCount--;
        if (braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    if (endIdx === -1) throw new Error("Could not parse router data.");

    const routerData = JSON.parse(slice.substring(0, endIdx));
    const loaderData = routerData.loaderData || {};
    let videoInfoRes = null;
    for (const key in loaderData) {
      if (loaderData[key] && loaderData[key].videoInfoRes) {
        videoInfoRes = loaderData[key].videoInfoRes;
        break;
      }
    }
    if (
      !videoInfoRes ||
      !videoInfoRes.item_list ||
      videoInfoRes.item_list.length === 0
    )
      throw new Error("Could not locate video data.");

    const item = videoInfoRes.item_list[0];
    const title = item.desc || "Douyin Content";
    const author = item.author ? item.author.nickname : "Unknown";
    const awemeType = item.aweme_type;

    const downloads = [];

    // Photo slideshow (aweme_type 2)
    if (awemeType === 2 && item.images && item.images.length > 0) {
      item.images.forEach((img) => {
        const url = img.url_list?.[0];
        if (url) {
          const isMirror = downloads.some((d) => d.url === url);
          downloads.push({ type: "PHOTO", url, isMirror });
        }
      });
    } else {
      // Video mode
      const thumbnail =
        item.video && item.video.cover ? item.video.cover.url_list?.[0] : null;

      const watermarkUrl =
        item.video && item.video.play_addr
          ? item.video.play_addr.url_list?.[0]
          : null;
      if (!watermarkUrl) throw new Error("No video URL found.");

      let videoId = null;
      try {
        videoId = new URL(watermarkUrl).searchParams.get("video_id");
      } catch (e) {}
      if (!videoId) {
        const m = watermarkUrl.match(/video_id=([^&]+)/);
        if (m) videoId = m[1];
      }
      const noWatermarkUrl = videoId
        ? `https://aweme.snssdk.com/aweme/v1/play/?video_id=${videoId}`
        : watermarkUrl;

      downloads.push(
        { type: "VIDEO", url: noWatermarkUrl, isMirror: false },
        { type: "VIDEO_WM", url: watermarkUrl, isMirror: true },
      );
    }

    if (downloads.length === 0) {
      throw new Error("No downloadable media found.");
    }

    return {
      status: true,
      result: {
        title,
        author,
        thumbnail:
          item.video?.cover?.url_list?.[0] ||
          item.images?.[0]?.url_list?.[0] ||
          null,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

export async function scrapeBilibili(url) {
  try {
    let cleanUrl = getCleanUrl(url);

    // Resolve redirection if it's a short URL (b23.tv or bili.im)
    if (cleanUrl.includes("b23.tv") || cleanUrl.includes("bili.im")) {
      try {
        const redirectRes = await CapacitorHttp.get({
          url: cleanUrl,
          headers: {
            "User-Agent": CHROME_UA,
          },
        });
        if (redirectRes.url && redirectRes.url !== cleanUrl) {
          cleanUrl = redirectRes.url;
        } else if (redirectRes.data && typeof redirectRes.data === "string") {
          // bili.im may return HTML with <a href="..."> instead of HTTP redirect
          const hrefMatch = redirectRes.data.match(/href="([^"]+)"/i);
          if (hrefMatch) {
            cleanUrl = hrefMatch[1].replace(/&amp;/g, "&");
          }
        }
      } catch (e) {
        console.error("Bilibili redirect resolve failed:", e);
      }
    }

    if (cleanUrl.includes("bilibili.tv")) {
      // Clean tracking parameters to keep a clean destination URL
      try {
        const u = new URL(cleanUrl);
        cleanUrl = u.origin + u.pathname;
      } catch (e) {}

      try {
        // Parse bilibili.tv path to extract video (aid) or anime (ep_id)
        const urlObj = new URL(cleanUrl);
        const parts = urlObj.pathname.split("/").filter(Boolean);

        let apiInfo = null;
        let title = "Bilibili.tv Video";
        let thumbnail = null;

        const idxVideo = parts.indexOf("video");
        if (idxVideo !== -1) {
          const aid = parts[idxVideo + 1];
          if (aid && /^\d+$/.test(aid)) {
            apiInfo = { tipo: "video", id: aid };
          }
        }

        const idxPlay = parts.indexOf("play");
        if (idxPlay !== -1) {
          const numericParts = parts
            .slice(idxPlay + 1)
            .filter((p) => /^\d+$/.test(p));
          if (numericParts.length > 1) {
            apiInfo = { tipo: "anime", id: numericParts[1] };
          } else if (numericParts.length === 1) {
            // Season-only URL, need to resolve default episode ID from HTML first
            apiInfo = { tipo: "anime", id: null, seasonId: numericParts[0] };
          }
        }

        if (!apiInfo) {
          throw new Error("Could not parse Bilibili.tv video or episode ID.");
        }

        let html = "";
        try {
          const pageRes = await CapacitorHttp.get({
            url: cleanUrl,
            headers: {
              "User-Agent": CHROME_UA,
            },
          });
          html = pageRes.data || "";
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) title = titleMatch[1].trim();

          const imageMatch =
            html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
            html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
          if (imageMatch) thumbnail = imageMatch[1];
        } catch (err) {
          console.error("Failed to fetch Bilibili.tv page metadata:", err);
        }

        // If we don't have the episode ID yet (season-only URL), resolve it from episodes API or HTML
        if (apiInfo.tipo === "anime" && !apiInfo.id && apiInfo.seasonId) {
          try {
            const epRes = await CapacitorHttp.get({
              url: `https://api.bilibili.tv/intl/gateway/web/v2/ogv/play/episodes?season_id=${apiInfo.seasonId}&platform=web&s_locale=en_US`,
              headers: { "User-Agent": CHROME_UA },
            });
            const epData =
              typeof epRes.data === "string"
                ? JSON.parse(epRes.data)
                : epRes.data;
            const fetchedEpId =
              epData?.data?.sections?.[0]?.episodes?.[0]?.episode_id;
            if (fetchedEpId) {
              apiInfo.id = fetchedEpId;
            }
          } catch (e) {
            console.error("Failed to fetch Bilibili.tv episodes list:", e);
          }

          if (!apiInfo.id) {
            try {
              const match = html.match(
                /window\.__initialState\s*=\s*([\s\S]*?)<\/script>/,
              );
              if (match) {
                let scriptText = match[1].trim();
                if (scriptText.endsWith(";")) {
                  scriptText = scriptText.substring(0, scriptText.length - 1);
                }
                const fn = new Function(`
                  var window = {};
                  window.__initialState = ${scriptText};
                  return window.__initialState;
                `);
                const state = fn();
                if (state) {
                  apiInfo.id =
                    state.ogv?.season?.first_episode?.episode_id ||
                    state.ogv?.sectionsList?.[0]?.episodes?.[0]?.episode_id;
                }
              }
            } catch (err) {
              console.error(
                "Failed to parse Bilibili.tv season page HTML:",
                err,
              );
            }
          }

          if (!apiInfo.id) {
            apiInfo.id = apiInfo.seasonId;
          }
        }

        const downloads = [];

        // Try v2 OGV playurl endpoint first for anime/episodes
        if (apiInfo.tipo === "anime") {
          try {
            const v2Res = await CapacitorHttp.get({
              url: `https://api.bilibili.tv/intl/gateway/v2/ogv/playurl?s_locale=en_US&platform=web&ep_id=${apiInfo.id}`,
              headers: {
                referer: "https://www.bilibili.tv/",
                "User-Agent": CHROME_UA,
              },
            });
            const v2Data =
              typeof v2Res.data === "string"
                ? JSON.parse(v2Res.data)
                : v2Res.data;
            const videoInfo = v2Data?.data?.video_info;
            if (videoInfo) {
              const streamList = videoInfo.stream_list || [];
              for (const s of streamList) {
                let streamUrl =
                  s.dash_video?.base_url ||
                  s.dash_video?.backup_url?.[0] ||
                  s.video_resource?.url;
                if (streamUrl) {
                  if (streamUrl.startsWith("http://")) {
                    streamUrl = "https://" + streamUrl.slice(7);
                  }
                  const qText =
                    s.stream_info?.display_desc ||
                    s.stream_info?.description ||
                    `${s.stream_info?.quality}P` ||
                    "HD";
                  downloads.push({
                    url: streamUrl,
                    type: "Video",
                    quality: qText,
                  });
                }
              }

              const dashAudio = videoInfo.dash_audio || [];
              for (const a of dashAudio) {
                let audioUrl = a.base_url || a.backup_url?.[0];
                if (audioUrl) {
                  if (audioUrl.startsWith("http://")) {
                    audioUrl = "https://" + audioUrl.slice(7);
                  }
                  const qText = a.bandwidth
                    ? `${Math.round(a.bandwidth / 1000)}kbps`
                    : "Audio";
                  downloads.push({
                    url: audioUrl,
                    type: "Audio",
                    quality: qText,
                  });
                }
              }
            }
          } catch (err) {
            console.warn("Bilibili.tv v2 OGV playurl failed:", err);
          }
        }

        // Fallback to legacy playurl endpoint if no streams found yet
        if (downloads.length === 0) {
          let urlApi;
          if (apiInfo.tipo === "anime") {
            urlApi = `https://api.bilibili.tv/intl/gateway/web/playurl?ep_id=${apiInfo.id}&device=wap&platform=web&qn=64&tf=0&type=0`;
          } else {
            urlApi = `https://api.bilibili.tv/intl/gateway/web/playurl?s_locale=en_US&platform=web&aid=${apiInfo.id}&qn=120`;
          }

          const playRes = await CapacitorHttp.get({
            url: urlApi,
            headers: {
              referer: "https://www.bilibili.tv/",
              "User-Agent": CHROME_UA,
            },
          });

          const playData =
            typeof playRes.data === "string"
              ? JSON.parse(playRes.data)
              : playRes.data;
          if (playData && playData.data?.playurl) {
            const playurl = playData.data.playurl;
            const videoList = playurl.video || [];
            for (const v of videoList) {
              const resource = v.video_resource || {};
              if (resource.url) {
                let finalUrl = resource.url;
                if (finalUrl.startsWith("http://")) {
                  finalUrl = "https://" + finalUrl.slice(7);
                }
                const qText =
                  v.stream_info?.desc_words ||
                  `${v.stream_info?.quality}P` ||
                  "HD";
                downloads.push({
                  url: finalUrl,
                  type: "Video",
                  quality: qText,
                });
              }
            }

            const audioList = playurl.audio_resource || [];
            for (const a of audioList) {
              if (a.url) {
                let finalUrl = a.url;
                if (finalUrl.startsWith("http://")) {
                  finalUrl = "https://" + finalUrl.slice(7);
                }
                const qText = a.quality
                  ? `${Math.floor(a.quality / 1000)}kbps`
                  : "High";
                downloads.push({
                  url: finalUrl,
                  type: "Audio",
                  quality: qText,
                });
              }
            }
          }
        }

        if (downloads.length === 0) {
          throw new Error("No video or audio download streams found.");
        }

        return {
          status: true,
          result: {
            title,
            thumbnail,
            author: "Bilibili.tv Creator",
            downloads,
            sourceUrl: url,
          },
        };
      } catch (err) {
        console.warn(
          "Bilibili.tv native scraper failed, trying seekin.ai fallback:",
          err,
        );
      }
    }

    // Clean tracking parameters to keep a clean destination URL
    try {
      const u = new URL(cleanUrl);
      cleanUrl = u.origin + u.pathname;
    } catch (e) {}

    const timestamp = Date.now().toString();
    const secret = "3HT8hjE79L";
    const signStr = "en" + timestamp + secret + "url=" + cleanUrl;
    const sign = await sha256(signStr);

    const res = await CapacitorHttp.post({
      url: "https://api.seekin.ai/ikool/media/download",
      data: { url: cleanUrl },
      headers: {
        "Content-Type": "application/json",
        lang: "en",
        timestamp: timestamp,
        sign: sign,
      },
    });

    const responseData =
      typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    if (!responseData || responseData.code !== "0000" || !responseData.data) {
      throw new Error(responseData?.msg || "Failed to process Bilibili URL.");
    }

    const info = responseData.data;
    const title = info.title || "Bilibili Video";
    const thumbnail = info.imageUrl || null;
    const downloads = [];

    if (info.medias && info.medias.length > 0) {
      for (let i = 0; i < info.medias.length; i++) {
        const item = info.medias[i];
        downloads.push({
          url: item.url,
          type: "VIDEO",
          quality: item.format || `Part ${i + 1}`,
        });
      }
    }

    if (downloads.length === 0) throw new Error("No video URLs found.");

    return {
      status: true,
      result: {
        title,
        thumbnail,
        author: "Bilibili Creator",
        downloads,
        sourceUrl: url,
      },
    };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

export async function scrapeThreads(url) {
  try {
    const mainRes = await CapacitorHttp.get({
      url: "https://threadster.app/",
      headers: { "User-Agent": CHROME_UA },
    });
    const cookies = mainRes.headers["set-cookie"] || "";

    const dlRes = await CapacitorHttp.post({
      url: "https://threadster.app/download",
      data: { url },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": CHROME_UA,
        Cookie: cookies,
      },
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(dlRes.data, "text/html");
    const downloads = [];
    doc.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      if (href && (href.includes("token=") || href.includes("acxcdn.com"))) {
        let finalUrl = href;
        let type = "VIDEO";
        try {
          const urlObj = new URL(href);
          const token = urlObj.searchParams.get("token");
          if (token) {
            const payloadPart = token.split(".")[1];
            if (payloadPart) {
              const payload = JSON.parse(atob(payloadPart));
              if (payload.url) {
                finalUrl = payload.url;
                const lowerUrl = finalUrl.toLowerCase();
                if (
                  lowerUrl.includes(".jpg") ||
                  lowerUrl.includes(".jpeg") ||
                  lowerUrl.includes(".png") ||
                  lowerUrl.includes(".webp")
                ) {
                  type = "IMAGE";
                }
              }
            }
          }
        } catch (e) {}
        downloads.push({ type, url: finalUrl });
      }
    });

    if (downloads.length === 0) throw new Error("No download links found.");
    return { status: true, result: { title: "Threads Media", downloads } };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

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
      const tokenRes = await CapacitorHttp.post({
        url: "https://snaptik.app/api/token",
        headers: {
          "User-Agent": CHROME_UA,
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/json",
          Origin: "https://snaptik.app",
          Referer: "https://snaptik.app/",
        },
        data: {},
      });
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

      const extractRes = await CapacitorHttp.get({
        url: `https://snaptik.app/api/extract?url=${encodeURIComponent(cleanUrl)}`,
        headers: {
          "User-Agent": CHROME_UA,
          "X-Requested-With": "XMLHttpRequest",
          "X-Verify": xVerify,
          Origin: "https://snaptik.app",
          Referer: "https://snaptik.app/",
        },
      });
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
          const photoUrl = typeof img === "string" ? img : (img?.url || img?.src || img?.link || img?.downloadUrl || "");
          if (photoUrl) {
            downloads.push({ type: "PHOTO", url: photoUrl });
          }
        });
      }

      if (info.downloadUrl) {
        downloads.push({ type: "MP4", url: info.downloadUrl });
      }
      if (info.hdDownloadUrl) {
        const hdUrl = info.hdDownloadUrl.startsWith("http")
          ? info.hdDownloadUrl
          : "https://snaptik.app" + info.hdDownloadUrl;
        downloads.push({ type: "MP4 (HD)", url: hdUrl });
      }

      if (!downloads.length)
        throw new Error("No download links found from SnapTik.");

      _ttSource = null;
      return {
        status: true,
        result: {
          title: info.title || "TikTok Video",
          author: info.author?.nickname || info.author?.name || "TikTok User",
          thumbnail: info.thumbnail || "",
          downloads,
          sourceUrl: url,
        },
      };
    }

    if (_ttSource === "tiktokio") {
      const userAgent = CHROME_UA;

      const res = await CapacitorHttp.post({
        url: "https://tiktokio.com/api/v1/tk/html",
        data: {
          vid: cleanUrl,
          prefix: "tiktokio.com",
        },
        headers: {
          "User-Agent": userAgent,
          "Content-Type": "application/json",
          Origin: "https://tiktokio.com",
          Referer: "https://tiktokio.com/",
        },
      });
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

      // Extract title
      let title = "TikTok Content";
      const titleMatch = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      if (titleMatch) {
        title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
      }

      // Extract thumbnail
      let thumbnail = "";
      const thumbMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (thumbMatch) {
        thumbnail = thumbMatch[1].replace(/&#38;/g, "&");
      }

      // Check if slideshow
      const isSlideshow =
        html.includes('class="images-grid"') ||
        html.includes('class="image-item"');

      // Extract author from URL
      const authorMatch = cleanUrl.match(/@([^\/]+)/);
      const author = authorMatch ? authorMatch[1] : "Unknown";

      const downloads = [];

      if (isSlideshow) {
        // Extract photo links - find all anchor tags inside image-item
        const slidesRegex =
          /<div[^>]*class=["'][^"']*image-item[^"']*["'][^>]*>[\s\S]*?<\/div>/gi;
        let slideMatch;
        while ((slideMatch = slidesRegex.exec(html)) !== null) {
          const slideHtml = slideMatch[0];
          // href inside the slide
          const aHref = slideHtml.match(/href=["']([^"']+)/i);
          if (aHref && aHref[1] !== "#") {
            const url = aHref[1].replace(/&#38;/g, "&");
            if (!downloads.some((d) => d.url === url)) {
              downloads.push({ type: "PHOTO", url, isMirror: false });
            }
          } else {
            // fallback to img src
            const imgSrc = slideHtml.match(/src=["']([^"']+)/i);
            if (imgSrc) {
              const url = imgSrc[1].replace(/&#38;/g, "&");
              if (!downloads.some((d) => d.url === url)) {
                downloads.push({ type: "PHOTO", url, isMirror: false });
              }
            }
          }
        }

        // Extract MP3/music link for slideshow
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
              const url = h[1].replace(/&#38;/g, "&");
              if (!downloads.some((d) => d.url === url)) {
                downloads.push({ type: "MP3", url, isMirror: false });
              }
            }
          }
        }
      } else {
        // Normal video mode - extract ALL anchor tags, check class for download-btn
        const anchorTagRegex = /<a[\s\S]*?<\/a>/gi;
        let anchorMatch;
        while ((anchorMatch = anchorTagRegex.exec(html)) !== null) {
          const tag = anchorMatch[0];

          // Must contain download-btn in class
          if (!tag.includes("download-btn")) continue;

          // Extract href
          const hrefM = tag.match(/href=["']([^"']+)/i);
          if (!hrefM || hrefM[1] === "#") continue;
          const href = hrefM[1].replace(/&#38;/g, "&");

          // Extract inner text
          const innerText = tag
            .replace(/<[^>]+>/g, "")
            .trim()
            .toLowerCase();

          let label = null;
          if (
            innerText.includes("without watermark") ||
            tag.includes("download-btn-blue") ||
            tag.includes("download-btn-green")
          ) {
            label = "VIDEO";
          } else if (
            innerText.includes("mp3") ||
            innerText.includes("music") ||
            tag.includes("download-btn-purple")
          ) {
            label = "MP3";
          }

          if (label) {
            const isMirror = downloads.some((d) => d.type === label);
            downloads.push({ type: label, url: href, isMirror });
          }
        }
      }

      if (downloads.length === 0) {
        throw new Error("No download links found.");
      }

      _ttSource = null;
      return {
        status: true,
        result: {
          title,
          author,
          thumbnail,
          downloads,
          sourceUrl: url,
        },
      };
    }

    throw new Error("Invalid source selected.");
  } catch (err) {
    _ttSource = null;
    return {
      status: false,
      message: err.message,
      statusCode: currentStatus,
    };
  }
}

export let _igSource = null;
export function setInstagramSource(src) {
  _igSource = src;
}

export async function scrapeInstagram(url) {
  let currentStatus = null;
  try {
    const cleanUrl = getCleanUrl(url).split("?")[0];
    if (!_igSource) return { requireSource: true };

    if (_igSource === "downreels") {
      const r = await CapacitorHttp.post({
        url: "https://api.zoraahub.com/fetch.php",
        data: { url },
        headers: {
          "Content-Type": "application/json",
          "User-Agent": CHROME_UA,
          Origin: "https://downreels.com",
          Referer: "https://downreels.com/",
        },
      });
      currentStatus = r.status;
      const data = parseJsonResponse(r.data, "DownReels Server");
      if (!data || data.status !== "ok")
        throw new Error(data?.message || "Failed to fetch from DownReels.");
      const items = data.videos || data.images || [];
      const downloads = items.map((item) => ({
        url: item.url,
        type: item.isVideo ? "VIDEO" : "IMAGE",
        quality: item.quality || "HD",
        thumbnail: item.thumb || null,
      }));
      if (!downloads.length)
        throw new Error("No download links found from DownReels.");
      _igSource = null;
      return {
        status: true,
        result: {
          title: "Instagram Media",
          thumbnail: data.thumbnail || downloads[0].url,
          downloads,
          sourceUrl: url,
        },
      };
    }

    if (_igSource === "indown") {
      const desktopUA = CHROME_UA;
      const acceptHeader =
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7";

      const r1 = await CapacitorHttp.get({
        url: "https://indown.io/en2",
        headers: {
          "User-Agent": desktopUA,
          Accept: acceptHeader,
        },
      });
      currentStatus = r1.status;
      const parser = new DOMParser();
      const doc1 = parser.parseFromString(r1.data, "text/html");
      const cookies = getCookiesFromHeaders(r1.headers);
      const token = doc1.querySelector('input[name="_token"]')?.value;
      if (!token) throw new Error("Scraper outdated (token missing).");

      const r2 = await CapacitorHttp.post({
        url: "https://indown.io/download",
        data: serializeData({ link: cleanUrl, _token: token, a: "a" }),
        headers: {
          Cookie: cookies,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": desktopUA,
          Accept: acceptHeader,
        },
      });
      currentStatus = r2.status;

      const doc2 = parser.parseFromString(r2.data, "text/html");
      const errorMsg = doc2
        .querySelector("#error .modal-body")
        ?.textContent?.trim();
      if (errorMsg && errorMsg.toLowerCase().includes("not found")) {
        throw new Error("Post not found on Indown.");
      }

      let thumbnail = null;
      const video = doc2.querySelector("video.img-fluid");
      if (video) thumbnail = video.getAttribute("poster");

      const downloadsMap = new Map();

      const addLink = (a) => {
        const href = a.getAttribute("href");
        if (
          !href ||
          !href.startsWith("http") ||
          href.includes("indown.io") ||
          href.includes("ads")
        )
          return;
        const key = href.split("?")[0];
        if (downloadsMap.has(key)) return;
        const text = (a.textContent || "").toUpperCase();
        const isImage =
          /\.(jpe?g|png|webp|gif)(\?|$)/i.test(key) ||
          text.includes("IMAGE") ||
          text.includes("PHOTO");
        const type = isImage ? "IMAGE" : "VIDEO";
        downloadsMap.set(key, { type, url: href });
      };

      // Prioritize download buttons in result containers
      const btnLinks = doc2.querySelectorAll(
        ".btn-group-vertical a, a.btn-color, a.btn, a[href*='cdninstagram'], a[href*='fbcdn']",
      );
      if (btnLinks.length > 0) {
        btnLinks.forEach(addLink);
      }

      if (downloadsMap.size === 0) {
        const resultArea = doc2.querySelector(".container .row") || doc2;
        resultArea.querySelectorAll("a[href]").forEach(addLink);
      }

      const downloads = [...downloadsMap.values()];

      if (downloads.length === 0)
        throw new Error(
          "Media links not found. Post might be private or invalid.",
        );
      if (!thumbnail && downloads.length > 0) thumbnail = downloads[0].url;

      _igSource = null;
      return {
        status: true,
        result: {
          title: "Instagram Content",
          thumbnail,
          downloads,
          sourceUrl: url,
        },
      };
    }

    throw new Error("Invalid source selected.");
  } catch (err) {
    _igSource = null;
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}
export let _ytSource = null;
export function setYouTubeSource(src) {
  _ytSource = src;
}

export async function scrapeYouTube(url) {
  let currentStatus = null;
  try {
    const videoId = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    )?.[1];
    if (!videoId) throw new Error("Invalid YouTube URL");

    if (!_ytSource) return { requireSource: true };

    const oembed = async () => {
      let title = "YouTube Video";
      let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      try {
        const oRes = await CapacitorHttp.get({
          url: `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        });
        if (oRes.data) {
          const o =
            typeof oRes.data === "string" ? JSON.parse(oRes.data) : oRes.data;
          title = o.title || title;
          thumbnail = o.thumbnail_url || thumbnail;
        }
      } catch (e) {}
      return { title, thumbnail };
    };

    const meta = await oembed();

    if (_ytSource === "gg") {
      const headers = {
        Origin: "https://media.ytmp3.gg",
        Referer: "https://media.ytmp3.gg/",
        "User-Agent": CHROME_UA,
        Accept: "application/json, text/plain, */*",
      };
      const runConvert = async (format, quality) => {
        try {
          const convRes = await CapacitorHttp.post({
            url: "https://hub.convert1s.com/api/download",
            headers: { ...headers, "Content-Type": "application/json" },
            data: JSON.stringify({
              url,
              os: "macos",
              output: {
                type: format === "mp4" ? "video" : "audio",
                format,
                quality,
              },
              audio: { bitrate: "128k" },
            }),
          });
          currentStatus = convRes.status;
          const conv =
            typeof convRes.data === "string"
              ? JSON.parse(convRes.data)
              : convRes.data;
          if (conv.error || !conv.statusUrl) return null;
          let downloadUrl = null,
            attempts = 0;
          while (!downloadUrl && attempts < 30) {
            await new Promise((r) => setTimeout(r, 2000));
            const pollRes = await CapacitorHttp.get({
              url: conv.statusUrl,
              headers,
            });
            const status =
              typeof pollRes.data === "string"
                ? JSON.parse(pollRes.data)
                : pollRes.data;
            attempts++;
            if (status.status === "completed" && status.downloadUrl) {
              downloadUrl = status.downloadUrl;
              break;
            }
            if (status.status === "error" || status.status === "failed") break;
          }
          return downloadUrl
            ? { url: downloadUrl, quality: conv.selectedQuality || quality }
            : null;
        } catch (e) {
          return null;
        }
      };
      const tiers = ["1080p", "720p", "480p", "360p"];
      const [mp3, ...mp4s] = await Promise.all([
        runConvert("mp3", ""),
        ...tiers.map((q) => runConvert("mp4", q)),
      ]);
      const downloads = [];
      mp4s.forEach((r, i) => {
        if (r) downloads.push({ type: `MP4 ${tiers[i]}`, url: r.url });
      });
      if (mp3) downloads.push({ type: "MP3", url: mp3.url });
      if (!downloads.length)
        throw new Error("Failed to get download links. Try again.");
      _ytSource = null;
      return { status: true, result: { ...meta, downloads, sourceUrl: url } };
    }

    if (_ytSource === "mobi") {
      const headers = {
        Origin: "https://ytmp3.mobi",
        Referer: "https://ytmp3.mobi/",
        "User-Agent": CHROME_UA,
      };
      const r1 = await CapacitorHttp.get({
        url: "https://a.ymcdn.org/api/v1/init?p=y&23=1llum1n471",
        headers,
      });
      if (!r1.data || r1.data.error) throw new Error("Init failed");
      const fetchSingle = async (format) => {
        const r2 = await CapacitorHttp.get({
          url: `${r1.data.convertURL}&v=${videoId}&f=${format}`,
          headers,
        });
        if (!r2.data || r2.data.error) return null;
        let progress = 0,
          dlUrl = r2.data.downloadURL,
          progUrl = r2.data.progressURL;
        let attempts = 0;
        while (progress < 3 && attempts < 15) {
          await new Promise((r) => setTimeout(r, 2000));
          const r3 = await CapacitorHttp.get({ url: progUrl, headers });
          if (!r3.data || r3.data.error) break;
          progress = r3.data.progress;
          if (r3.data.downloadURL) dlUrl = r3.data.downloadURL;
          if (progress === 4) break;
          attempts++;
        }
        if (dlUrl && dlUrl.startsWith("//")) dlUrl = "https:" + dlUrl;
        if (dlUrl && dlUrl.startsWith("/"))
          dlUrl = "https://ytmp3.mobi" + dlUrl;
        return dlUrl;
      };
      const [mp4Url, mp3Url] = await Promise.all([
        fetchSingle("mp4"),
        fetchSingle("mp3"),
      ]);
      const downloads = [];
      if (mp4Url) downloads.push({ type: "MP4", url: mp4Url });
      if (mp3Url) downloads.push({ type: "MP3", url: mp3Url });
      if (!downloads.length)
        throw new Error("Failed to get download links. Try again.");
      _ytSource = null;
      return { status: true, result: { ...meta, downloads, sourceUrl: url } };
    }

    throw new Error("Invalid source selected");
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export let _twSource = null;
export function setTwitterSource(src) {
  _twSource = src;
}

export async function scrapeTwitter(url) {
  let currentStatus = null;
  try {
    const cleanUrl = getCleanUrl(url).split("?")[0];
    if (!_twSource) return { requireSource: true };

    const formatResolutionLabel = (rawText, qualityText) => {
      const text = (rawText || "") + " " + (qualityText || "");
      const match = text.match(/(\d+\s*[xX]\s*\d+|\d+\s*p)/i);
      if (match) {
        return match[1].replace(/\s+/g, "").toLowerCase();
      }
      const clean = text.replace(/download|video|mp4|\:/gi, "").trim();
      return clean || "MP4";
    };

    if (_twSource === "tvd") {
      const twitterUrl = cleanUrl.replace(
        /https:\/\/(x|fixupx|fxtwitter|vxtwitter|nitter)\.com/g,
        "https://twitter.com",
      );
      const r1 = await CapacitorHttp.get({
        url: "https://twittervideodownloader.com/",
        headers: { "User-Agent": CHROME_UA },
      });
      currentStatus = r1.status;
      const parser = new DOMParser();
      const doc1 = parser.parseFromString(r1.data, "text/html");
      const csrf = doc1.querySelector(
        'input[name="csrfmiddlewaretoken"]',
      )?.value;
      const gql = doc1.querySelector('input[name="gql"]')?.value || "";
      const cookies = getCookiesFromHeaders(r1.headers);

      if (!csrf)
        throw new Error(
          "Could not find CSRF token from TwitterVideoDownloader.",
        );

      const r2 = await CapacitorHttp.post({
        url: "https://twittervideodownloader.com/download",
        data: serializeData({
          tweet: twitterUrl,
          csrfmiddlewaretoken: csrf,
          gql: gql,
        }),
        headers: {
          Cookie: cookies,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": CHROME_UA,
          Referer: "https://twittervideodownloader.com/",
        },
      });
      currentStatus = r2.status;

      const doc2 = parser.parseFromString(r2.data, "text/html");
      const downloads = [];

      doc2.querySelectorAll(".card-body").forEach((card) => {
        const qualityText =
          card.querySelector(".card-text")?.textContent?.trim() || "";
        card.querySelectorAll("a.btn-download, a.btn").forEach((btn) => {
          const href = btn.getAttribute("href");
          const btnText = btn.textContent.trim();
          if (href && href.startsWith("http")) {
            const label = formatResolutionLabel(btnText, qualityText);
            if (!downloads.some((d) => d.url === href)) {
              const isImg =
                /\.(jpe?g|png|webp)(\?|$)/i.test(href) ||
                label === "IMAGE" ||
                label === "PHOTO";
              const isMirror = isImg
                ? false
                : downloads.some(
                    (d) => d.type !== "IMAGE" && d.type !== "PHOTO",
                  );
              downloads.push({ type: label, url: href, isMirror });
            }
          }
        });
      });

      if (downloads.length === 0) {
        doc2
          .querySelectorAll('a[href*="video.twimg.com"], a[href*="twimg.com"]')
          .forEach((a) => {
            const href = a.getAttribute("href");
            if (
              href &&
              href.startsWith("http") &&
              !downloads.some((d) => d.url === href)
            ) {
              const label = formatResolutionLabel(a.textContent.trim(), "");
              const isImg =
                /\.(jpe?g|png|webp)(\?|$)/i.test(href) ||
                label === "IMAGE" ||
                label === "PHOTO";
              const isMirror = isImg
                ? false
                : downloads.some(
                    (d) => d.type !== "IMAGE" && d.type !== "PHOTO",
                  );
              downloads.push({ type: label, url: href, isMirror });
            }
          });
      }

      if (downloads.length === 0)
        throw new Error("No video links found on TVD.");

      const thumbnail =
        doc2
          .querySelector(
            "img[src*='twimg.com'], img[src*='pbs.twimg.com'], .card img",
          )
          ?.getAttribute("src") ||
        doc2.querySelector("video")?.getAttribute("poster") ||
        null;

      _twSource = null;
      return {
        status: true,
        result: {
          title: "Twitter/X Video",
          thumbnail,
          downloads,
          sourceUrl: url,
        },
      };
    }

    if (_twSource === "tweeload") {
      const twitterUrl = cleanUrl.replace(
        /https:\/\/(fixupx|fxtwitter|vxtwitter|nitter|twitter)\.com/g,
        "https://x.com",
      );
      const r1 = await CapacitorHttp.get({
        url: "https://tweeload.com/en",
        headers: { "User-Agent": CHROME_UA },
      });
      currentStatus = r1.status;

      const parser = new DOMParser();

      const r2 = await CapacitorHttp.post({
        url: "https://tweeload.com/en/download",
        data: serializeData({ url: twitterUrl }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": CHROME_UA,
        },
      });
      currentStatus = r2.status;

      const doc2 = parser.parseFromString(r2.data, "text/html");
      const downloads = [];

      doc2
        .querySelectorAll(".download__item__info__actions tbody tr")
        .forEach((tr) => {
          const tds = tr.querySelectorAll("td");
          const quality = tds[0]?.textContent?.trim();
          let dlUrl = tr
            .querySelector("a.download__item__info__actions__button")
            ?.getAttribute("href");
          if (dlUrl) {
            if (dlUrl.startsWith("/")) dlUrl = "https://tweeload.com" + dlUrl;
            const label = formatResolutionLabel(quality, "");
            const isImg =
              /\.(jpe?g|png|webp)(\?|$)/i.test(dlUrl) ||
              label === "IMAGE" ||
              label === "PHOTO";
            const isMirror = isImg
              ? false
              : downloads.some((d) => d.type !== "IMAGE" && d.type !== "PHOTO");
            downloads.push({ type: label, url: dlUrl, isMirror });
          }
        });

      if (downloads.length === 0) {
        doc2.querySelectorAll("a.btn").forEach((a) => {
          let href = a.getAttribute("href");
          if (
            href &&
            (href.includes("downloads.acxcdn.com") ||
              href.includes("twimg.com") ||
              href.includes("tweeload"))
          ) {
            const text = a.textContent.trim();
            if (text.toLowerCase() !== "download via the mobile app") {
              const label = formatResolutionLabel(text, "");
              const isImg =
                /\.(jpe?g|png|webp)(\?|$)/i.test(href) ||
                label === "IMAGE" ||
                label === "PHOTO";
              const isMirror = isImg
                ? false
                : downloads.some(
                    (d) => d.type !== "IMAGE" && d.type !== "PHOTO",
                  );
              downloads.push({ type: label, url: href, isMirror });
            }
          }
        });
      }

      if (downloads.length === 0) throw new Error("Twitter links not found.");

      const name = doc2
        .querySelector(".download__item__info__user__name")
        ?.textContent?.trim();
      const handle = doc2
        .querySelector(".download__item__info__user__handle")
        ?.textContent?.trim();
      const thumbnail =
        doc2
          .querySelector(".download__item__preview img, .download__item img")
          ?.getAttribute("src") || null;

      _twSource = null;
      return {
        status: true,
        result: {
          title: name ? `${name} (${handle})` : "Twitter Content",
          thumbnail,
          downloads,
          sourceUrl: url,
        },
      };
    }

    throw new Error("Invalid source selected.");
  } catch (err) {
    _twSource = null;
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

let _spSource = null;

export function setSpotifySource(source) {
  _spSource = source;
}

export async function scrapeSpotify(url) {
  if (!_spSource) {
    return { status: true, requireSource: true };
  }

  let currentStatus = null;
  try {
    if (_spSource === "spotmate") {
      const r1 = await CapacitorHttp.get({
        url: "https://spotmate.online/en1",
        headers: { "User-Agent": CHROME_UA },
      });
      currentStatus = r1.status;
      const cookies = getCookiesFromHeaders(r1.headers);
      const parser = new DOMParser();
      const doc1 = parser.parseFromString(r1.data, "text/html");

      const csrfToken = doc1
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content");
      if (!csrfToken) {
        throw new Error("Could not extract CSRF token from SpotMate.");
      }

      const apiHeaders = {
        "X-CSRF-TOKEN": csrfToken,
        "Content-Type": "application/json",
        "User-Agent": CHROME_UA,
        Referer: "https://spotmate.online/en1",
        Origin: "https://spotmate.online",
        "X-Requested-With": "XMLHttpRequest",
      };
      if (cookies) apiHeaders["Cookie"] = cookies;

      const r2 = await CapacitorHttp.post({
        url: "https://spotmate.online/getTrackData",
        data: JSON.stringify({ spotify_url: url }),
        headers: apiHeaders,
      });
      currentStatus = r2.status;
      const trackData =
        typeof r2.data === "string" ? JSON.parse(r2.data) : r2.data;
      if (!trackData || trackData.error || !trackData.name) {
        throw new Error(
          trackData?.message || "Failed to fetch track details from SpotMate.",
        );
      }

      const title = trackData.name;
      const artist = trackData.artists
        ? trackData.artists.map((a) => a.name).join(", ")
        : "Unknown Artist";
      const thumbnail =
        trackData.album && trackData.album.images && trackData.album.images[0]
          ? trackData.album.images[0].url
          : "";

      const r3 = await CapacitorHttp.post({
        url: "https://spotmate.online/convert",
        data: JSON.stringify({ urls: url }),
        headers: apiHeaders,
      });
      currentStatus = r3.status;
      const convertData =
        typeof r3.data === "string" ? JSON.parse(r3.data) : r3.data;
      if (!convertData || convertData.error || !convertData.url) {
        throw new Error(
          convertData?.message || "Failed to get download URL from SpotMate.",
        );
      }

      _spSource = null;
      return {
        status: true,
        result: {
          title: artist ? `${artist} - ${title}` : title,
          thumbnail,
          downloads: [
            {
              type: "MP3",
              url: convertData.url,
            },
          ],
          sourceUrl: url,
        },
      };
    }

    // Default: SpotiDown
    const r1 = await CapacitorHttp.get({
      url: "https://spotidown.app/",
      headers: { "User-Agent": CHROME_UA },
    });
    currentStatus = r1.status;

    const parser = new DOMParser();
    const doc1 = parser.parseFromString(r1.data, "text/html");

    const form = doc1.querySelector('form[name="spotifyurl"]');
    const data = { url: url };
    form?.querySelectorAll("input").forEach((input) => {
      const name = input.getAttribute("name");
      const value = input.getAttribute("value") || "";
      if (name && name !== "url") data[name] = value;
    });

    const r2 = await CapacitorHttp.post({
      url: "https://spotidown.app/action",
      data: serializeData(data),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": CHROME_UA,
        Origin: "https://spotidown.app",
        Referer: "https://spotidown.app/",
      },
    });

    let r2Data = r2.data;
    if (typeof r2Data === "string") {
      try {
        r2Data = JSON.parse(r2Data);
      } catch (e) {}
    }

    if (r2Data.error) throw new Error(r2Data.message || "Spotify error");

    let finalHtml = r2Data.data;
    const doc2 = parser.parseFromString(finalHtml, "text/html");
    const form2 = doc2.querySelector('form[name="submitspurl"]');

    if (form2) {
      const data2 = {};
      form2.querySelectorAll("input").forEach((input) => {
        const name = input.getAttribute("name");
        const value = input.getAttribute("value") || "";
        if (name) data2[name] = value;
      });

      const r3 = await CapacitorHttp.post({
        url: "https://spotidown.app/action/track",
        data: serializeData(data2),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": CHROME_UA,
          Origin: "https://spotidown.app",
          Referer: "https://spotidown.app/",
        },
      });

      let r3Data = r3.data;
      if (typeof r3Data === "string") {
        try {
          r3Data = JSON.parse(r3Data);
        } catch (e) {}
      }
      finalHtml = r3Data.data || r3Data;
    }

    const doc3 = parser.parseFromString(finalHtml, "text/html");
    const title =
      doc3.querySelector("h3")?.textContent?.trim() || "Spotify Track";
    const artist = doc3.querySelector("p")?.textContent?.trim();
    const thumbnail = doc3.querySelector("img")?.getAttribute("src");
    const downloads = [];

    doc3.querySelectorAll("a").forEach((a) => {
      const link = a.getAttribute("href");
      const text = a.textContent.trim();
      if (
        link &&
        link.startsWith("http") &&
        !link.includes("premium.html") &&
        text !== "Download Another Song"
      ) {
        downloads.push({ type: text || "MP3", url: link });
      }
    });

    _spSource = null;
    return {
      status: true,
      result: {
        title: artist ? `${artist} - ${title}` : title,
        thumbnail,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    _spSource = null;
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapePinterest(url) {
  let currentStatus = null;
  try {
    const r1 = await CapacitorHttp.get({
      url: "https://pindown.io/",
      headers: { "User-Agent": CHROME_UA },
    });
    currentStatus = r1.status;
    const cookies = getCookiesFromHeaders(r1.headers);
    const parser = new DOMParser();
    const doc1 = parser.parseFromString(r1.data, "text/html");

    const tokenInput = doc1.querySelector(
      'input[type="hidden"]:not([name="lang"])',
    );
    const tokenName = tokenInput?.getAttribute("name");
    const tokenValue = tokenInput?.getAttribute("value");

    if (!tokenName || !tokenValue)
      throw new Error("Pinterest token not found.");

    const r2 = await CapacitorHttp.post({
      url: "https://pindown.io/action",
      data: { url, [tokenName]: tokenValue, lang: "en" },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookies,
        "User-Agent": CHROME_UA,
      },
    });
    currentStatus = r2.status;

    let r2Data = r2.data;
    if (typeof r2Data === "string") r2Data = JSON.parse(r2Data);

    const doc2 = parser.parseFromString(r2Data.html, "text/html");
    const downloads = [];
    doc2.querySelectorAll(".columns .column").forEach((el) => {
      const title = el.querySelector(".is-size-6")?.textContent?.trim();
      const dlUrl = el.querySelector(".button")?.getAttribute("href");
      if (dlUrl) downloads.push({ type: title || "DOWNLOAD", url: dlUrl });
    });

    return {
      status: true,
      result: {
        title: doc2.querySelector("h3")?.textContent?.trim() || "Pinterest",
        thumbnail: doc2.querySelector(".image img")?.getAttribute("src"),
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeAppleMusic(url) {
  let currentStatus = null;
  try {
    const headers = {
      "User-Agent": CHROME_UA,
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
    };

    const r1 = await CapacitorHttp.get({
      url: "https://aplmate.com/",
      headers: { ...headers, Accept: "text/html" },
    });
    currentStatus = r1.status;
    const cookies = getCookiesFromHeaders(r1.headers);

    const r2 = await CapacitorHttp.post({
      url: "https://aplmate.com/action/userverify",
      data: serializeData({ url }),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookies,
      },
    });

    let r2Data = r2.data;
    if (typeof r2Data === "string") r2Data = JSON.parse(r2Data);
    const token = r2Data.success ? r2Data.token : null;
    if (!token) throw new Error(r2Data.message || "Verification failed.");

    const r3 = await CapacitorHttp.post({
      url: "https://aplmate.com/action",
      data: serializeData({ url, "cf-turnstile-response": token }),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
      },
    });

    let r3Data = r3.data;
    if (typeof r3Data === "string") r3Data = JSON.parse(r3Data);
    if (r3Data.error) throw new Error(r3Data.message || "Action failed.");

    const parser = new DOMParser();
    let finalHtml = r3Data.html;
    const doc2 = parser.parseFromString(finalHtml, "text/html");
    const form2 = doc2.querySelector('form[name="submitapurl"]');

    if (form2) {
      const data2 = {};
      form2.querySelectorAll("input").forEach((input) => {
        const name = input.getAttribute("name");
        const value = input.getAttribute("value") || "";
        if (name) data2[name] = value;
      });

      const r4 = await CapacitorHttp.post({
        url: "https://aplmate.com/action/track",
        data: serializeData(data2),
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies,
        },
      });
      let r4Data = r4.data;
      if (typeof r4Data === "string") r4Data = JSON.parse(r4Data);
      finalHtml = r4Data.data || r4Data;
    }

    const doc3 = parser.parseFromString(finalHtml, "text/html");
    const title =
      doc3.querySelector(".hover-underline")?.textContent?.trim() ||
      doc3.querySelector("h3")?.textContent?.trim() ||
      "Apple Music Content";
    const artist = doc3.querySelector("p")?.textContent?.trim();
    const thumbnail = doc3.querySelector("img")?.getAttribute("src");
    const downloads = [];

    doc3.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      const text = a.textContent.trim();
      if (
        href &&
        (href.includes("/dl?token=") || a.classList.contains("abutton"))
      ) {
        if (href.includes("ko-fi.com") || href.includes("premium.html")) return;
        if (text.toLowerCase().includes("another song")) return;
        downloads.push({
          type: text || "MP3",
          url: href.startsWith("http") ? href : "https://aplmate.com" + href,
        });
      }
    });

    return {
      status: true,
      result: {
        title: artist ? `${artist} - ${title}` : title,
        thumbnail,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeFacebook(url) {
  let currentStatus = null;
  try {
    const headers = {
      "User-Agent": CHROME_UA,
      Origin: "https://snapsave.app",
      Referer: "https://snapsave.app/id",
    };

    const r1 = await CapacitorHttp.get({
      url: "https://snapsave.app/id",
      headers: { ...headers, Accept: "text/html" },
    });
    currentStatus = r1.status;
    const cookies = getCookiesFromHeaders(r1.headers);

    const r2 = await CapacitorHttp.post({
      url: "https://snapsave.app/action.php?lang=id",
      data: serializeData({ url }),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
      },
    });
    currentStatus = r2.status;

    const decodedHtml = decodeSnapSave(r2.data);
    const parser = new DOMParser();
    const doc = parser.parseFromString(decodedHtml, "text/html");
    const downloads = [];

    doc.querySelectorAll("table tbody tr").forEach((tr) => {
      const qTd = tr.querySelector("td.video-quality");
      const quality = qTd
        ? qTd.textContent.trim()
        : tr.querySelectorAll("td")[0]?.textContent?.trim();
      const btn =
        tr.querySelector("a.btn-download") ||
        tr.querySelector("button") ||
        tr.querySelector("a");
      let linkAttr = btn?.getAttribute("href") || btn?.getAttribute("onclick");

      const extracted = extractFinalUrl(linkAttr);
      if (extracted && extracted.url.startsWith("http")) {
        downloads.push({
          type: quality || "VIDEO",
          url: extracted.url,
          isRender: extracted.isRender,
        });
      }
    });

    if (downloads.length === 0)
      throw new Error("Could not extract download links.");

    const thumbEl =
      doc.querySelector(".video-preview img") ||
      doc.querySelector(".video-preview") ||
      doc.querySelector("img:not([src*='logo'])");
    let thumbnail = thumbEl
      ? thumbEl.getAttribute("src") ||
        thumbEl.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/, "$1")
      : null;
    if (thumbnail && thumbnail.startsWith("/"))
      thumbnail = "https://snapsave.app" + thumbnail;

    return {
      status: true,
      result: { title: "Facebook Media", thumbnail, downloads, sourceUrl: url },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeBandcamp(url) {
  let currentStatus = null;
  try {
    const headers = {
      "User-Agent": CHROME_UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    };

    const r1 = await CapacitorHttp.get({
      url: "https://bandcampdownloader.app/",
      headers,
    });
    currentStatus = r1.status;
    const cookies = getCookiesFromHeaders(r1.headers);
    const parser = new DOMParser();
    const doc1 = parser.parseFromString(r1.data, "text/html");

    const csrfInput = doc1.querySelector(
      'form[name="submitbcurl"] input[type="hidden"]',
    );
    const csrfName = csrfInput?.getAttribute("name");
    const csrfValue = csrfInput?.getAttribute("value");

    if (!csrfName || !csrfValue) throw new Error("CSRF token not found.");

    const r2 = await CapacitorHttp.post({
      url: "https://bandcampdownloader.app/action",
      data: serializeData({ url, [csrfName]: csrfValue }),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
      },
    });
    currentStatus = r2.status;

    let r2Data = r2.data;
    if (typeof r2Data === "string") r2Data = JSON.parse(r2Data);

    if (r2Data.error)
      throw new Error(r2Data.message || "Failed to process URL.");
    if (!r2Data.success || !r2Data.html)
      throw new Error("Unexpected response.");

    const doc2 = parser.parseFromString(r2Data.html, "text/html");
    const trackForms = doc2.querySelectorAll('form[name="submitapurl"]');
    if (trackForms.length === 0) throw new Error("No tracks found.");

    const firstDataB64 =
      trackForms[0].querySelector('input[name="data"]')?.value;
    const firstMeta = JSON.parse(atob(firstDataB64));

    const downloads = [];
    const isAlbum = trackForms.length > 1;

    for (let i = 0; i < trackForms.length; i++) {
      const form = trackForms[i];
      const dataVal = form.querySelector('input[name="data"]')?.value;
      const baseVal = form.querySelector('input[name="base"]')?.value;
      const tokenVal = form.querySelector('input[name="token"]')?.value;
      const meta = JSON.parse(atob(dataVal));

      const r3 = await CapacitorHttp.post({
        url: "https://bandcampdownloader.app/action/track",
        data: serializeData({
          data: dataVal,
          base: baseVal,
          token: tokenVal,
          type: "320",
        }),
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies,
        },
      });

      let r3Data = r3.data;
      if (typeof r3Data === "string") r3Data = JSON.parse(r3Data);
      if (r3Data.error) continue;

      const doc3 = parser.parseFromString(r3Data.data, "text/html");
      doc3.querySelectorAll("a.abutton").forEach((a) => {
        const href = a.getAttribute("href");
        const label = a.textContent.trim();
        if (href && href.includes("/dl?token=")) {
          const prefix = isAlbum
            ? `${(i + 1).toString().padStart(2, "0")}. `
            : "";
          downloads.push({
            type: `${prefix}${label}`,
            url: `https://bandcampdownloader.app${href}`,
          });
        }
      });
    }

    if (downloads.length === 0) throw new Error("Download links not found.");

    return {
      status: true,
      result: {
        title: isAlbum ? firstMeta.album || firstMeta.name : firstMeta.name,
        thumbnail: firstMeta.cover,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapePixiv(url) {
  let currentStatus = null;
  try {
    const illustIdMatch =
      url.match(/artworks\/(\d+)/) || url.match(/illust_id=(\d+)/);
    if (!illustIdMatch) throw new Error("Invalid Pixiv URL.");
    const illustId = illustIdMatch[1];

    let illustData = null;

    // 1. Try fetching official AJAX API
    try {
      const res = await CapacitorHttp.get({
        url: `https://www.pixiv.net/ajax/illust/${illustId}?lang=en`,
        headers: {
          "User-Agent": CHROME_UA,
          Referer: "https://www.pixiv.net/",
        },
      });
      currentStatus = res.status;
      let resData = res.data;
      if (typeof resData === "string") {
        try {
          resData = JSON.parse(resData);
        } catch (e) {}
      }
      if (resData && !resData.error && resData.body) {
        illustData = resData.body;
      }
    } catch (e) {}

    // 2. If AJAX API fails (R-18 / Login restriction), scrape HTML meta-preload-data
    if (!illustData) {
      try {
        const htmlRes = await CapacitorHttp.get({
          url: `https://www.pixiv.net/en/artworks/${illustId}`,
          headers: {
            "User-Agent": CHROME_UA,
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        if (htmlRes.data && typeof htmlRes.data === "string") {
          const match =
            htmlRes.data.match(/id="meta-preload-data"\s+content='([^']+)'/i) ||
            htmlRes.data.match(/id="meta-preload-data"\s+content="([^"]+)"/i);
          if (match && match[1]) {
            const rawContent = match[1]
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, "&");
            const preload = JSON.parse(rawContent);
            if (preload && preload.illust && preload.illust[illustId]) {
              illustData = preload.illust[illustId];
            }
          }
        }
      } catch (e) {
        console.warn("Could not parse meta-preload-data:", e);
      }
    }

    // 3. Determine if Ugoira
    let isUgoira = false;
    if (illustData) {
      isUgoira =
        String(illustData.illustType) === "2" ||
        illustData.illustType == 2 ||
        String(illustData.illust_type) === "2" ||
        illustData.type === "ugoira" ||
        (illustData.urls &&
          illustData.urls.original &&
          illustData.urls.original.includes("ugoira"));
    }

    // Double check via ugoira_meta endpoint
    if (!isUgoira) {
      try {
        const ugoMetaRes = await CapacitorHttp.get({
          url: `https://www.pixiv.net/ajax/illust/${illustId}/ugoira_meta?lang=en`,
          headers: {
            "User-Agent": CHROME_UA,
            Referer: "https://www.pixiv.net/",
          },
        });
        let metaData = ugoMetaRes.data;
        if (typeof metaData === "string") {
          try {
            metaData = JSON.parse(metaData);
          } catch (e) {}
        }
        if (
          metaData &&
          !metaData.error &&
          metaData.body &&
          (metaData.body.originalSrc ||
            (metaData.body.frames && metaData.body.frames.length > 0))
        ) {
          isUgoira = true;
        }
      } catch (e) {}
    }

    const title =
      illustData?.title || illustData?.illustTitle
        ? `${illustData.title || illustData.illustTitle} by ${
            illustData.userName || illustData.userAccount || "Unknown"
          }`
        : "Pixiv Artwork";

    const downloads = [];

    if (isUgoira) {
      let zipUrl = null;
      try {
        const ugoMetaRes = await CapacitorHttp.get({
          url: `https://www.pixiv.net/ajax/illust/${illustId}/ugoira_meta?lang=en`,
          headers: {
            "User-Agent": CHROME_UA,
            Referer: "https://www.pixiv.net/",
          },
        });
        let metaData = ugoMetaRes.data;
        if (typeof metaData === "string") {
          try {
            metaData = JSON.parse(metaData);
          } catch (e) {}
        }
        if (metaData && !metaData.error && metaData.body) {
          zipUrl = metaData.body.originalSrc || metaData.body.src;
        }
      } catch (e) {}

      downloads.push({
        type: "UGOIRA (MP4)",
        url: `https://ugoira.com/api/mp4/${illustId}`,
      });
      downloads.push({
        type: "UGOIRA (GIF)",
        url: `https://pixiv.re/${illustId}.gif`,
      });
      downloads.push({
        type: "UGOIRA (ZIP)",
        url:
          zipUrl ||
          `https://i.pximg.net/img-zip-ugoira/img/${illustId}_ugoira1920x1080.zip`,
      });
    } else {
      const pageCount = illustData?.pageCount || 1;
      const originalUrl = illustData?.urls?.original;
      if (originalUrl) {
        for (let i = 0; i < pageCount; i++) {
          let type = pageCount > 1 ? `PAGE ${i + 1}` : "IMAGE";
          let pageUrl = originalUrl.replace("_p0", `_p${i}`);
          pageUrl = pageUrl.replace("i.pximg.net", "i.pixiv.re");
          downloads.push({ type, url: pageUrl });
        }
      } else {
        downloads.push({
          type: "IMAGE / PAGE 1",
          url: `https://pixiv.re/${illustId}.jpg`,
        });
        for (let i = 2; i <= pageCount; i++) {
          downloads.push({
            type: `PAGE ${i}`,
            url: `https://pixiv.re/${illustId}-${i}.jpg`,
          });
        }
      }
    }

    const thumb = isUgoira
      ? `https://pixiv.re/${illustId}.gif`
      : illustData?.urls?.regular?.replace("i.pximg.net", "i.pixiv.re") ||
        illustData?.urls?.original?.replace("i.pximg.net", "i.pixiv.re") ||
        `https://pixiv.re/${illustId}.jpg`;

    return {
      status: true,
      result: {
        title,
        thumbnail: thumb,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}
