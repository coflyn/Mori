import {
  CHROME_UA,
  getCookiesFromHeaders,
  serializeData,
} from "../utils/index.js";
import { getCleanUrl } from "../utils/urlUtils.js";
import { scraperFetch, createScraperResult } from "./httpHelper.js";

export let _twSource = null;
export function setTwitterSource(src) {
  _twSource = src;
}

async function fetchTweetMetadata(cleanUrl) {
  try {
    const idMatch = cleanUrl.match(/status(?:es)?\/(\d+)/i);
    if (!idMatch) return null;
    const res = await scraperFetch(
      {
        url: `https://api.fxtwitter.com/status/${idMatch[1]}`,
        rawResponse: true,
      },
      "FxTwitter Meta",
    );
    let data = res?.data ?? res;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (_) {}
    }
    if (data?.tweet) {
      const mediaThumb =
        data.tweet.media?.videos?.[0]?.thumbnail_url ||
        data.tweet.media?.photos?.[0]?.url ||
        data.tweet.media?.mosaic?.formats?.jpeg ||
        data.tweet.thumbnail_url ||
        null;
      return {
        text: data.tweet.text || "",
        author: data.tweet.author?.name || "",
        handle: data.tweet.author?.screen_name
          ? `@${data.tweet.author.screen_name}`
          : "",
        thumbnail: mediaThumb,
      };
    }
  } catch (_) {}
  return null;
}

function resolveTwitterTitle(meta, doc2, cleanUrl, name, handle) {
  let title = "";

  // 1. Text from FxTwitter API
  if (meta?.text) {
    const cleanText = meta.text
      .replace(/https:\/\/t\.co\/\S+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleanText) {
      const author = meta.author || name;
      title = author ? `${author} - ${cleanText}` : cleanText;
    }
  }

  // 2. Text from scraper DOM (Tweeload / TVD)
  if (!title && doc2) {
    const textEl = doc2.querySelector(
      ".download__item__info__text, .download__item__text, .tweet-text, .card-text, .desc",
    );
    if (textEl) {
      const txt = textEl.textContent?.trim().replace(/\s+/g, " ");
      if (
        txt &&
        txt.length > 3 &&
        !txt.toLowerCase().includes("download") &&
        !txt.toLowerCase().includes("video quality")
      ) {
        title = name ? `${name} - ${txt}` : txt;
      }
    }
  }

  // 3. Fallback to author name & handle
  if (!title) {
    const author = meta?.author || name;
    const h = meta?.handle || handle;
    if (author && h) {
      title = `${author} (${h})`;
    } else if (author) {
      title = author;
    }
  }

  // 4. Fallback to URL username / tweet id
  if (!title) {
    const userMatch = cleanUrl.match(
      /(?:twitter|x)\.com\/([A-Za-z0-9_]+)\/status\/(\d+)/i,
    );
    if (userMatch) {
      const user = userMatch[1] !== "i" ? `@${userMatch[1]}` : "";
      const tweetId = userMatch[2];
      title = user ? `${user} - Tweet (${tweetId})` : `Tweet (${tweetId})`;
    } else {
      title = "Twitter Post";
    }
  }

  if (title.length > 90) {
    title = title.substring(0, 87) + "...";
  }
  return title;
}

