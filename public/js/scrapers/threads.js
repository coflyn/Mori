import { scraperFetch, createScraperResult } from "./httpHelper.js";

export async function scrapeThreads(url) {
  try {
    const mainRes = await scraperFetch(
      {
        url: "https://threadster.app/",
        rawResponse: true,
      },
      "Threadster Main",
    );
    const cookies = mainRes.headers["set-cookie"] || "";

    const html = await scraperFetch(
      {
        url: "https://threadster.app/download",
        method: "POST",
        data: { url },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies,
        },
        parseJson: false,
      },
      "Threadster Download",
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const downloads = [];

    function decodeBase64Url(str) {
      try {
        let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) base64 += "=";
        return decodeURIComponent(escape(atob(base64)));
      } catch (e) {
        try {
          let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
          while (base64.length % 4) base64 += "=";
          return atob(base64);
        } catch (_) {
          return null;
        }
      }
    }

    doc.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      if (href && (href.includes("token=") || href.includes("acxcdn.com"))) {
        let finalUrl = href;
        let type = href.includes("/image") ? "PHOTO" : "MP4";
        try {
          const urlObj = new URL(href);
          const token = urlObj.searchParams.get("token");
          if (token) {
            const payloadPart = token.split(".")[1];
            if (payloadPart) {
              const decodedStr = decodeBase64Url(payloadPart);
              if (decodedStr) {
                const payload = JSON.parse(decodedStr);
                if (payload.url) {
                  finalUrl = payload.url;
                  const lowerUrl = finalUrl.toLowerCase();
                  if (
                    lowerUrl.includes(".jpg") ||
                    lowerUrl.includes(".jpeg") ||
                    lowerUrl.includes(".png") ||
                    lowerUrl.includes(".webp") ||
                    href.includes("/image")
                  ) {
                    type = "PHOTO";
                  } else if (
                    lowerUrl.includes(".mp4") ||
                    lowerUrl.includes(".m3u8") ||
                    href.includes("/video")
                  ) {
                    type = "MP4";
                  }
                }
              }
            }
          }
        } catch (e) {}

        if (!downloads.some((d) => d.url === finalUrl)) {
          downloads.push({ type, url: finalUrl });
        }
      }
    });

    if (downloads.length === 0) throw new Error("No download links found.");

    let threadsTitle = "";

    // 1. Caption from Threadster
    const captionEl = doc.querySelector(
      ".download__item__caption__text, .download__item__caption, .card-text, .post-text",
    );
    let caption = captionEl
      ? captionEl.textContent.trim().replace(/\s+/g, " ")
      : "";
    if (
      /please enter a valid threads link/i.test(caption) ||
      caption.toLowerCase().includes("download")
    ) {
      caption = "";
    }

    // 2. Author username
    const authorEl = doc.querySelector(
      ".download__item__user_info span, .download__item__user_info",
    );
    let authorText = authorEl ? authorEl.textContent.trim() : "";
    const authorMatchFromHtml = authorText.match(/@([A-Za-z0-9_.-]+)/);
    const authorMatchFromUrl = url.match(
      /threads\.(?:net|com)\/@([A-Za-z0-9_.-]+)/i,
    );
    const username = authorMatchFromHtml
      ? authorMatchFromHtml[1].replace(/·$/, "")
      : authorMatchFromUrl
        ? authorMatchFromUrl[1]
        : "";

    if (username && caption) {
      threadsTitle = `@${username}: ${caption}`;
    } else if (caption) {
      threadsTitle = caption;
    } else if (username) {
      threadsTitle = `@${username} - Threads Post`;
    } else {
      threadsTitle = "Threads Media";
    }

    if (threadsTitle.length > 90) {
      threadsTitle = threadsTitle.substring(0, 87) + "...";
    }

    return createScraperResult(true, {
      title: threadsTitle,
      thumbnail: downloads.find((d) => d.type === "PHOTO")?.url || "",
      downloads,
      sourceUrl: url,
    });
  } catch (e) {
    return createScraperResult(false, e.message);
  }
}
