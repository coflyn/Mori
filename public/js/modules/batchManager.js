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
  scrapeReddit,
  scrapeTeraBox,
} from "../scrapers/index.js";

import { t } from "../i18n/index.js";
import { cleanUrl } from "../utils/index.js";
import { firstHttpUrl, parseShareText } from "../utils/shareLink.js";

/**
 * Extracts and sanitizes valid HTTP/HTTPS URLs from raw batch text input.
 * Accepts text separated by newlines, spaces, or commas.
 * @param {string} rawText
 * @returns {string[]} Array of unique, valid URLs
 */
function shareKeptMessage(share) {
  const code = share.password
    ? t("toast-share-code", { code: share.password })
    : "";
  return t("toast-share-kept", {
    platform: t(`share-platform-${share.platform}`),
    code,
  });
}

export function extractBatchUrls(rawText) {
  if (!rawText || typeof rawText !== "string") return [];

  const urlRegex = /https?:\/\/[^\s,]+/gi;
  const found = [];
  let match;
  while ((match = urlRegex.exec(rawText))) {
    found.push({ index: match.index, length: match[0].length });
  }

  const validUrls = [];
  for (let i = 0; i < found.length; i++) {
    const previousEnd =
      i === 0 ? 0 : found[i - 1].index + found[i - 1].length;
    const start = Math.max(previousEnd, found[i].index - 60);
    const end = i + 1 < found.length ? found[i + 1].index : rawText.length;
    const slice = rawText.slice(start, end);
    try {
      const share = parseShareText(slice);
      let cleaned = share ? share.url : cleanUrl(firstHttpUrl(slice));
      if (!cleaned) continue;
      if (cleaned.startsWith("http://")) {
        cleaned = "https://" + cleaned.slice("http://".length);
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
    const share = parseShareText(url);
    if (share) {
      return { status: false, message: shareKeptMessage(share) };
    }

    if (
      url.includes("tiktok.com") ||
      url.includes("vt.tiktok.com") ||
      url.includes("vm.tiktok.com") ||
      url.includes("tt.site")
    ) {
      setTikTokSource(isServer2 ? "tikdownloader" : "tiktokio");
      data = await scrapeTikTok(url);
      if (!data || !data.status) {
        // Silent fallback
        setTikTokSource(isServer2 ? "tiktokio" : "tikdownloader");
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
      const videoMatch = url.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
      );
      const isPlaylist =
        url.includes("list=") && (!videoMatch?.[1] || url.includes("/playlist"));
      const targetYouTubeUrl =
        !isPlaylist && videoMatch?.[1]
          ? `https://www.youtube.com/watch?v=${videoMatch[1]}`
          : url;

      setYouTubeSource(isServer2 ? "mobi" : "gg");
      data = await scrapeYouTube(targetYouTubeUrl);
      if (!data || !data.status) {
        setYouTubeSource(isServer2 ? "gg" : "mobi");
        data = await scrapeYouTube(targetYouTubeUrl);
      }
    } else if (
      url.includes("twitter.com") ||
      /(?:^|[/.])x\.com(?:[/?#:]|$)/i.test(url) ||
      url.includes("fxtwitter.com") ||
      url.includes("vxtwitter.com")
    ) {
      setTwitterSource(isServer2 ? "savetwt" : "tvd");
      data = await scrapeTwitter(url);
      if (!data || !data.status) {
        setTwitterSource(isServer2 ? "tvd" : "savetwt");
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
    } else if (url.includes("reddit.com") || url.includes("redd.it")) {
      data = await scrapeReddit(url);
    } else if (
      url.includes("terabox") ||
      url.includes("1024tera") ||
      url.includes("nephobox") ||
      url.includes("4funbox") ||
      url.includes("mirrobox") ||
      url.includes("momerybox") ||
      url.includes("tibibox")
    ) {
      data = await scrapeTeraBox(url);
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
