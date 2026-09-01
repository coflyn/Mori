import {
  CHROME_UA,
  getCookiesFromHeaders,
  serializeData,
  decodeSnapSave,
  extractFinalUrl,
} from "../utils/index.js";
import { scraperFetch, createScraperResult } from "./httpHelper.js";

export async function scrapeFacebook(url) {
  let currentStatus = null;
  try {
    const headers = {
      "User-Agent": CHROME_UA,
      Origin: "https://snapsave.app",
      Referer: "https://snapsave.app/id",
    };

    const r1 = await scraperFetch(
      {
        url: "https://snapsave.app/id",
        headers: { ...headers, Accept: "text/html" },
        rawResponse: true,
      },
      "SnapSave Main",
    );
    currentStatus = r1.status;
    const cookies = getCookiesFromHeaders(r1.headers);

    const r2Res = await scraperFetch(
      {
        url: "https://snapsave.app/action.php?lang=id",
        method: "POST",
        data: serializeData({ url }),
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies,
        },
        rawResponse: true,
      },
      "SnapSave Action",
    );
    currentStatus = r2Res.status;

    const decodedHtml = decodeSnapSave(r2Res.data);
    const parser = new DOMParser();
    const doc = parser.parseFromString(decodedHtml, "text/html");
    const downloads = [];

    doc.querySelectorAll("table tbody tr").forEach((tr) => {
      if (tr.classList.contains("render")) return;

      const qTd = tr.querySelector("td.video-quality");
      const quality = qTd
        ? qTd.textContent.trim()
        : tr.querySelectorAll("td")[0]?.textContent?.trim();
      const btn =
        tr.querySelector("a.btn-download") ||
        tr.querySelector("button") ||
        tr.querySelector("a");
      let linkAttr = btn?.getAttribute("href") || btn?.getAttribute("onclick");

      const extracted = extractFinalUrl(linkAttr);
      if (
        extracted &&
        extracted.url.startsWith("http") &&
        !extracted.isRender
      ) {
        downloads.push({
          type: quality || "VIDEO",
          url: extracted.url,
          isRender: false,
        });
      }
    });

    if (downloads.length === 0)
      throw new Error("Could not extract download links.");

    const thumbEl =
      doc.querySelector(".video-preview img") ||
      doc.querySelector(".video-preview") ||
      doc.querySelector("img:not([src*='logo'])");
    let thumbnail = thumbEl
      ? thumbEl.getAttribute("src") ||
        thumbEl.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/, "$1")
      : null;
    if (thumbnail && thumbnail.startsWith("/"))
      thumbnail = "https://snapsave.app" + thumbnail;

    return createScraperResult(true, {
      title: "Facebook Media",
      thumbnail,
      downloads,
      sourceUrl: url,
    });
  } catch (err) {
    return createScraperResult(false, err.message, currentStatus);
  }
}
