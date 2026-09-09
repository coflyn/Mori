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
    actualDownloadUrl.includes("lilillliiillliillii.shop");

  const isYoutube =
    isYtmp3GG ||
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
    (url && (url.includes("twitter") || url.includes("x.com")));

  const downloadHeaders = {
    "User-Agent": getUserAgent(),
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

  if (actualDownloadUrl.includes("soundloaders")) {
    downloadHeaders["Referer"] = "https://soundloaders.app/";
    downloadHeaders["Origin"] = "https://soundloaders.app";
    downloadHeaders["Accept"] = "*/*";
  }

  if (actualDownloadUrl.includes("aplmate")) {
    downloadHeaders["Referer"] = "https://aplmate.com/";
  }

  return downloadHeaders;
}
