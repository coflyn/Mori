import { CHROME_UA } from "../utils/index.js";
import { getCleanUrl } from "../utils/urlUtils.js";
import { scraperFetch, createScraperResult } from "./httpHelper.js";

export async function scrapeBilibili(url) {
  try {
    let cleanUrl = getCleanUrl(url);

    // Resolve redirection if it's a short URL (b23.tv or bili.im)
    if (cleanUrl.includes("b23.tv") || cleanUrl.includes("bili.im")) {
      try {
        const redirectRes = await scraperFetch(
          {
            url: cleanUrl,
            headers: {
              "User-Agent": "Bilibili/1.0",
            },
            rawResponse: true,
          },
          "Bilibili Redirect",
        );
        if (
          redirectRes?.url &&
          redirectRes.url !== cleanUrl &&
          !redirectRes.url.includes("b23.tv")
        ) {
          cleanUrl = redirectRes.url;
        } else if (
          redirectRes?.headers?.location ||
          redirectRes?.headers?.Location
        ) {
          cleanUrl =
            redirectRes.headers.location || redirectRes.headers.Location;
        } else if (redirectRes?.data && typeof redirectRes.data === "string") {
          const hrefMatch =
            redirectRes.data.match(/href="([^"]+)"/i) ||
            redirectRes.data.match(
              /https?:\/\/[a-zA-Z0-9.-]*bilibili\.com\/video\/[^\s"'<>]+/i,
            );
          if (hrefMatch) {
            cleanUrl = hrefMatch[1].replace(/&amp;/g, "&");
          }
        }
      } catch (e) {
        console.error("Bilibili redirect resolve failed:", e);
      }
    }

    if (cleanUrl.includes("bilibili.tv")) {
      try {
        const u = new URL(cleanUrl);
        cleanUrl = u.origin + u.pathname;
      } catch (e) {}

      try {
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
            apiInfo = { tipo: "anime", id: null, seasonId: numericParts[0] };
          }
        }

        if (!apiInfo) {
          throw new Error("Could not parse Bilibili.tv video or episode ID.");
        }

        let html = "";
        try {
          html = await scraperFetch(
            {
              url: cleanUrl,
              parseJson: false,
            },
            "Bilibili Metadata",
          );
          html = typeof html === "string" ? html : "";
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) title = titleMatch[1].trim();

          const imageMatch =
            html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
            html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
          if (imageMatch) thumbnail = imageMatch[1];
        } catch (err) {
          console.error("Failed to fetch Bilibili.tv page metadata:", err);
        }

        if (apiInfo.tipo === "anime" && !apiInfo.id && apiInfo.seasonId) {
          try {
            const epData = await scraperFetch(
              {
                url: `https://api.bilibili.tv/intl/gateway/web/v2/ogv/play/episodes?season_id=${apiInfo.seasonId}&platform=web&s_locale=en_US`,
              },
              "Bilibili Episodes",
            );
            if (epData && epData.data && epData.data.sections) {
              for (const sec of epData.data.sections) {
                if (sec.episodes && sec.episodes.length > 0) {
                  const firstEp = sec.episodes[0];
                  apiInfo.id =
                    firstEp.episode_id || firstEp.ep_id || firstEp.id;
                  if (firstEp.title_display && title === "Bilibili.tv Video") {
                    title = firstEp.title_display;
                  }
                  if (firstEp.cover && !thumbnail) {
                    thumbnail = firstEp.cover;
                  }
                  break;
                }
              }
            }
          } catch (e) {
            console.error("Failed to resolve season episodes:", e);
          }
          if (!apiInfo.id && html) {
            const epMatch =
              html.match(/"episode_id"\s*:\s*"(\d+)"/) ||
              html.match(/"episode_id"\s*:\s*(\d+)/) ||
              html.match(/"ep_id"\s*:\s*(\d+)/);
            if (epMatch) apiInfo.id = epMatch[1];
          }
        }

        const downloads = [];

        if (apiInfo.tipo === "anime" && (apiInfo.id || apiInfo.seasonId)) {
          try {
            const param = apiInfo.id
              ? `ep_id=${apiInfo.id}`
              : `season_id=${apiInfo.seasonId}`;
            const v2Data = await scraperFetch(
              {
                url: `https://api.bilibili.tv/intl/gateway/v2/ogv/playurl?${param}&platform=web&s_locale=en_US`,
              },
              "Bilibili OGV v2",
            );
            if (v2Data && v2Data.data && v2Data.data.video_info) {
              const streamList = v2Data.data.video_info.stream_list || [];
              streamList.forEach((s) => {
                const playUrl =
                  s.url ||
                  s.url_list?.[0]?.url ||
                  s.dash_video?.base_url ||
                  s.dash_video?.backup_url?.[0];
                if (playUrl) {
                  let secureUrl = playUrl;
                  if (secureUrl.startsWith("http://")) {
                    secureUrl = secureUrl.replace("http://", "https://");
                  }
                  const quality =
                    s.stream_info?.display_desc ||
                    s.stream_info?.description ||
                    s.desc_words ||
                    (s.quality ? `${s.quality}p` : "720p");
                  downloads.push({
                    url: secureUrl,
                    type: quality,
                    headers: {
                      Referer: "https://www.bilibili.tv/",
                    },
                  });
                }
              });

              const dash = v2Data.data.video_info.dash;
              if (dash) {
                if (dash.video && downloads.length === 0) {
                  dash.video.forEach((v) => {
                    let vUrl = v.base_url || v.backup_url?.[0];
                    if (vUrl) {
                      if (vUrl.startsWith("http://")) {
                        vUrl = vUrl.replace("http://", "https://");
                      }
                      downloads.push({
                        url: vUrl,
                        type: `${v.id || 360}p`,
                        headers: {
                          Referer: "https://www.bilibili.tv/",
                        },
                      });
                    }
                  });
                }
                if (dash.audio) {
                  dash.audio.forEach((a) => {
                    let aUrl = a.base_url || a.backup_url?.[0];
                    if (aUrl) {
                      if (aUrl.startsWith("http://")) {
                        aUrl = aUrl.replace("http://", "https://");
                      }
                      downloads.push({
                        url: aUrl,
                        type: "MP3",
                        headers: {
                          Referer: "https://www.bilibili.tv/",
                        },
                      });
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.error("OGV v2 API failed:", e);
          }
        }

        if (downloads.length === 0 && apiInfo.id) {
          try {
            const playData = await scraperFetch(
              {
                url: `https://api.bilibili.tv/intl/gateway/web/v2/playurl?aid=${apiInfo.id}&platform=web&s_locale=en_US`,
              },
              "Bilibili PlayURL",
            );
            if (playData && playData.data && playData.data.playurl) {
              const videoList =
                playData.data.playurl.video || playData.data.playurl.durl || [];
              videoList.forEach((v) => {
                let vUrl = v.url || v.base_url;
                if (vUrl) {
                  if (vUrl.startsWith("http://")) {
                    vUrl = vUrl.replace("http://", "https://");
                  }
                  downloads.push({
                    url: vUrl,
                    type: v.quality ? `${v.quality}p` : "720p",
                    headers: {
                      Referer: "https://www.bilibili.tv/",
                    },
                  });
                }
              });
            }
          } catch (e) {
            console.error("Fallback v2 PlayURL failed:", e);
          }
        }

        if (downloads.length > 0) {
          return createScraperResult(true, {
            title,
            thumbnail,
            downloads,
            sourceUrl: url,
          });
        }
      } catch (e) {
        console.error("Bilibili.tv parse error:", e);
      }
    }

    // Mainland Bilibili (bilibili.com / b23.tv / BV / AV IDs)
    const bvMatch = cleanUrl.match(/(BV[a-zA-Z0-9]+)/i);
    const bvid = bvMatch ? bvMatch[1] : null;
    const avMatch = cleanUrl.match(/(?:video\/av|[?&]aid=)(\d+)/i);
    const aid = avMatch ? avMatch[1] : null;

    if (!bvid && !aid) {
      throw new Error("Could not extract Bilibili video ID (BV/AV).");
    }

    const viewUrl = bvid
      ? `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`
      : `https://api.bilibili.com/x/web-interface/view?aid=${aid}`;

    const bilibiliHeaders = {
      Referer: "https://www.bilibili.com/",
      "User-Agent": "Bilibili/1.0",
    };

    const viewRes = await scraperFetch(
      {
        url: viewUrl,
        headers: {
          "User-Agent": "Bilibili/1.0",
        },
      },
      "Bilibili View Info",
    );

    if (!viewRes || viewRes.code !== 0 || !viewRes.data) {
      throw new Error(viewRes?.message || "Failed to fetch Bilibili video info.");
    }

    const vData = viewRes.data;
    let title = vData.title || "Bilibili Video";
    let thumbnail = vData.pic || null;
    if (thumbnail && thumbnail.startsWith("http://")) {
      thumbnail = thumbnail.replace("http://", "https://");
    }
    const author = vData.owner?.name || "Bilibili Creator";
    const actualBvid = vData.bvid || bvid;

    // Detect target part/page if multiple pages exist
    let targetPage = 1;
    try {
      const u = new URL(cleanUrl);
      const pParam = u.searchParams.get("p");
      if (pParam && /^\d+$/.test(pParam)) {
        targetPage = parseInt(pParam, 10);
      }
    } catch (_) {}

    let cid = vData.cid;
    if (vData.pages && vData.pages.length > 0) {
      const pageObj =
        vData.pages.find((p) => p.page === targetPage) || vData.pages[0];
      if (pageObj) {
        cid = pageObj.cid || cid;
        if (vData.pages.length > 1 && pageObj.part) {
          title = `${title} - P${pageObj.page} ${pageObj.part}`;
        }
      }
    }

    if (!cid) {
      throw new Error("Could not determine Bilibili video stream CID.");
    }

    const downloads = [];

    // Query 720p HD (qn=64, fnval=1)
    const playRes720 = await scraperFetch(
      {
        url: `https://api.bilibili.com/x/player/playurl?bvid=${actualBvid}&cid=${cid}&qn=64&fnval=1`,
        headers: {
          "User-Agent": "Bilibili/1.0",
        },
      },
      "Bilibili PlayURL 720p",
    );

    let acceptQualities = [];
    if (playRes720?.code === 0 && playRes720?.data?.durl?.[0]?.url) {
      const qCode = playRes720.data.quality;
      const descList = playRes720.data.accept_description || [];
      const qList = playRes720.data.accept_quality || [];
      acceptQualities = qList;
      const idx = qList.indexOf(qCode);
      const qLabel =
        idx !== -1 && descList[idx]
          ? descList[idx]
          : qCode === 64
            ? "720P HD"
            : "Video";

      downloads.push({
        url: playRes720.data.durl[0].url,
        type: `${qLabel} [MP4]`,
        headers: bilibiliHeaders,
      });
    }

    // Query 360p SD (qn=16, fnval=1) as a lighter alternative if available
    if (
      acceptQualities.includes(16) &&
      !downloads.some((d) => (d.type || "").includes("360P"))
    ) {
      try {
        const playRes360 = await scraperFetch(
          {
            url: `https://api.bilibili.com/x/player/playurl?bvid=${actualBvid}&cid=${cid}&qn=16&fnval=1`,
            headers: {
              "User-Agent": "Bilibili/1.0",
            },
          },
          "Bilibili PlayURL 360p",
        );
        if (playRes360?.code === 0 && playRes360?.data?.durl?.[0]?.url) {
          downloads.push({
            url: playRes360.data.durl[0].url,
            type: "360P SD [MP4]",
            headers: bilibiliHeaders,
          });
        }
      } catch (_) {}
    }

    if (downloads.length === 0) {
      throw new Error("No playable Bilibili video streams found.");
    }

    return createScraperResult(true, {
      title,
      thumbnail,
      author,
      downloads,
      sourceUrl: url,
    });
  } catch (e) {
    return createScraperResult(false, e.message);
  }
}
