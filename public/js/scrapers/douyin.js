import { getCleanUrl } from "../utils/urlUtils.js";
import { scraperFetch, createScraperResult } from "./httpHelper.js";

function extractDouyinItemId(text) {
  if (!text || typeof text !== "string") return null;
  const match =
    text.match(/(?:video|note|share\/video)\/(\d{15,22})/i) ||
    text.match(/modal_id=(\d{15,22})/i) ||
    text.match(/group_id=(\d{15,22})/i) ||
    text.match(/aweme_id=(\d{15,22})/i) ||
    text.match(/\/(\d{18,20})\b/);
  return match ? match[1] : null;
}

function parseJSObject(slice) {
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
  if (endIdx !== -1) {
    try {
      return JSON.parse(slice.substring(0, endIdx));
    } catch (e) {}
  }
  return null;
}

function extractRouterOrSSRData(htmlStr) {
  if (!htmlStr || typeof htmlStr !== "string") return null;

  const markers = [
    "window._ROUTER_DATA =",
    "window._SSR_DATA =",
    "window._RENDER_DATA =",
    "window.__INIT_PROPS__ =",
    "window.SSR_HYDRATED_DATA =",
  ];

  for (const marker of markers) {
    const startIdx = htmlStr.indexOf(marker);
    if (startIdx === -1) continue;

    let slice = htmlStr.substring(startIdx + marker.length).trim();
    if (slice.startsWith('"') && slice.includes("%7B")) {
      try {
        const matchStr = slice.match(/^"([^"]+)"/);
        if (matchStr) {
          slice = decodeURIComponent(matchStr[1]);
        }
      } catch (e) {}
    } else if (slice.startsWith("%7B")) {
      try {
        slice = decodeURIComponent(slice);
      } catch (e) {}
    }

    const data = parseJSObject(slice);
    if (data) return data;
  }
  return null;
}

async function fetchDouyinApi(itemId) {
  try {
    const apiRes = await scraperFetch(
      {
        url: `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${itemId}`,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
          Accept: "application/json",
        },
        parseJson: true,
      },
      "Douyin API",
    );
    if (apiRes && apiRes.item_list && apiRes.item_list.length > 0) {
      return apiRes.item_list[0];
    }
  } catch (e) {
    console.warn("Douyin API fetch error:", e);
  }
  return null;
}

function getItemFromData(data) {
  if (!data) return null;

  // Check routerData -> loaderData -> videoInfoRes -> item_list
  const loaderData = data.loaderData || {};
  for (const key in loaderData) {
    if (loaderData[key] && loaderData[key].videoInfoRes) {
      const itemList = loaderData[key].videoInfoRes.item_list;
      if (itemList && itemList.length > 0) return itemList[0];
    }
  }

  // Check aweme -> detail / item_list
  if (data.aweme && data.aweme.detail) return data.aweme.detail;
  if (data.item_list && data.item_list.length > 0) return data.item_list[0];
  if (data.aweme_detail) return data.aweme_detail;

  return null;
}

function buildResultFromItem(item, sourceUrl) {
  const title = item.desc || item.share_info?.share_desc || "Douyin Content";
  const author = item.author ? item.author.nickname : "Douyin User";
  const downloads = [];

  if (item.images && item.images.length > 0) {
    item.images.forEach((img) => {
      const imgUrl = img.url_list?.[0] || img.download_url_list?.[0];
      if (imgUrl) {
        downloads.push({
          type: "PHOTO",
          url: imgUrl.replace(/^http:/, "https:"),
          isMirror: false,
        });
      }
    });
  } else {
    let watermarkUrl =
      item.video?.play_addr?.url_list?.[0] ||
      item.video?.download_addr?.url_list?.[0] ||
      null;

    if (!watermarkUrl) throw new Error("No video URL found.");
    watermarkUrl = watermarkUrl
      .replace(/^http:/, "https:")
      .replace("playwm", "play");

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

  return createScraperResult(true, {
    title,
    author,
    thumbnail:
      item.video?.cover?.url_list?.[0] ||
      item.images?.[0]?.url_list?.[0] ||
      null,
    downloads,
    sourceUrl,
  });
}

export async function scrapeDouyin(url) {
  try {
    if (!url || typeof url !== "string") throw new Error("Invalid URL.");
    const clean = getCleanUrl(url);

    let itemId = extractDouyinItemId(clean);

    // If clean URL directly has itemId, try API first
    if (itemId) {
      const apiItem = await fetchDouyinApi(itemId);
      if (apiItem) return buildResultFromItem(apiItem, url);
    }

    // Otherwise fetch HTML
    const mobileUA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";
    let htmlStr = "";
    try {
      const html = await scraperFetch(
        {
          url: clean,
          headers: {
            "User-Agent": mobileUA,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          },
          parseJson: false,
        },
        "Douyin",
      );
      htmlStr = typeof html === "string" ? html : "";
    } catch (e) {
      console.warn("Douyin initial HTML fetch failed:", e.message);
    }

    // Try extracting itemId from fetched HTML if not found before
    if (!itemId && htmlStr) {
      itemId = extractDouyinItemId(htmlStr);
      if (itemId) {
        const apiItem = await fetchDouyinApi(itemId);
        if (apiItem) return buildResultFromItem(apiItem, url);
      }
    }

    // Try parsing embedded router / SSR data
    const parsedData = extractRouterOrSSRData(htmlStr);
    let item = getItemFromData(parsedData);

    // If still no item, try fallback desktop UA fetch
    if (!item) {
      const desktopUA =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const fallbackHtml = await scraperFetch(
        {
          url: clean,
          headers: {
            "User-Agent": desktopUA,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          },
          parseJson: false,
        },
        "Douyin Fallback",
      );
      const fallbackHtmlStr =
        typeof fallbackHtml === "string" ? fallbackHtml : "";
      if (!itemId) itemId = extractDouyinItemId(fallbackHtmlStr);
      if (itemId) {
        const apiItem = await fetchDouyinApi(itemId);
        if (apiItem) return buildResultFromItem(apiItem, url);
      }
      const fallbackData = extractRouterOrSSRData(fallbackHtmlStr);
      item = getItemFromData(fallbackData);
    }

    if (!item) {
      throw new Error("Could not find video data in Douyin page.");
    }

    return buildResultFromItem(item, url);
  } catch (e) {
    return createScraperResult(false, e.message);
  }
}
