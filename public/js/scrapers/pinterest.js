import { CHROME_UA, getCookiesFromHeaders } from "../utils/index.js";
import { scraperFetch, createScraperResult } from "./httpHelper.js";

export async function scrapePinterest(url) {
  let currentStatus = null;
  try {
    let targetUrl = url;

    // Expand short pin.it links
    if (targetUrl.includes("pin.it")) {
      try {
        const expandRes = await scraperFetch(
          {
            url: targetUrl,
            headers: { "User-Agent": CHROME_UA },
            rawResponse: true,
          },
          "Pinterest Expand Short URL",
        );
        if (expandRes.data && typeof expandRes.data === "string") {
          const canonicalMatch = expandRes.data.match(
            /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i,
          );
          if (canonicalMatch && canonicalMatch[1]) {
            targetUrl = canonicalMatch[1];
          }
        }
      } catch (e) {}
    }

    // 1. Direct Pinterest Page HTML Extraction (Primary for Video & Original Image)
    try {
      const pageRes = await scraperFetch(
        {
          url: targetUrl,
          headers: {
            "User-Agent": CHROME_UA,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          rawResponse: true,
        },
        "Pinterest Direct HTML",
      );
      currentStatus = pageRes.status;

      if (pageRes.data && typeof pageRes.data === "string") {
        const html = pageRes.data;
        let title = "";

        const pinTitleMatch =
          html.match(/data-test-id=["']pin-title["'][^>]*>([\s\S]*?)<\/h1>/i) ||
          html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (pinTitleMatch && pinTitleMatch[1]) {
          const cleanH1 = pinTitleMatch[1].replace(/<[^>]+>/g, "").trim();
          if (cleanH1 && !/^pinterest$/i.test(cleanH1)) {
            title = cleanH1;
          }
        }

        if (!title) {
          const ogTitleMatch =
            html.match(
              /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i,
            ) ||
            html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i);
          if (ogTitleMatch && ogTitleMatch[1]) {
            title = ogTitleMatch[1].replace(/\s*\|\s*Pinterest$/i, "").trim();
          }
        }

        if (!title) {
          const titleTag = html.match(/<title>([^<]+)<\/title>/i);
          if (titleTag && titleTag[1]) {
            title = titleTag[1].replace(/\s*\|\s*Pinterest$/i, "").trim();
          }
        }

        if (!title) title = "Pinterest Pin";

        const downloads = [];
        const videoMatches =
          html.match(
            /https:\/\/(?:v1\.pinimg\.com|7\.pinimg\.com|v\.pinimg\.com)\/[^"'\s]+\.mp4/gi,
          ) ||
          html.match(/https:\/\/[^"'\s]+\.mp4[^\s"']*/gi) ||
          [];

        let rawImageMatches =
          html.match(
            /https:\/\/i\.pinimg\.com\/originals\/[a-zA-Z0-9\/._-]+\.(?:jpg|jpeg|png|webp)/gi,
          ) || [];

        if (rawImageMatches.length === 0) {
          rawImageMatches =
            html.match(
              /https:\/\/i\.pinimg\.com\/736x\/[a-zA-Z0-9\/._-]+\.(?:jpg|jpeg|png|webp)/gi,
            ) || [];
        }

        const isSiteAsset = (u) =>
          u.includes("d53b014d86a6b6761bf649a0ed813c2b") ||
          u.includes("/avatars/") ||
          u.includes("/profile/") ||
          u.includes("sprite") ||
          u.includes("placeholder");

        const filteredImages = rawImageMatches.filter((u) => !isSiteAsset(u));
        const uniqueVideos = [...new Set(videoMatches)];
        const uniqueImages = [...new Set(filteredImages)];

        // Video ALWAYS first
        uniqueVideos.forEach((vUrl) => {
          downloads.push({ type: "MP4", url: vUrl });
        });
        uniqueImages.forEach((iUrl) => {
          downloads.push({ type: "PHOTO", url: iUrl });
        });

        if (downloads.length > 0) {
          return createScraperResult(true, {
            title,
            thumbnail: uniqueImages[0] || uniqueVideos[0] || "",
            downloads,
            sourceUrl: url,
          });
        }
      }
    } catch (directErr) {
      console.warn(
        "Direct Pinterest HTML parsing failed, trying PinDown:",
        directErr,
      );
    }

    // 2. Fallback to PinDown scraper
    const r1 = await scraperFetch(
      {
        url: "https://pindown.io/",
        headers: { "User-Agent": CHROME_UA },
        rawResponse: true,
      },
      "Pindown Main",
    );
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

    const r2Data = await scraperFetch(
      {
        url: "https://pindown.io/action",
        method: "POST",
        data: { url: targetUrl, [tokenName]: tokenValue, lang: "en" },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          Cookie: cookies,
          "User-Agent": CHROME_UA,
        },
      },
      "Pindown Action",
    );

    const doc2 = parser.parseFromString(r2Data.html || "", "text/html");
    const downloads = [];
    doc2.querySelectorAll(".columns .column").forEach((el) => {
      const title = el.querySelector(".is-size-6")?.textContent?.trim() || "";
      let dlUrl = el.querySelector(".button")?.getAttribute("href");
      if (dlUrl) {
        if (dlUrl.includes("file=") && dlUrl.includes("http")) {
          try {
            const match = dlUrl.match(
              /file=(https?%3A%2F%2F[^&]+|https?:\/\/[^&]+)/i,
            );
            if (match && match[1]) {
              dlUrl = decodeURIComponent(match[1]);
            }
          } catch (e) {}
        }
        const lowerUrl = dlUrl.toLowerCase();
        let dlType = "PHOTO";
        if (
          lowerUrl.includes(".mp4") ||
          lowerUrl.includes("/videos/") ||
          title.toLowerCase().includes("video")
        ) {
          dlType = "MP4";
        } else if (
          lowerUrl.match(/\.(jpg|jpeg|png|webp)/) ||
          lowerUrl.includes("i.pinimg.com") ||
          title.toLowerCase().includes("image") ||
          title.toLowerCase().includes("photo")
        ) {
          dlType = "PHOTO";
        }
        downloads.push({ type: dlType, url: dlUrl });
      }
    });

    if (downloads.length > 0) {
      return createScraperResult(true, {
        title: doc2.querySelector("h3")?.textContent?.trim() || "Pinterest",
        thumbnail: doc2.querySelector(".image img")?.getAttribute("src"),
        downloads,
        sourceUrl: url,
      });
    }

    throw new Error("No media found for this Pinterest link.");
  } catch (err) {
    return createScraperResult(false, err.message, currentStatus);
  }
}
