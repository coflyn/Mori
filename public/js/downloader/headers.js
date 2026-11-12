// headers.js — platform header builders & url sanitizers
import { getUserAgent } from "../utils/index.js";

/**
 * Normalizes and decodes wrapped download URLs (e.g. pindown.io file query params)
 */
export function cleanDownloadUrl(actualDownloadUrl) {
  if (
    actualDownloadUrl.includes("pindown.io") &&
    actualDownloadUrl.includes("file=")
  ) {
    try {
      const match = actualDownloadUrl.match(
        /file=(https?%3A%2F%2F[^&]+|https?:\/\/[^&]+)/i,
      );
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch (_) {}
  }
  return actualDownloadUrl;
}

/**
 * Builds appropriate Referer, Origin, and User-Agent headers for specific platforms
 */
export function buildDownloadHeaders(actualDownloadUrl, sourceUrl, url) {
  const isYtmp3GG =
    actualDownloadUrl.includes("ytmp3.gg") ||
    actualDownloadUrl.includes("convert1s.com") ||
    actualDownloadUrl.includes(".shop/") ||
    actualDownloadUrl.includes("lilillliiillliillii.shop");

  const isYtmp3Worker =
    actualDownloadUrl.includes("holy-breeze-fec5.workers.dev") ||
    actualDownloadUrl.includes("ytmp3.gl") ||
    actualDownloadUrl.includes("gammacloud.net");

  const isYoutube =
    isYtmp3GG ||
    isYtmp3Worker ||
    actualDownloadUrl.includes("ytmp3.mobi") ||
    actualDownloadUrl.includes("ytdown") ||
    actualDownloadUrl.includes("ymcdn.org") ||
    (url && (url.includes("youtube.com") || url.includes("youtu.be"))) ||
    (sourceUrl &&
      (sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be")));

  const isTwitter =
    actualDownloadUrl.includes("tweeload") ||
    actualDownloadUrl.includes("savetwt") ||
    actualDownloadUrl.includes("twimg.com") ||
    actualDownloadUrl.includes("acxcdn.com") ||
    (url &&
      (url.includes("twitter") || /(?:^|[/.])x\.com(?:[/?#:]|$)/i.test(url)));

  const downloadHeaders = {
    "User-Agent": getUserAgent(),
    "Accept-Encoding": "identity",
  };

  const isPixivDirect =
    actualDownloadUrl.includes("pixiv.net") ||
    actualDownloadUrl.includes("pximg.net") ||
    actualDownloadUrl.includes("pixiv.re");
  const isUgoiraCom = actualDownloadUrl.includes("ugoira");
  const isBilibili =
    actualDownloadUrl.includes("bilibili") ||
    actualDownloadUrl.includes("bilivideo") ||
    actualDownloadUrl.includes("bstarstatic") ||
    actualDownloadUrl.includes("akamaized.net") ||
    (url &&
      (url.includes("bilibili") ||
        url.includes("b23.tv") ||
        url.includes("bili.im")));

  const isPinterest =
    actualDownloadUrl.includes("pindown.io") ||
    actualDownloadUrl.includes("pinimg.com") ||
    (url && (url.includes("pinterest.com") || url.includes("pin.it"))) ||
    (sourceUrl &&
      (sourceUrl.includes("pinterest.com") || sourceUrl.includes("pin.it")));

  if (isYtmp3GG) {
    downloadHeaders["Referer"] = "https://media.ytmp3.gg/";
    downloadHeaders["Origin"] = "https://media.ytmp3.gg";
  } else if (isYtmp3Worker) {
    downloadHeaders["Referer"] = "https://ytmp3.gl/";
    downloadHeaders["Origin"] = "https://ytmp3.gl";
  } else if (isYoutube) {
    downloadHeaders["Referer"] = "https://ytmp3.mobi/";
    if (
      actualDownloadUrl.includes("ymcdn.org") ||
      actualDownloadUrl.includes("ytmp3.mobi")
    ) {
      downloadHeaders["Origin"] = "https://ytmp3.mobi";
    }
  }

  if (isPixivDirect) downloadHeaders["Referer"] = "https://www.pixiv.net/";
  if (isUgoiraCom) downloadHeaders["Referer"] = "https://ugoira.com/";

  if (isBilibili) {
    downloadHeaders["Referer"] =
      (sourceUrl || url || "").includes("bilibili.com") ||
      (sourceUrl || url || "").includes("b23.tv") ||
      actualDownloadUrl.includes("bilivideo.com")
        ? "https://www.bilibili.com/"
        : "https://www.bilibili.tv/";
  }

  if (isPinterest) {
    if (actualDownloadUrl.includes("pindown.io")) {
      downloadHeaders["Referer"] = "https://pindown.io/";
    } else {
      downloadHeaders["Referer"] = "https://www.pinterest.com/";
    }
  }

  if (isTwitter) {
    if (actualDownloadUrl.includes("twimg.com")) {
      downloadHeaders["Referer"] = "https://twitter.com/";
    } else if (actualDownloadUrl.includes("tweeload")) {
      downloadHeaders["Referer"] = "https://tweeload.com/";
    } else {
      downloadHeaders["Referer"] = "https://savetwt.com/";
    }
  }

  if (
    actualDownloadUrl.includes("spotidown") ||
    (url && url.includes("spotify"))
  ) {
    downloadHeaders["Referer"] = "https://spotidown.app/";
    downloadHeaders["Origin"] = "https://spotidown.app";
    downloadHeaders["Accept"] = "*/*";
  }

  if (
    actualDownloadUrl.includes("soundloaders") ||
    actualDownloadUrl.includes("spotimate")
  ) {
    downloadHeaders["Referer"] = "https://spotimate.app/";
    downloadHeaders["Origin"] = "https://spotimate.app";
    downloadHeaders["Accept"] = "*/*";
  }

  if (actualDownloadUrl.includes("aplmate")) {
    downloadHeaders["Referer"] = "https://aplmate.com/";
  }

  const isTikTok =
    actualDownloadUrl.includes("tiktokcdn.com") ||
    actualDownloadUrl.includes("tiktok.com") ||
    actualDownloadUrl.includes("byteoversea.com") ||
    actualDownloadUrl.includes("ibyteimg.com") ||
    actualDownloadUrl.includes("/video/tos/") ||
    (sourceUrl && sourceUrl.includes("tiktok")) ||
    (url && url.includes("tiktok"));

  if (isTikTok) {
    const referer =
      sourceUrl && sourceUrl.includes("tiktok.com")
        ? sourceUrl
        : "https://www.tiktok.com/";
    downloadHeaders["Referer"] = referer;
    downloadHeaders["Origin"] = "https://www.tiktok.com";
    downloadHeaders["Range"] = "bytes=0-";
  }

  const _R34_DOM = atob("cnVsZTM0Lnh4eA==");
  const isArtGallery =
    actualDownloadUrl.includes(_R34_DOM) ||
    (sourceUrl && sourceUrl.includes(_R34_DOM)) ||
    (url && url.includes(_R34_DOM));

  if (isArtGallery) {
    downloadHeaders["Referer"] = `https://${_R34_DOM}/`;
    downloadHeaders["Origin"] = `https://${_R34_DOM}`;
  }

  const _PH_DOM = atob("cG9ybmh1Yi5jb20=");
  const _PH_CDN = atob("cGhuY2RuLmNvbQ==");
  const isPVideo =
    actualDownloadUrl.includes(_PH_CDN) ||
    actualDownloadUrl.includes(_PH_DOM) ||
    (sourceUrl && sourceUrl.includes(_PH_DOM)) ||
    (url && url.includes(_PH_DOM));

  if (isPVideo) {
    downloadHeaders["Referer"] = "https://www." + _PH_DOM + "/";
    downloadHeaders["Origin"] = "https://www." + _PH_DOM;
  }

  // Universal Fallback: For sniffer & unlisted platforms, set Referer, Origin, Range, and Cookie
  if (!downloadHeaders["Referer"]) {
    try {
      const refTarget = sourceUrl || actualDownloadUrl;
      if (refTarget && (refTarget.startsWith("http://") || refTarget.startsWith("https://"))) {
        const parsed = new URL(refTarget);
        downloadHeaders["Referer"] = parsed.origin + "/";
        downloadHeaders["Origin"] = parsed.origin;
      }
    } catch (_) {}
  }

  if (!downloadHeaders["Range"]) {
    downloadHeaders["Range"] = "bytes=0-";
  }

  if (!downloadHeaders["Cookie"]) {
    try {
      const bridge =
        typeof window !== "undefined"
          ? window.MoriMainBridge || window.MoriShareBridge
          : null;
      if (bridge?.getCookiesForUrl) {
        const cookies =
          bridge.getCookiesForUrl(actualDownloadUrl) ||
          (sourceUrl ? bridge.getCookiesForUrl(sourceUrl) : "");
        if (cookies) downloadHeaders["Cookie"] = cookies;
      }
    } catch (_) {}
  }

  return downloadHeaders;
}