export async function scrapeTwitter(url) {
  let currentStatus = null;
  try {
    const cleanUrl = getCleanUrl(url).split("?")[0];
    if (!_twSource) return { requireSource: true };

    const formatResolutionLabel = (rawText, qualityText, url = "") => {
      const text = (rawText || "") + " " + (qualityText || "");
      const urlMatch = (url || "").match(/\/vid\/(\d+x\d+)\//i);
      if (urlMatch) {
        return urlMatch[1].toLowerCase();
      }
      const match = text.match(/(\d+\s*[xX]\s*\d+|\d+\s*p)/i);
      if (match) {
        return match[1].replace(/\s+/g, "").toLowerCase();
      }
      const clean = text
        .replace(/download|video|mp4|get|premium|for|\$|\d+\.\d+|\:/gi, "")
        .trim();
      return clean || "MP4";
    };

    const isPaywallOrInvalid = (href, labelText) => {
      if (!href || !href.startsWith("http")) return true;
      const lowerHref = href.toLowerCase();
      const lowerLabel = (labelText || "").toLowerCase();
      if (
        lowerHref.includes("checkout") ||
        lowerHref.includes("stripe") ||
        lowerHref.includes("buy") ||
        lowerHref.includes("premium") ||
        lowerLabel.includes("$") ||
        lowerLabel.includes("for $") ||
        lowerLabel.includes("premium") ||
        lowerLabel.includes("paywall")
      ) {
        return true;
      }
      return false;
    };

    if (_twSource === "tvd") {
      const twitterUrl = cleanUrl.replace(
        /https:\/\/(x|fixupx|fxtwitter|vxtwitter|nitter)\.com/g,
        "https://twitter.com",
      );
      const r1 = await scraperFetch(
        {
          url: "https://twittervideodownloader.com/",
          headers: { "User-Agent": CHROME_UA },
          rawResponse: true,
        },
        "TVD Main",
      );
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

      const r2 = await scraperFetch(
        {
          url: "https://twittervideodownloader.com/download",
          method: "POST",
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
          rawResponse: true,
        },
        "TVD Download",
      );
      currentStatus = r2.status;

      const doc2 = parser.parseFromString(r2.data, "text/html");
      const videoDownloads = [];
      const imageDownloads = [];

      const parseResolutionArea = (str) => {
        const m = (str || "").match(/(\d+)\s*[xX]\s*(\d+)/);
        if (m) return parseInt(m[1], 10) * parseInt(m[2], 10);
        const p = (str || "").match(/(\d+)\s*p/i);
        if (p) return parseInt(p[1], 10) * parseInt(p[1], 10) * 1.77;
        return 0;
      };

      doc2
        .querySelectorAll(
          ".card-body a, a.btn-download, a.btn, a.tw-btn, a[href*='video.twimg.com'], a[href*='twimg.com']",
        )
        .forEach((btn) => {
          const href = btn.getAttribute("href");
          if (!href || href === "/" || href.startsWith("#")) return;
          const btnText = btn.textContent.trim();
          const card = btn.closest(".card-body");
          const qualityText =
            card?.querySelector(".card-text")?.textContent?.trim() || "";
          const fullText = `${btnText} ${qualityText}`;
          if (isPaywallOrInvalid(href, fullText)) return;

          const isVideoUrl =
            href.includes("video.twimg.com") ||
            /\.(mp4|m3u8)(\?|$)/i.test(href) ||
            /mp4|video|720|1080|480|360|270/i.test(btnText);
          const isImageUrl =
            href.includes("pbs.twimg.com") ||
            /\.(jpe?g|png|webp)(\?|$)/i.test(href);

          if (isVideoUrl && !isImageUrl) {
            if (!videoDownloads.some((d) => d.url === href)) {
              const label = formatResolutionLabel(btnText, qualityText, href);
              videoDownloads.push({ type: label, url: href });
            }
          } else if (isImageUrl) {
            if (!imageDownloads.some((d) => d.url === href)) {
              imageDownloads.push({ type: "IMAGE", url: href });
            }
          }
        });

      // Sort videos by resolution (highest quality first)
      videoDownloads.sort(
        (a, b) => parseResolutionArea(b.type) - parseResolutionArea(a.type),
      );

      // If video exists, NEVER return images! If only images exist, return images.
      const rawList =
        videoDownloads.length > 0 ? videoDownloads : imageDownloads;
      if (rawList.length === 0)
        throw new Error("No free video links found on TVD.");

      const tweetMeta = await fetchTweetMetadata(cleanUrl);
      const title = resolveTwitterTitle(tweetMeta, doc2, cleanUrl, null, null);

      const thumbnail =
        tweetMeta?.thumbnail ||
        doc2
          .querySelector(
            "img[src*='twimg.com'], img[src*='pbs.twimg.com'], .col-4 img, img.img-fluid, .card img",
          )
          ?.getAttribute("src") ||
        doc2.querySelector("video")?.getAttribute("poster") ||
        null;

      const downloads = rawList.map((d, index) => ({
        ...d,
        thumbnail,
        isMirror: index > 0,
      }));

      _twSource = null;
      return createScraperResult(true, {
        title,
        thumbnail,
        downloads,
        sourceUrl: url,
      });
    }

    if (_twSource === "tweeload") {
      const twitterUrl = cleanUrl.replace(
        /https:\/\/(fixupx|fxtwitter|vxtwitter|nitter|twitter)\.com/g,
        "https://x.com",
      );
      const r1 = await scraperFetch(
        {
          url: "https://tweeload.com/en",
          headers: { "User-Agent": CHROME_UA },
          rawResponse: true,
        },
        "Tweeload Init",
      );
      currentStatus = r1.status;

      const parser = new DOMParser();

      const r2 = await scraperFetch(
        {
          url: "https://tweeload.com/en/download",
          method: "POST",
          data: serializeData({ url: twitterUrl }),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": CHROME_UA,
          },
          rawResponse: true,
        },
        "Tweeload Download",
      );
      currentStatus = r2.status;

      const doc2 = parser.parseFromString(r2.data, "text/html");
      const videoDownloads = [];
      const imageDownloads = [];

      const parseResolutionArea = (str) => {
        const m = (str || "").match(/(\d+)\s*[xX]\s*(\d+)/);
        if (m) return parseInt(m[1], 10) * parseInt(m[2], 10);
        const p = (str || "").match(/(\d+)\s*p/i);
        if (p) return parseInt(p[1], 10) * parseInt(p[1], 10) * 1.77;
        return 0;
      };

      doc2
        .querySelectorAll(
          ".download__item__info__actions tr, .download_item_info tr, table tr",
        )
        .forEach((tr) => {
          const tds = tr.querySelectorAll("td");
          const quality = tds[0]?.textContent?.trim() || "";
          let dlUrl = tr
            .querySelector(
              "a.download__item__info__actions__button, a.btn, a[href*='acxcdn.com'], a[href*='twimg.com']",
            )
            ?.getAttribute("href");
          if (dlUrl) {
            if (dlUrl.startsWith("/")) dlUrl = "https://tweeload.com" + dlUrl;
            if (!isPaywallOrInvalid(dlUrl, quality)) {
              const label = formatResolutionLabel(quality, "", dlUrl);
              const isVideoUrl =
                dlUrl.includes("acxcdn.com") ||
                dlUrl.includes("video.twimg.com") ||
                /\.(mp4|m3u8)(\?|$)/i.test(dlUrl) ||
                /^\d+[xXpP]/i.test(label) ||
                label === "MP4";
              const isImageUrl =
                dlUrl.includes("pbs.twimg.com") ||
                /\.(jpe?g|png|webp)(\?|$)/i.test(dlUrl);

              if (isVideoUrl && !isImageUrl) {
                if (!videoDownloads.some((d) => d.url === dlUrl)) {
                  videoDownloads.push({ type: label, url: dlUrl });
                }
              } else if (isImageUrl) {
                if (!imageDownloads.some((d) => d.url === dlUrl)) {
                  imageDownloads.push({ type: "IMAGE", url: dlUrl });
                }
              }
            }
          }
        });

      if (videoDownloads.length === 0 && imageDownloads.length === 0) {
        doc2
          .querySelectorAll(
            "a.btn, a[href*='downloads.acxcdn.com'], a[href*='twimg.com']",
          )
          .forEach((a) => {
            let href = a.getAttribute("href");
            if (
              href &&
              (href.includes("downloads.acxcdn.com") ||
                href.includes("twimg.com") ||
                href.includes("tweeload"))
            ) {
              const text = a.textContent.trim();
              if (
                text.toLowerCase() !== "download via the mobile app" &&
                !isPaywallOrInvalid(href, text)
              ) {
                const label = formatResolutionLabel(text, "", href);
                const isVideoUrl =
                  href.includes("acxcdn.com") ||
                  href.includes("video.twimg.com") ||
                  /\.(mp4|m3u8)(\?|$)/i.test(href) ||
                  /^\d+[xXpP]/i.test(label) ||
                  label === "MP4";
                const isImageUrl =
                  href.includes("pbs.twimg.com") ||
                  /\.(jpe?g|png|webp)(\?|$)/i.test(href);

                if (isVideoUrl && !isImageUrl) {
                  if (!videoDownloads.some((d) => d.url === href)) {
                    videoDownloads.push({ type: label, url: href });
                  }
                } else if (isImageUrl) {
                  if (!imageDownloads.some((d) => d.url === href)) {
                    imageDownloads.push({ type: "IMAGE", url: href });
                  }
                }
              }
            }
          });
      }

      videoDownloads.sort(
        (a, b) => parseResolutionArea(b.type) - parseResolutionArea(a.type),
      );

      const rawTweeload =
        videoDownloads.length > 0 ? videoDownloads : imageDownloads;
      if (rawTweeload.length === 0) throw new Error("Twitter links not found.");

      const tweetMeta = await fetchTweetMetadata(cleanUrl);
      const name =
        doc2
          .querySelector(".download__item__info__user__name")
          ?.textContent?.trim() || null;
      const handle =
        doc2
          .querySelector(".download__item__info__user__handle")
          ?.textContent?.trim() || null;
      const title = resolveTwitterTitle(
        tweetMeta,
        doc2,
        cleanUrl,
        name,
        handle,
      );

      const thumbnail =
        tweetMeta?.thumbnail ||
        doc2
          .querySelector(
            ".download__item__preview img, .download__item img, img[src*='twimg.com']",
          )
          ?.getAttribute("src") ||
        null;

      const downloads = rawTweeload.map((d, index) => ({
        ...d,
        thumbnail,
        isMirror: index > 0,
      }));

      _twSource = null;
      return createScraperResult(true, {
        title,
        thumbnail,
        downloads,
        sourceUrl: url,
      });
    }

    throw new Error("Invalid source selected.");
  } catch (err) {
    _twSource = null;
    return createScraperResult(false, err.message, currentStatus);
  }
}
