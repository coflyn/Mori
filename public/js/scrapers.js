import {
  CapacitorHttp as CapacitorHttpNative,
  CHROME_UA,
  getCookiesFromHeaders,
  decodeSnapSave,
  extractFinalUrl,
  serializeData,
  CapacitorHttpWeb
} from "./utils.js";

const CapacitorHttp = CapacitorHttpNative ?? CapacitorHttpWeb;

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
    const title = item.desc || "Douyin Video";
    const author = item.author ? item.author.nickname : "Unknown";
    const thumbnail =
      item.video && item.video.cover ? item.video.cover.url_list?.[0] : null;

    // Watermarked URL
    const watermarkUrl =
      item.video && item.video.play_addr
        ? item.video.play_addr.url_list?.[0]
        : null;
    if (!watermarkUrl) throw new Error("No video URL found.");

    // Extract video_id for no-watermark URL
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

    return {
      status: true,
      result: {
        title,
        author,
        thumbnail,
        downloads: [
          { type: "MP4 (No WM)", url: noWatermarkUrl },
          { type: "MP4 (Watermark)", url: watermarkUrl },
        ],
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

    // Resolve redirection if it's a short URL (b23.tv)
    if (cleanUrl.includes("b23.tv")) {
      try {
        const redirectRes = await CapacitorHttp.get({
          url: cleanUrl,
          headers: {
            "User-Agent": CHROME_UA,
          },
        });
        if (redirectRes.url) {
          cleanUrl = redirectRes.url;
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

        // Fetch HTML page to extract title, thumbnail, and default episode if needed
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

        // If we don't have the episode ID yet (season-only URL), resolve it from HTML
        if (apiInfo.tipo === "anime" && !apiInfo.id) {
          let defaultEpId = null;
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
                defaultEpId =
                  state.ogv?.season?.first_episode?.episode_id ||
                  state.ogv?.sectionsList?.[0]?.episodes?.[0]?.episode_id;
              }
            }
          } catch (err) {
            console.error("Failed to parse Bilibili.tv season page HTML:", err);
          }
          apiInfo.id = defaultEpId || apiInfo.seasonId;
        }

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
        if (!playData || !playData.data?.playurl) {
          throw new Error("Failed to retrieve Bilibili.tv stream data.");
        }

        const playurl = playData.data.playurl;
        const downloads = [];

        // Extract video streams — all resolutions
        const videoList = playurl.video || [];
        for (const v of videoList) {
          const resource = v.video_resource || {};
          if (resource.url) {
            const qText =
              v.stream_info?.desc_words || `${v.stream_info?.quality}P` || "HD";
            downloads.push({
              url: resource.url,
              type: "Video",
              quality: qText,
            });
          }
        }

        // Extract audio streams — all bitrates
        const audioList = playurl.audio_resource || [];
        for (const a of audioList) {
          if (a.url) {
            const qText = a.quality
              ? `${Math.floor(a.quality / 1000)}kbps`
              : "High";
            downloads.push({
              url: a.url,
              type: "Audio",
              quality: qText,
            });
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
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const cookies = mainRes.headers["set-cookie"] || "";

    const dlRes = await CapacitorHttp.post({
      url: "https://threadster.app/download",
      data: { url },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
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

export async function scrapeTikTok(url) {
  let currentStatus = null;
  try {
    const mainRes = await CapacitorHttp.get({
      url: "https://snaptik.app/en",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    currentStatus = mainRes.status;

    const parser = new DOMParser();
    const doc = parser.parseFromString(mainRes.data, "text/html");
    const token = doc.querySelector('input[name="token"]')?.value;
    if (!token) throw new Error("Scraper outdated (token missing).");

    const abcRes = await CapacitorHttp.post({
      url: "https://snaptik.app/abc2.php",
      data: { token, url },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    currentStatus = abcRes.status;

    const script1 = abcRes.data;
    const script2 = await new Promise((resolve, reject) => {
      try {
        const mockEval = (s) => resolve(s);
        const fn = new Function("eval", script1);
        fn(mockEval);
      } catch (e) {
        reject(new Error("Scraper outdated (eval failed)."));
      }
    });

    const capturedHtml = await new Promise((resolve, reject) => {
      let html = "";
      const context = {
        $: () => ({
          set innerHTML(t) {
            html = t;
          },
          remove: () => {},
          style: { display: "" },
        }),
        app: { showAlert: (msg) => reject(new Error(msg)) },
        document: { getElementById: () => ({ src: "" }) },
        fetch: () => {
          resolve(html);
          return { json: () => Promise.resolve({ thumbnail_url: "" }) };
        },
        gtag: () => {},
        Math: { round: () => 0 },
        XMLHttpRequest: function () {
          return { open: () => {}, send: () => {} };
        },
        window: { location: { hostname: "snaptik.app" } },
        setTimeout: () => {},
        setInterval: () => {},
        console: { log: () => {} },
        URL: { createObjectURL: () => "" },
      };
      try {
        const fn = new Function(...Object.keys(context), script2);
        fn(...Object.values(context));
      } catch (e) {
        reject(new Error("DOM Simulation failed."));
      }
    });

    const resDoc = parser.parseFromString(capturedHtml, "text/html");
    const downloads = [];
    resDoc.querySelectorAll("a").forEach((a) => {
      let href = a.getAttribute("href");
      let text = a.textContent.trim().toLowerCase();
      if (href) {
        if (href.startsWith("/")) href = "https://snaptik.app" + href;
        const isCdnLink =
          href.includes("acxcdn.com") ||
          href.includes("token=") ||
          href.includes("download.php");
        const isWebRedirect =
          href.includes("/en/download") || href.includes("/id/download");

        const isImageLink =
          href.match(/\.(jpg|jpeg|png|webp|avif)/i) ||
          text.includes("photo") ||
          text.includes("image") ||
          text.includes("slide");

        if ((isCdnLink || isImageLink) && !isWebRedirect) {
          if (text.includes("app") && !isImageLink) return;

          let label = "VIDEO";
          if (text.includes("music") || text.includes("mp3")) label = "MP3";
          if (isImageLink) label = "PHOTO";

          const isMirror =
            (label === "VIDEO" && downloads.some((d) => d.type === "VIDEO")) ||
            (label === "MP3" && downloads.some((d) => d.type === "MP3"));

          downloads.push({ type: label, url: href, isMirror });
        }
      }
    });

    const titleEl =
      resDoc.querySelector(".video-title") || resDoc.querySelector("h3");
    if (titleEl) titleEl.querySelectorAll("a").forEach((a) => a.remove());
    const title = titleEl?.textContent?.trim() || "TikTok Content";
    const thumbEl = resDoc.querySelector("img");
    let thumb = thumbEl
      ? thumbEl.getAttribute("src")?.startsWith("/")
        ? "https://snaptik.app" + thumbEl.getAttribute("src")
        : thumbEl.getAttribute("src")
      : null;

    if (!thumb && downloads.length > 0) {
      const firstMedia =
        downloads.find((d) => d.type === "VIDEO" || d.type === "PHOTO") ||
        downloads[0];
      thumb = firstMedia.url;
    }

    return {
      status: true,
      result: { title, thumbnail: thumb, downloads, sourceUrl: url },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeTikTokV2(url) {
  let currentStatus = null;
  try {
    const mainRes = await CapacitorHttp.post({
      url: `https://tiktokio.com/api/v1/tk/html`,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        "Content-Type": "application/json"
      },
      data: {
        "vid": url,
        "prefix": "tiktokio.com"
      },
      responseType: "text"
    });
    currentStatus = mainRes.status;

    if (currentStatus != 200) {
      console.error(data.data)
      return { status: false, message: "Error tiktokio provider.", statusCode: currentStatus };
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(mainRes.data, "text/html");

    const thumbnail =
      doc.querySelector(".video-info img")?.getAttribute("src") ?? null;

    const title =
      doc.querySelector(".video-info h3")?.textContent.trim() ?? null;

    const downloads = [...doc.querySelectorAll(".download-links a")].map((a) => {
      const type = a.textContent.toLowerCase().includes("hd")
        ? "VIDEO"
        : a.textContent.toLowerCase().includes("mp3")
        ? "AUDIO"
        : a.textContent.toLowerCase().includes("watermark")
        ? (a.textContent.toLowerCase().includes("without")
            ? "TRASH"
            : "TRASH")
        : "TRASH";

        return { type, url: a.href, isMirror: false }
    }).filter((download) => download.type == "VIDEO" || download.type == "AUDIO" || download.type == "PHOTO");

    const imageEls = [...doc.querySelectorAll(".images-grid img")];

    if (imageEls.length != 0) {
      imageEls.forEach((image) => {
        downloads.unshift({ type: "PHOTO", url: image.src, isMirror: false })
      })
    }

    return {
      status: true,
      result: { title, thumbnail, downloads, sourceUrl: url },
    };
  } catch (err) {
    console.error(err.message)
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeInstagram(url) {
  let currentStatus = null;
  try {
    const cleanUrl = url.split("?")[0];
    const desktopUA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
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

    // Check for error modal/alert
    const errorMsg = doc2
      .querySelector("#error .modal-body")
      ?.textContent?.trim();
    if (errorMsg && errorMsg.toLowerCase().includes("not found")) {
      throw new Error("Post not found on Indown.");
    }

    const downloads = [];
    let thumbnail = null;

    // Thumbnail from video poster
    const video = doc2.querySelector("video.img-fluid");
    if (video) {
      thumbnail = video.getAttribute("poster");
    }

    // Download links in btn-group-vertical
    doc2.querySelectorAll(".btn-group-vertical a").forEach((a) => {
      const href = a.getAttribute("href");
      if (href && href.startsWith("http")) {
        const text = a.textContent.trim().toUpperCase();
        const type =
          text.includes("PHOTO") || text.includes("IMAGE") ? "IMAGE" : "VIDEO";
        if (!downloads.some((d) => d.url === href)) {
          downloads.push({ type, url: href });
        }
      }
    });

    // Fallback: any direct http link in result area
    if (downloads.length === 0) {
      const resultArea = doc2.querySelector(".container .row") || doc2;
      resultArea.querySelectorAll("a").forEach((a) => {
        const href = a.getAttribute("href");
        if (
          href &&
          href.startsWith("http") &&
          !href.includes("indown.io") &&
          !href.includes("ads")
        ) {
          const text = a.textContent.trim().toUpperCase();
          const type =
            text.includes("PHOTO") || text.includes("IMAGE")
              ? "IMAGE"
              : "VIDEO";
          if (!downloads.some((d) => d.url === href)) {
            downloads.push({ type, url: href });
          }
        }
      });
    }

    if (downloads.length === 0)
      throw new Error(
        "Media links not found. Post might be private or invalid.",
      );

    if (!thumbnail && downloads.length > 0) {
      thumbnail = downloads[0].url;
    }

    return {
      status: true,
      result: {
        title: "Instagram Content",
        thumbnail,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeYouTube(url) {
  let currentStatus = null;
  try {
    const videoId = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    )?.[1];
    if (!videoId) throw new Error("Invalid YouTube URL");

    const fetchLink = async (format) => {
      const headers = {
        Origin: "https://ytmp3.mobi",
        Referer: "https://ytmp3.mobi/",
        "User-Agent": CHROME_UA,
      };

      const r1 = await CapacitorHttp.get({
        url: "https://a.ymcdn.org/api/v1/init?p=y&23=1llum1n471",
        headers,
      });
      if (!r1.data || r1.data.error) return null;

      const r2 = await CapacitorHttp.get({
        url: `${r1.data.convertURL}&v=${videoId}&f=${format}`,
        headers,
      });
      if (!r2.data || r2.data.error) return null;

      let progress = 0;
      let dlUrl = r2.data.downloadURL;
      const progUrl = r2.data.progressURL;

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
      if (dlUrl && dlUrl.startsWith("/")) dlUrl = "https://ytmp3.mobi" + dlUrl;
      return dlUrl;
    };

    const [mp4Url, mp3Url] = await Promise.all([
      fetchLink("mp4"),
      fetchLink("mp3"),
    ]);

    const downloads = [];
    if (mp4Url) downloads.push({ type: "MP4 VIDEO", url: mp4Url });
    if (mp3Url) downloads.push({ type: "MP3 AUDIO", url: mp3Url });

    if (downloads.length === 0)
      throw new Error("Failed to get download links. Try again.");

    // Fast info via oembed
    let title = "YouTube Video";
    let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    try {
      const oRes = await CapacitorHttp.get({
        url: `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      });
      if (oRes.data) {
        title = oRes.data.title;
        thumbnail = oRes.data.thumbnail_url;
      }
    } catch (e) {}

    return {
      status: true,
      result: { title, thumbnail, downloads, sourceUrl: url },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeTwitter(url) {
  let currentStatus = null;
  try {
    const twitterUrl = url.replace(
      /https:\/\/(fixupx|fxtwitter|vxtwitter|nitter|twitter)\.com/g,
      "https://x.com",
    );
    const r1 = await CapacitorHttp.get({
      url: "https://tweeload.com/en",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    currentStatus = r1.status;

    const parser = new DOMParser();

    const r2 = await CapacitorHttp.post({
      url: "https://tweeload.com/en/download",
      data: serializeData({ url: twitterUrl }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
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
          const label = quality ? quality + " VIDEO" : "VIDEO";
          const isMirror = downloads.some((d) => d.type.includes("VIDEO"));
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
            const isImage =
              href.includes("/image?") || text.toLowerCase().includes("image");
            const isVideo = !isImage;
            const label = isVideo
              ? text.includes("HD")
                ? "HD VIDEO"
                : "VIDEO"
              : "IMAGE";
            const isMirror =
              isVideo && downloads.some((d) => d.type.includes("VIDEO"));
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
    return {
      status: true,
      result: {
        title: name ? `${name} (${handle})` : "Twitter Content",
        thumbnail: null,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeSpotify(url) {
  let currentStatus = null;
  try {
    const r1 = await CapacitorHttp.get({
      url: "https://spotidown.app/",
      headers: { "User-Agent": "Mozilla/5.0" },
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

    const res = await CapacitorHttp.get({
      url: `https://www.pixiv.net/ajax/illust/${illustId}?lang=en`,
      headers: {
        "User-Agent": "Mozilla/5.0",
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

    const data = resData?.body;
    if (resData?.error || !data || !data.urls || !data.urls.original) {
      let maxValid = 1;

      const checkExists = async (page) => {
        try {
          const res = await CapacitorHttp.request({
            url: `https://pixiv.re/${illustId}-${page}.jpg`,
            method: "HEAD",
          });
          return res.status !== 404;
        } catch (e) {
          return false;
        }
      };

      if (await checkExists(1)) {
        let low = 1;
        let high = 200;
        while (low <= high) {
          let mid = Math.floor((low + high) / 2);
          if (await checkExists(mid)) {
            maxValid = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
      }

      const fallbackDownloads = [
        { type: "IMAGE / PAGE 1", url: `https://pixiv.re/${illustId}.jpg` },
      ];
      for (let i = 2; i <= maxValid; i++) {
        fallbackDownloads.push({
          type: `PAGE ${i}`,
          url: `https://pixiv.re/${illustId}-${i}.jpg`,
        });
      }
      let fallbackTitle = "Pixiv Artwork (Restricted / R-18)";
      try {
        const htmlRes = await CapacitorHttp.get({
          url: `https://www.pixiv.net/en/artworks/${illustId}`,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        if (htmlRes.data && typeof htmlRes.data === "string") {
          const match = htmlRes.data.match(
            /<meta\s+property="twitter:title"\s+content="([^"]+)"/i,
          );
          if (match && match[1]) {
            fallbackTitle = match[1]
              .replace(/&amp;/g, "&")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">");
          }
        }
      } catch (e) {
        console.warn("Could not fetch R-18 title", e);
      }

      return {
        status: true,
        result: {
          title: fallbackTitle,
          thumbnail: `https://pixiv.re/${illustId}.jpg`,
          downloads: fallbackDownloads,
          sourceUrl: url,
        },
      };
    }

    const pageCount = data.pageCount || 1;
    const isUgoira = data.illustType === 2;
    const downloads = [];

    if (isUgoira) {
      const ugoRes = await CapacitorHttp.get({
        url: `https://www.pixiv.net/ajax/illust/${illustId}/ugoira_meta?lang=en`,
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://www.pixiv.net/",
        },
      });
      let ugoDataRaw = ugoRes.data;
      if (typeof ugoDataRaw === "string") {
        try {
          ugoDataRaw = JSON.parse(ugoDataRaw);
        } catch (e) {}
      }
      const ugoData = ugoDataRaw?.body;
      if (ugoData && ugoData.originalSrc) {
        downloads.push({
          type: "UGOIRA (ZIP)",
          url: ugoData.originalSrc.replace("i.pximg.net", "i.pixiv.re"),
        });
      }
    } else {
      const originalUrl = data.urls.original;
      for (let i = 0; i < pageCount; i++) {
        let type = pageCount > 1 ? `PAGE ${i + 1}` : "IMAGE";
        let pageUrl = originalUrl.replace("_p0", `_p${i}`);
        pageUrl = pageUrl.replace("i.pximg.net", "i.pixiv.re");
        downloads.push({ type, url: pageUrl });
      }
    }

    if (downloads.length === 0) {
      throw new Error("No downloadable media found.");
    }

    const thumb =
      data.urls.regular?.replace("i.pximg.net", "i.pixiv.re") ||
      data.urls.original?.replace("i.pximg.net", "i.pixiv.re");

    return {
      status: true,
      result: {
        title: data.title
          ? `${data.title} by ${data.userName || "Unknown"}`
          : "Pixiv Artwork",
        thumbnail: thumb,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}
