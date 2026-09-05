import { getCleanUrl } from "../utils/urlUtils.js";
import { CHROME_DESKTOP_UA, CHROME_MOBILE_UA } from "../utils/index.js";
import { scraperFetch, createScraperResult } from "./httpHelper.js";

export async function scrapeRedNote(url) {
  try {
    const urlMatch = url.match(/https?:\/\/[^\s]+/i);
    let cleanUrl = getCleanUrl(urlMatch ? urlMatch[0] : url);

    // Helper function to validate if title or image belongs to landing/error page
    const isLandingOrErrorPage = (title, imgUrl) => {
      const invalidTitles = [
        "你的生活兴趣社区",
        "你访问的页面不见了",
        "页面不见了",
        "404 Not Found",
        "Page Not Found",
      ];
      if (title && invalidTitles.some((t) => title.includes(t))) return true;
      if (
        imgUrl &&
        (imgUrl.includes("e6214e4fbfae2cf14d634d4296916e8a5eaefdf4") ||
          imgUrl.includes("fe-platform"))
      )
        return true;
      return false;
    };

    // Helper function to find note data object across mobile & desktop SSR state trees
    const findNoteObjectFromState = (state) => {
      if (!state) return null;

      if (state.noteData?.data?.noteData) {
        const nd = state.noteData.data.noteData;
        if (nd.title || nd.desc || nd.imageList || nd.video) {
          return nd;
        }
      }

      if (state.note?.noteDetailMap) {
        const map = state.note.noteDetailMap;
        const keys = Object.keys(map);
        for (const k of keys) {
          const item = map[k];
          const nd = item?.note || item;
          if (
            nd &&
            !Array.isArray(nd) &&
            (nd.title || nd.desc || nd.imageList || nd.video)
          ) {
            return nd;
          }
        }
      }

      const altCandidates = [
        state.noteData?.note,
        state.noteData,
        state.note?.firstNote,
        state.feed?.note,
        state.firstNote,
      ];

      for (const cand of altCandidates) {
        if (
          cand &&
          !Array.isArray(cand) &&
          (cand.title || cand.desc || cand.imageList || cand.video)
        ) {
          return cand;
        }
      }

      return null;
    };

    // Helper function to parse state JSON or OpenGraph meta tags and extract media
    const extractMediaFromHtml = (htmlContent) => {
      const htmlStr = typeof htmlContent === "string" ? htmlContent : "";

      const matchState =
        htmlStr.match(
          /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\});?<\/script>/,
        ) ||
        htmlStr.match(
          /window\.__INITIAL_DATA__\s*=\s*(\{[\s\S]+?\});?<\/script>/,
        ) ||
        htmlStr.match(/__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\});?<\/script>/) ||
        htmlStr.match(
          /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]+?\});?<\/script>/,
        );

      if (matchState) {
        try {
          const rawJson = matchState[1]
            .replace(/;\s*$/, "")
            .replace(/:\s*undefined/g, ":null");
          const state = JSON.parse(rawJson);
          const noteData = findNoteObjectFromState(state);

          if (noteData) {
            const title = noteData.title || noteData.desc || "RedNote Post";
            const author =
              noteData.user?.nickname ||
              noteData.user?.nickName ||
              "RedNote Creator";
            let thumbnail = null;
            const downloads = [];

            if (noteData.imageList && noteData.imageList.length > 0) {
              const firstImg =
                noteData.imageList[0].urlDefault ||
                noteData.imageList[0].urlOriginal ||
                noteData.imageList[0].url;
              if (firstImg) {
                thumbnail = firstImg.startsWith("//")
                  ? `https:${firstImg}`
                  : firstImg;
              }
            }

            // Check landing/error page
            if (!isLandingOrErrorPage(title, thumbnail)) {
              // Video post
              if (noteData.video && noteData.video.media) {
                const streamObj = noteData.video.media.stream || {};
                let videoUrl = null;
                const codecs = ["h264", "h265", "h266", "av1"];

                for (const c of codecs) {
                  if (Array.isArray(streamObj[c]) && streamObj[c].length > 0) {
                    const firstStream = streamObj[c][0];
                    videoUrl =
                      firstStream.masterUrl ||
                      firstStream.backupUrls?.[0] ||
                      firstStream.url;
                    if (videoUrl) break;
                  }
                }

                if (!videoUrl && noteData.video.media.video) {
                  videoUrl = noteData.video.media.video.masterUrl;
                }

                if (videoUrl) {
                  let secureUrl = videoUrl.startsWith("//")
                    ? `https:${videoUrl}`
                    : videoUrl;
                  if (secureUrl.startsWith("http://")) {
                    secureUrl = secureUrl.replace("http://", "https://");
                  }
                  downloads.push({
                    url: secureUrl,
                    type: "MP4",
                  });
                }
              }

              // Image / Photo post
              if (noteData.imageList && noteData.imageList.length > 0) {
                noteData.imageList.forEach((img, idx) => {
                  let imgUrl = img.urlOriginal || img.urlDefault || img.url;
                  if (imgUrl) {
                    if (imgUrl.startsWith("//")) {
                      imgUrl = `https:${imgUrl}`;
                    } else if (imgUrl.startsWith("http://")) {
                      imgUrl = imgUrl.replace("http://", "https://");
                    }
                    downloads.push({
                      url: imgUrl,
                      type: "PHOTO",
                    });
                  }
                });
              }

              if (downloads.length > 0) {
                return {
                  title,
                  author,
                  thumbnail,
                  downloads,
                  sourceUrl: url,
                };
              }
            }
          }
        } catch (err) {
          console.error("RedNote state JSON parse error:", err);
        }
      }

      const ogTitleMatch =
        htmlStr.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
        htmlStr.match(/<meta\s+name="og:title"\s+content="([^"]+)"/i) ||
        htmlStr.match(/<title>([^<]+)<\/title>/i);
      const ogImageMatch =
        htmlStr.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
        htmlStr.match(/<meta\s+name="og:image"\s+content="([^"]+)"/i);
      const ogVideoMatch =
        htmlStr.match(/<meta\s+property="og:video"\s+content="([^"]+)"/i) ||
        htmlStr.match(/<meta\s+property="og:video:url"\s+content="([^"]+)"/i);

      let rawTitle = ogTitleMatch ? ogTitleMatch[1] : "";
      let rawImage = ogImageMatch ? ogImageMatch[1] : "";

      if (rawImage.startsWith("//")) rawImage = `https:${rawImage}`;

      if (
        !isLandingOrErrorPage(rawTitle, rawImage) &&
        (ogImageMatch || ogVideoMatch)
      ) {
        const title =
          rawTitle.replace(/ - (?:小红书|RedNote).*/i, "") || "RedNote Post";
        const downloads = [];
        if (ogVideoMatch) {
          let vUrl = ogVideoMatch[1];
          if (vUrl.startsWith("//")) vUrl = `https:${vUrl}`;
          downloads.push({ url: vUrl, type: "MP4" });
        }
        if (ogImageMatch && rawImage) {
          downloads.push({ url: rawImage, type: "PHOTO" });
        }
        if (downloads.length > 0) {
          return {
            title,
            author: "RedNote Creator",
            thumbnail: rawImage || null,
            downloads,
            sourceUrl: url,
          };
        }
      }

      return null;
    };

    let extractedNoteId = null;

    const userAgentsToTry = [CHROME_DESKTOP_UA, CHROME_MOBILE_UA];

    // Resolve redirection if it's a short URL (xhslink.com or xhslink.cn)
    if (cleanUrl.includes("xhslink.com") || cleanUrl.includes("xhslink.cn")) {
      for (const ua of userAgentsToTry) {
        try {
          const redirectRes = await scraperFetch(
            {
              url: cleanUrl,
              rawResponse: true,
              headers: {
                "User-Agent": ua,
              },
            },
            "RedNote Redirect",
          );

          const resHtml =
            typeof redirectRes.data === "string" ? redirectRes.data : "";
          const extracted = extractMediaFromHtml(resHtml);
          if (extracted) {
            return createScraperResult(true, extracted);
          }

          // Check response URL, headers, and body for target Note ID ([a-f0-9]{24})
          const locationHdr =
            redirectRes.headers?.location ||
            redirectRes.headers?.Location ||
            "";
          const targetSearchStr = `${redirectRes.url || ""} ${locationHdr} ${resHtml}`;
          const noteIdMatch = targetSearchStr.match(/\/([a-f0-9]{24})/i);
          if (noteIdMatch) {
            extractedNoteId = noteIdMatch[1];
          }

          if (redirectRes.url && !redirectRes.url.includes("xhslink.com")) {
            cleanUrl = redirectRes.url;
            break;
          }
        } catch (e) {
          console.error("RedNote redirect resolve failed:", e);
        }
      }
    }

    if (!extractedNoteId) {
      const noteIdMatch =
        cleanUrl.match(
          /\/(?:explore|discovery\/item|red_video)\/([a-f0-9]{24})/i,
        ) || cleanUrl.match(/\/([a-f0-9]{24})/i);
      if (noteIdMatch) extractedNoteId = noteIdMatch[1];
    }

    const urlsToTry = [];
    if (
      cleanUrl &&
      !cleanUrl.includes("xhslink.com") &&
      !cleanUrl.includes("xhslink.cn")
    ) {
      urlsToTry.push(cleanUrl);
    }
    if (extractedNoteId) {
      urlsToTry.push(`https://www.xiaohongshu.com/explore/${extractedNoteId}`);
      urlsToTry.push(
        `https://www.rednote.com/discovery/item/${extractedNoteId}`,
      );
      urlsToTry.push(`https://www.rednote.com/explore/${extractedNoteId}`);
      urlsToTry.push(
        `https://www.xiaohongshu.com/discovery/item/${extractedNoteId}`,
      );
    }

    for (const targetUrl of urlsToTry) {
      for (const ua of userAgentsToTry) {
        try {
          const html = await scraperFetch(
            {
              url: targetUrl,
              parseJson: false,
              headers: {
                "User-Agent": ua,
                Cookie:
                  "a1=18a1234567890abcdef1234567890abc; webId=1234567890abcdef",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
              },
            },
            "RedNote Direct HTML",
          );

          const extracted = extractMediaFromHtml(html);
          if (extracted) {
            return createScraperResult(true, extracted);
          }
        } catch (directErr) {
          console.error(
            "RedNote direct HTML fetch failed for",
            targetUrl,
            directErr,
          );
        }
      }
    }

    throw new Error("RedNote post not found or link has expired.");
  } catch (e) {
    return createScraperResult(false, e.message);
  }
}
