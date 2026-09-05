import {
  CHROME_UA,
  getCookiesFromHeaders,
  serializeData,
} from "../utils/index.js";
import { scraperFetch, createScraperResult } from "./httpHelper.js";

export async function scrapeAppleMusic(url) {
  let currentStatus = null;
  try {
    const headers = {
      "User-Agent": CHROME_UA,
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
    };

    const r1 = await scraperFetch(
      {
        url: "https://aplmate.com/",
        headers: { ...headers, Accept: "text/html" },
        rawResponse: true,
      },
      "Aplmate Main",
    );
    currentStatus = r1.status;
    const cookies = getCookiesFromHeaders(r1.headers);

    const r2Data = await scraperFetch(
      {
        url: "https://aplmate.com/action/userverify",
        method: "POST",
        data: serializeData({ url }),
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: cookies,
        },
      },
      "Aplmate Verify",
    );

    const token = r2Data.success ? r2Data.token : null;
    if (!token) throw new Error(r2Data.message || "Verification failed.");

    const r3Data = await scraperFetch(
      {
        url: "https://aplmate.com/action",
        method: "POST",
        data: serializeData({ url, "cf-turnstile-response": token }),
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies,
        },
      },
      "Aplmate Action",
    );

    if (r3Data.error) throw new Error(r3Data.message || "Action failed.");

    const parser = new DOMParser();
    let finalHtml = r3Data.html;
    const doc2 = parser.parseFromString(finalHtml, "text/html");
    const forms2 = doc2.querySelectorAll('form[name="submitapurl"]');

    const downloads = [];
    const isMultiTrack = forms2.length > 1;

    for (let i = 0; i < forms2.length; i++) {
      const form2 = forms2[i];
      const data2 = {};
      form2.querySelectorAll("input").forEach((input) => {
        const name = input.getAttribute("name");
        const value = input.getAttribute("value") || "";
        if (name) data2[name] = value;
      });
      const payloadStr = serializeData(data2);

      const prefix = isMultiTrack ? `${(i + 1).toString().padStart(2, "0")}. ` : "";

      let itemTitle = "";
      const fb = form2.querySelector('input[name="data"]')?.value;
      if (fb) {
        try {
          const dec = JSON.parse(atob(fb));
          const name = dec.name || dec.title || "";
          const artist = dec.artist || dec.singer || "";
          if (artist && name) itemTitle = `${artist} - ${name}`;
          else if (name) itemTitle = name;
        } catch (_) {}
      }

      if (i === 0 && !isMultiTrack) {
        try {
          const r4Data = await scraperFetch(
            {
              url: "https://aplmate.com/action/track",
              method: "POST",
              data: payloadStr,
              headers: {
                ...headers,
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: cookies,
              },
            },
            "Aplmate Track",
          );
          const trackHtml = r4Data.data || r4Data;
          const doc3 = parser.parseFromString(trackHtml, "text/html");

          doc3.querySelectorAll("a").forEach((a) => {
            const href = a.getAttribute("href");
            const text = a.textContent.trim();
            if (
              href &&
              (href.includes("/dl?token=") ||
                href.includes("/mp3?token=") ||
                a.classList.contains("abutton"))
            ) {
              if (href.includes("ko-fi.com") || href.includes("premium.html"))
                return;
              if (text.toLowerCase().includes("another song")) return;

              const fullUrl = href.startsWith("http")
                ? href
                : "https://aplmate.com" + href;
              if (downloads.some((d) => d.url === fullUrl)) return;

              const isCover =
                text.toLowerCase().includes("cover") ||
                href.includes("cover=") ||
                (() => {
                  try {
                    const token = new URL(fullUrl).searchParams.get("token");
                    if (token) {
                      const payloadPart = token.split(".")[1];
                      if (payloadPart) {
                        const b64 = payloadPart
                          .replace(/-/g, "+")
                          .replace(/_/g, "/");
                        const parsed = JSON.parse(atob(b64));
                        return !!parsed.cover;
                      }
                    }
                  } catch (_) {}
                  return false;
                })();

              downloads.push({
                type: isMultiTrack
                  ? `${prefix}${text || "MP3"} [MP3]`
                  : isCover
                    ? "Cover [HD]"
                    : "MP3",
                url: fullUrl,
                ext: isCover ? "jpg" : "mp3",
              });
            }
          });

          // Sort so MP3 comes first, followed by Cover
          downloads.sort((a, b) => {
            const aIsCover = a.type.includes("Cover");
            const bIsCover = b.type.includes("Cover");
            if (aIsCover && !bIsCover) return 1;
            if (!aIsCover && bIsCover) return -1;
            return 0;
          });
        } catch (e) {}
      }

      if (downloads.length === 0 || isMultiTrack) {
        downloads.push({
          type: isMultiTrack
            ? `${prefix}${itemTitle || "Track " + (i + 1)} [MP3]`
            : "MP3",
          url: `applemusic_resolve:${payloadStr}`,
          ext: "mp3",
        });
      }
    }

    if (downloads.length === 0) throw new Error("Download links not found.");

    const firstMeta = (() => {
      const fb = forms2[0]?.querySelector('input[name="data"]')?.value;
      if (!fb) return null;
      try {
        return JSON.parse(atob(fb));
      } catch {
        return null;
      }
    })();
    const title =
      doc2.querySelector(".hover-underline")?.textContent?.trim() ||
      doc2.querySelector("h3")?.textContent?.trim() ||
      firstMeta?.name ||
      "Apple Music Content";
    const artist = doc2.querySelector("p")?.textContent?.trim();
    const thumbnail = doc2.querySelector("img")?.getAttribute("src");
    const typeSuffix =
      forms2.length > 1
        ? url.includes("/playlist/")
          ? " (Playlist)"
          : " (Album)"
        : "";

    return createScraperResult(true, {
      title: artist ? `${artist} - ${title}${typeSuffix}` : `${title}${typeSuffix}`,
      thumbnail,
      downloads,
      sourceUrl: url,
    });
  } catch (err) {
    return createScraperResult(false, err.message, currentStatus);
  }
}
