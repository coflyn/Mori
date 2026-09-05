import {
  scrapeRedNote,
  scrapeDouyin,
  scrapeBilibili,
  scrapeThreads,
  scrapeTikTok,
  setTikTokSource,
  scrapeInstagram,
  setInstagramSource,
  scrapeYouTube,
  setYouTubeSource,
  scrapeTwitter,
  setTwitterSource,
  scrapeSpotify,
  setSpotifySource,
  scrapePinterest,
  scrapeAppleMusic,
  scrapeFacebook,
  scrapeBandcamp,
  scrapePixiv,
} from "../scrapers/index.js";

import { cleanUrl } from "../utils/index.js";

/**
 * Extracts and sanitizes valid HTTP/HTTPS URLs from raw batch text input.
 * Accepts text separated by newlines, spaces, or commas.
 * @param {string} rawText
 * @returns {string[]} Array of unique, valid URLs
 */
export function extractBatchUrls(rawText) {
  if (!rawText || typeof rawText !== "string") return [];

  const urlRegex = /(https?:\/\/[^\s,]+)/gi;
  const matches = rawText.match(urlRegex) || [];
  const validUrls = [];

  for (let rawUrl of matches) {
    try {
      let cleaned = cleanUrl(rawUrl.trim());
      if (cleaned.startsWith("http://")) {
        cleaned = cleaned.replace("http://", "https://");
      }
      if (!validUrls.includes(cleaned)) {
        validUrls.push(cleaned);
      }
    } catch (e) {}
  }

  return validUrls;
}

/**
 * Analyzes a single URL silently using preset server preference and silent retry fallback.
 * Bypasses all interactive modal prompts.
 * @param {string} url
 * @param {string} preferServer - "server1", "server2", or "auto"
 * @returns {Promise<Object>} Scraper result
 */
export async function analyzeUrlSilent(url, preferServer = "auto") {
  // Check if URL is a Playlist or Album link -> Skip in Batch Mode
  const isPlaylistOrAlbumUrl = (() => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const parsed = new URL(url.includes("youtu.be") ? "https://" + url : url);
      return (
        parsed.hostname.includes("youtube.com") &&
        parsed.pathname.startsWith("/playlist") &&
        (parsed.searchParams.has("list") || parsed.pathname !== "/playlist/")
      );
    }
    return (
      url.includes("/playlist/") ||
      url.includes("/playlist?") ||
      url.includes("/album/")
    );
  })();

  if (isPlaylistOrAlbumUrl) {
    return {
      status: false,
      isPlaylist: true,
      message: "Playlist and Album links are skipped in Batch Mode.",
    };
  }

  const isServer2 = preferServer === "server2";

  try {
    let data = null;

    if (
      url.includes("tiktok.com") ||
      url.includes("vt.tiktok.com") ||
      url.includes("vm.tiktok.com")
    ) {
      setTikTokSource(isServer2 ? "snaptik" : "tiktokio");
      data = await scrapeTikTok(url);
      if (!data || !data.status) {
        // Silent fallback
        setTikTokSource(isServer2 ? "tiktokio" : "snaptik");
        data = await scrapeTikTok(url);
      }
    } else if (
      url.includes("instagram.com") ||
      url.includes("instagr.am") ||
      url.includes("ddinstagram.com")
    ) {
      setInstagramSource(isServer2 ? "savevid" : "indown");
      data = await scrapeInstagram(url);
      if (!data || !data.status) {
        setInstagramSource(isServer2 ? "indown" : "savevid");
        data = await scrapeInstagram(url);
      }
    } else if (
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.includes("music.youtube.com")
    ) {
      setYouTubeSource(isServer2 ? "mobi" : "gg");
      data = await scrapeYouTube(url);
      if (!data || !data.status) {
        setYouTubeSource(isServer2 ? "gg" : "mobi");
        data = await scrapeYouTube(url);
      }
    } else if (
      url.includes("twitter.com") ||
      url.includes("x.com") ||
      url.includes("fxtwitter.com") ||
      url.includes("vxtwitter.com")
    ) {
      setTwitterSource(isServer2 ? "tweeload" : "tvd");
      data = await scrapeTwitter(url);
      if (!data || !data.status) {
        setTwitterSource(isServer2 ? "tvd" : "tweeload");
        data = await scrapeTwitter(url);
      }
    } else if (url.includes("spotify.com")) {
      setSpotifySource(isServer2 ? "soundloaders" : "spotidown");
      data = await scrapeSpotify(url);
      if (!data || !data.status) {
        setSpotifySource(isServer2 ? "spotidown" : "soundloaders");
        data = await scrapeSpotify(url);
      }
    } else if (url.includes("pinterest.com") || url.includes("pin.it")) {
      data = await scrapePinterest(url);
    } else if (url.includes("music.apple.com")) {
      data = await scrapeAppleMusic(url);
    } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
      data = await scrapeFacebook(url);
    } else if (
      url.includes("xiaohongshu.com") ||
      url.includes("rednote.com") ||
      url.includes("xhslink.com") ||
      url.includes("xhslink.cn")
    ) {
      data = await scrapeRedNote(url);
    } else if (url.includes("douyin.com")) {
      data = await scrapeDouyin(url);
    } else if (
      url.includes("bilibili.com") ||
      url.includes("b23.tv") ||
      url.includes("bili.im") ||
      url.includes("bilibili.tv")
    ) {
      data = await scrapeBilibili(url);
    } else if (url.includes("threads.net") || url.includes("threads.com")) {
      data = await scrapeThreads(url);
    } else if (url.includes("bandcamp.com")) {
      data = await scrapeBandcamp(url);
    } else if (url.includes("pixiv.net")) {
      data = await scrapePixiv(url);
    } else {
      data = { status: false, message: "URL not supported yet." };
    }

    if (data && data.status && data.result) {
      const title = data.result.title || "";
      if (title.includes("(Playlist)") || title.includes("(Album)")) {
        return {
          status: false,
          isPlaylist: true,
          message: "Playlist and Album links are skipped in Batch Mode.",
        };
      }
    }

    return data;
  } catch (err) {
    return { status: false, message: err.message || "Scraping failed." };
  }
}
