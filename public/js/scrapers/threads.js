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
    doc.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      if (href && (href.includes("token=") || href.includes("acxcdn.com"))) {
        let finalUrl = href;
        let type = "VIDEO";
        try {
          const urlObj = new URL(href);
          const token = urlObj.searchParams.get("token");
          if (token) {
            const payloadPart = token.split(".")[1];
            if (payloadPart) {
              const payload = JSON.parse(atob(payloadPart));
              if (payload.url) {
                finalUrl = payload.url;
                const lowerUrl = finalUrl.toLowerCase();
                if (
                  lowerUrl.includes(".jpg") ||
                  lowerUrl.includes(".jpeg") ||
                  lowerUrl.includes(".png") ||
                  lowerUrl.includes(".webp")
                ) {
                  type = "IMAGE";
                }
              }
            }
          }
        } catch (e) {}
        downloads.push({ type, url: finalUrl });
      }
    });

    if (downloads.length === 0) throw new Error("No download links found.");

    let threadsTitle = "Threads Media";
    const titleEl = doc.querySelector(".card-text, .post-text, p, h3, h4");
    if (titleEl && titleEl.textContent.trim()) {
      const txt = titleEl.textContent.trim().replace(/\s+/g, " ");
      if (txt.length > 3 && !txt.toLowerCase().includes("download")) {
        threadsTitle = txt;
      }
    } else {
      const userMatch = url.match(/threads\.net\/@([A-Za-z0-9_.-]+)/i);
      if (userMatch) {
        threadsTitle = `@${userMatch[1]} - Threads Post`;
      }
    }
    if (threadsTitle.length > 90) {
      threadsTitle = threadsTitle.substring(0, 87) + "...";
    }

    return createScraperResult(true, {
      title: threadsTitle,
      downloads,
      sourceUrl: url,
    });
  } catch (e) {
    return createScraperResult(false, e.message);
  }
}
