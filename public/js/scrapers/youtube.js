import { CHROME_UA, CHROME_DESKTOP_UA } from "../utils/index.js";
import { scraperFetch, createScraperResult } from "./httpHelper.js";
import { t } from "../modules/core.js";

export let _ytSource = null;
export function setYouTubeSource(src) {
  _ytSource = src;
}

export async function scrapeYouTube(url) {
  let currentStatus = null;
  try {
    const videoMatch = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    );
    const playlistMatch = url.match(/[?&]list=([^"&?\/\s]+)/i);

    const videoId = videoMatch?.[1];
    const playlistId = playlistMatch?.[1];
    const isPlaylist = !!playlistId && (!videoId || url.includes("/playlist"));

    if (!videoId && !playlistId) throw new Error("Invalid YouTube URL");

    if (isPlaylist) {
      _ytSource = null;
      return await parseYouTubePlaylist(playlistId, url);
    }

    if (!_ytSource) return { requireSource: true };

    const oembed = async () => {
      let title = "YouTube Video";
      let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      try {
        const oData = await scraperFetch(
          {
            url: `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
          },
          "YouTube Oembed",
        );
        if (oData) {
          title = oData.title || title;
          thumbnail = oData.thumbnail_url || thumbnail;
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
          const convRes = await scraperFetch(
            {
              url: "https://hub.convert1s.com/api/download",
              method: "POST",
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
              rawResponse: true,
            },
            "ytmp3.gg Convert",
          );
          currentStatus = convRes.status;
          let conv = convRes.data;
          if (typeof conv === "string") {
            if (conv.trim().startsWith("<")) return null;
            conv = JSON.parse(conv);
          }
          if (!conv || conv.error || !conv.statusUrl) return null;
          let downloadUrl = null,
            attempts = 0;
          while (!downloadUrl && attempts < 30) {
            await new Promise((r) => setTimeout(r, 1500));
            const pollData = await scraperFetch(
              {
                url: conv.statusUrl,
                headers,
              },
              "ytmp3.gg Status",
            );
            attempts++;
            if (
              pollData &&
              pollData.status === "completed" &&
              pollData.downloadUrl
            ) {
              downloadUrl = pollData.downloadUrl;
              break;
            }
            if (
              pollData &&
              (pollData.status === "error" || pollData.status === "failed")
            )
              break;
          }
          return downloadUrl
            ? { url: downloadUrl, quality: conv.selectedQuality || quality }
            : null;
        } catch (e) {
          return null;
        }
      };

      const downloads = [];
      const tiers = ["720p", "360p"];

      // Run sequential requests to avoid convert1s concurrency limits
      for (const q of tiers) {
        const r = await runConvert("mp4", q);
        if (r && r.url) {
          downloads.push({ type: `MP4 ${r.quality || q}`, url: r.url });
        }
        await new Promise((res) => setTimeout(res, 300));
      }

      const mp3 = await runConvert("mp3", "");
      if (mp3 && mp3.url) {
        downloads.push({ type: "MP3", url: mp3.url });
      }

      if (downloads.length > 0) {
        _ytSource = null;
        return createScraperResult(true, {
          ...meta,
          downloads,
          sourceUrl: url,
        });
      }

      console.warn("[ytmp3.gg] Failed, falling back to ytmp3.mobi...");
      _ytSource = "mobi";
      return await scrapeYouTube(url);
    }

    if (_ytSource === "mobi") {
      const headers = {
        Origin: "https://ytmp3.mobi",
        Referer: "https://ytmp3.mobi/",
        "User-Agent": CHROME_UA,
      };
      const initData = await scraperFetch(
        {
          url: "https://a.ymcdn.org/api/v1/init?p=y&23=1llum1n471",
          headers,
        },
        "ytmp3.mobi Init",
      );
      if (!initData || initData.error) throw new Error("Init failed");
      const fetchSingle = async (format) => {
        const convData = await scraperFetch(
          {
            url: `${initData.convertURL}&v=${videoId}&f=${format}`,
            headers,
          },
          "ytmp3.mobi Convert",
        );
        if (!convData || convData.error) return null;
        let progress = 0,
          dlUrl = convData.downloadURL,
          progUrl = convData.progressURL;
        let attempts = 0;
        while (progress < 3 && attempts < 15) {
          await new Promise((r) => setTimeout(r, 2000));
          const progData = await scraperFetch(
            { url: progUrl, headers },
            "ytmp3.mobi Progress",
          );
          if (!progData || progData.error) break;
          progress = progData.progress;
          if (progData.downloadURL) dlUrl = progData.downloadURL;
          if (progress >= 3) break;
          attempts++;
        }
        if (dlUrl && progress >= 3) {
          if (dlUrl.startsWith("//")) dlUrl = "https:" + dlUrl;
          if (dlUrl.startsWith("/"))
            dlUrl = "https://ytmp3.mobi" + dlUrl;
          return dlUrl;
        }
        return null;
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
      return createScraperResult(true, { ...meta, downloads, sourceUrl: url });
    }

    throw new Error("Invalid source selected");
  } catch (err) {
    _ytSource = null;
    return createScraperResult(false, err.message, currentStatus);
  }
}

async function parseYouTubePlaylist(playlistId, sourceUrl) {
  const url = `https://www.youtube.com/playlist?list=${playlistId}`;
  const res = await scraperFetch(
    {
      url,
      headers: {
        "User-Agent": CHROME_DESKTOP_UA,
        "Accept-Language": "en-US,en;q=0.9",
        Cookie:
          "SOCS=CAESEwgDEgk2MTc4OTU0NzQaAmVuIAEaBgiA_LyaBg; CONSENT=PENDING+999",
      },
      rawResponse: true,
    },
    "YouTube Playlist",
  );

  const html =
    typeof res?.data === "string" ? res.data : JSON.stringify(res?.data || "");

  let data = null;
  const marker = "ytInitialData = ";
  const idx = html.indexOf(marker);
  if (idx !== -1) {
    const start = idx + marker.length;
    const scriptEnd = html.indexOf("</script>", start);
    if (scriptEnd !== -1) {
      let rawStr = html.substring(start, scriptEnd).trim();
      if (rawStr.endsWith(";")) rawStr = rawStr.slice(0, -1);
      try {
        data = JSON.parse(rawStr);
      } catch (_) {}
    }
  }

  if (!data) {
    const m =
      html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s) ||
      html.match(/var ytInitialData\s*=\s*({.+?});/s);
    if (m) {
      try {
        data = JSON.parse(m[1]);
      } catch (_) {}
    }
  }

  if (!data) {
    throw new Error(
      "Failed to extract YouTube playlist. The playlist might be private or unavailable.",
    );
  }

  if (data.alerts) {
    for (const alert of data.alerts) {
      const alertText =
        alert.alertRenderer?.text?.runs?.[0]?.text ||
        alert.alertRenderer?.text?.simpleText;
      if (alertText && alert.alertRenderer?.type === "ERROR") {
        throw new Error(`YouTube: ${alertText}`);
      }
    }
  }

  const primarySidebar =
    data.sidebar?.playlistSidebarRenderer?.items?.[0]
      ?.playlistSidebarPrimaryInfoRenderer;
  const secondarySidebar =
    data.sidebar?.playlistSidebarRenderer?.items?.[1]
      ?.playlistSidebarSecondaryInfoRenderer;

  const plTitle =
    (typeof data.metadata?.playlistMetadataRenderer?.title === "string"
      ? data.metadata?.playlistMetadataRenderer?.title
      : data.metadata?.playlistMetadataRenderer?.title?.runs?.[0]?.text) ||
    primarySidebar?.title?.runs?.[0]?.text ||
    primarySidebar?.title?.simpleText ||
    data.header?.playlistHeaderRenderer?.title?.simpleText ||
    data.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text ||
    "YouTube Playlist";

  const plAuthor =
    secondarySidebar?.videoOwner?.videoOwnerRenderer?.title?.runs?.[0]?.text ||
    secondarySidebar?.videoOwner?.videoOwnerRenderer?.title?.simpleText ||
    data.header?.playlistHeaderRenderer?.ownerText?.runs?.[0]?.text ||
    data.header?.playlistHeaderRenderer?.ownerText?.simpleText ||
    "";

  const plThumb =
    primarySidebar?.thumbnailRenderer?.playlistVideoThumbnailRenderer?.thumbnail
      ?.thumbnails?.slice(-1)[0]?.url ||
    data.header?.playlistHeaderRenderer?.playlistHeaderBanner
      ?.heroPlaylistThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]
      ?.url ||
    data.metadata?.playlistMetadataRenderer?.thumbnail?.thumbnails?.slice(
      -1,
    )[0]?.url ||
    "https://www.youtube.com/img/desktop/yt_1200.png";

  const tracks = [];
  const seen = new Set();

  function extractItems(obj) {
    if (!obj || typeof obj !== "object") return;
    if (obj.playlistVideoRenderer) {
      const pvr = obj.playlistVideoRenderer;
      const id = pvr.videoId;
      const title = pvr.title?.runs?.[0]?.text || pvr.title?.simpleText || "";
      const author = pvr.shortBylineText?.runs?.[0]?.text || "";
      const thumb =
        pvr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      if (id && title && !seen.has(id)) {
        seen.add(id);
        tracks.push({ id, title, author, thumb });
      }
      return;
    }
    if (obj.lockupViewModel) {
      const lvm = obj.lockupViewModel;
      const id =
        lvm.contentId ||
        lvm.rendererContext?.commandContext?.onTap?.innertubeCommand
          ?.watchEndpoint?.videoId;
      const title =
        lvm.metadata?.lockupMetadataViewModel?.title?.content || "";
      const author =
        lvm.metadata?.lockupMetadataViewModel?.metadata
          ?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]
          ?.text?.content || "";
      const thumb =
        lvm.contentImage?.thumbnailViewModel?.image?.sources?.slice(-1)[0]
          ?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      if (id && title && !seen.has(id)) {
        seen.add(id);
        tracks.push({ id, title, author, thumb });
      }
      return;
    }
    for (const key of Object.keys(obj)) {
      if (
        key !== "onTap" &&
        key !== "serviceTrackingParams" &&
        key !== "clickTrackingParams"
      ) {
        extractItems(obj[key]);
      }
    }
  }

  extractItems(data);

  if (tracks.length === 0) {
    throw new Error(
      "No playable tracks found in YouTube playlist. It may be private or empty.",
    );
  }

  const downloads = tracks.map((track, index) => {
    const prefix = `${(index + 1).toString().padStart(String(tracks.length).length, "0")}. `;
    const cleanTrackTitle = stripHtml(track.title);
    const cleanAuthor = stripHtml(track.author);
    const label = cleanAuthor
      ? `${cleanAuthor} - ${cleanTrackTitle}`
      : cleanTrackTitle;
    return {
      type: `${prefix}${label} [MP3]`,
      url: `youtube_resolve:${track.id}|||mp3|||128`,
      ext: "mp3",
    };
  });

  return createScraperResult(true, {
    title: plAuthor
      ? `${stripHtml(plAuthor)} - ${stripHtml(plTitle)} (Playlist)`
      : `${stripHtml(plTitle)} (Playlist)`,
    thumbnail: tracks[0]?.thumb || plThumb,
    downloads,
    sourceUrl,
  });
}

function stripHtml(s) {
  if (!s) return "";
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

