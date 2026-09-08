// resolver.js — async token and worker link resolution
import { translations } from "../i18n/index.js";
import { currentLang } from "../modules/core.js";
import { scraperFetch } from "../scrapers/httpHelper.js";
import { getUserAgent, getCookiesFromHeaders } from "../utils/index.js";

/**
 * Determines whether a URL requires asynchronous resolution or conversion before downloading
 */
export function needsAsyncResolving(url) {
  return (
    (url.includes("ytdown") ||
      url.includes("worker") ||
      url.includes("youtube_resolve:") ||
      url.includes("ytmp3gg_resolve:") ||
      url.includes("soundloaders_resolve:") ||
      url.includes("spotidown_resolve:") ||
      url.includes("applemusic_resolve:") ||
      (url.includes("token=") && url.includes("snapsave"))) &&
    !url
      .toLowerCase()
      .match(/\.(mp4|mp3|m4a|zip|pdf|jpg|jpeg|png|webp)(\?|$)/)
  );
}

/**
 * Resolves indirect/tokenized URLs into actual direct media download URLs
 */
export async function resolveDownloadUrl({
  url,
  btn,
  updateProgress,
  checkCancelled,
}) {
  let actualDownloadUrl = url;

  if (url.startsWith("applemusic_resolve:")) {
    const payloadStr = url.replace("applemusic_resolve:", "");
    let foundLink = "";
    let lastErr = null;
    const maxResolveAttempts = 3;

    for (let attempt = 1; attempt <= maxResolveAttempts; attempt++) {
      if (checkCancelled()) return { cancelled: true };
      try {
        if (attempt > 1) {
          updateProgress(
            20,
            `Resolving Apple Music track (Retry ${attempt}/${maxResolveAttempts})...`,
          );
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
        const res = await scraperFetch({
          method: "POST",
          url: "https://aplmate.com/action/track",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
            Referer: "https://aplmate.com/",
            Origin: "https://aplmate.com",
          },
          data: payloadStr,
        });
        let dd = typeof res === "string" ? JSON.parse(res) : res;
        let dlHtml = (typeof dd === "object" ? dd?.data : dd) || "";
        if (typeof dlHtml !== "string") dlHtml = JSON.stringify(dlHtml);
        const parser = new DOMParser();
        const doc = parser.parseFromString(dlHtml, "text/html");
        doc.querySelectorAll("a").forEach((a) => {
          const href = a.getAttribute("href");
          const text = a.textContent.trim();
          if (
            href &&
            (href.includes("/dl?token=") || a.classList.contains("abutton"))
          ) {
            if (href.includes("ko-fi.com") || href.includes("premium.html"))
              return;
            if (
              text.toLowerCase().includes("another song") ||
              text.toLowerCase().includes("cover") ||
              href.includes("cover=")
            )
              return;
            if (!foundLink) {
              foundLink = href.startsWith("http")
                ? href
                : "https://aplmate.com" + href;
            }
          }
        });
        if (foundLink) break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (foundLink) {
      actualDownloadUrl = foundLink;
    } else {
      throw (
        lastErr || new Error("Could not resolve Apple Music download link")
      );
    }
  } else if (url.startsWith("spotidown_resolve:")) {
    if (btn) {
      btn.innerHTML =
        translations[currentLang]?.["btn-processing"] || "Processing...";
    }
    updateProgress(20, "Resolving Spotify track...");

    const parts = url.replace("spotidown_resolve:", "").split("|||");
    const payloadStr = parts[0];
    let cookiesStr = parts[1] ? decodeURIComponent(parts[1]) : "";

    let foundLink = "";
    let lastErr = null;
    const maxResolveAttempts = 3;

    for (let attempt = 1; attempt <= maxResolveAttempts; attempt++) {
      if (checkCancelled()) return { cancelled: true };
      try {
        if (attempt > 1) {
          updateProgress(
            20,
            `Resolving Spotify track (Retry ${attempt}/${maxResolveAttempts})...`,
          );
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          // Refresh session cookies from spotidown.app if failed previously
          try {
            const r1 = await scraperFetch({
              url: "https://spotidown.app/",
              headers: { "User-Agent": getUserAgent() },
              rawResponse: true,
            });
            const freshCookies = getCookiesFromHeaders(r1.headers);
            if (freshCookies) cookiesStr = freshCookies;
          } catch (_) {}
        }

        const reqHeaders = {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": getUserAgent(),
          "X-Requested-With": "XMLHttpRequest",
          Referer: "https://spotidown.app/",
          Origin: "https://spotidown.app",
        };
        if (cookiesStr) reqHeaders["Cookie"] = cookiesStr;

        const res = await scraperFetch(
          {
            url: "https://spotidown.app/action/track",
            method: "POST",
            headers: reqHeaders,
            data: payloadStr,
            rawResponse: true,
          },
          "SpotiDown",
        );
        let dd = res?.data ?? res;
        if (typeof dd === "string") {
          try {
            dd = JSON.parse(dd);
          } catch (_) {}
        }
        let dlHtml =
          (typeof dd === "object" ? dd?.data || dd?.html : dd) || "";
        if (typeof dlHtml !== "string") dlHtml = JSON.stringify(dlHtml);
        const parser = new DOMParser();
        const doc = parser.parseFromString(dlHtml, "text/html");
        doc.querySelectorAll("a").forEach((a) => {
          const href = a.getAttribute("href");
          const text = a.textContent.trim();
          if (
            href &&
            href.startsWith("http") &&
            !href.includes("premium.html") &&
            !href.includes("ko-fi.com") &&
            text !== "Download Another Song"
          ) {
            if (!foundLink) foundLink = href;
          }
        });
        if (foundLink) break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (foundLink) {
      updateProgress(50, "Starting MP3 download...");
      actualDownloadUrl = foundLink;
    } else {
      throw (
        lastErr || new Error("Could not resolve SpotiDown download link")
      );
    }
  } else if (url.startsWith("soundloaders_resolve:")) {
    if (btn) {
      btn.innerHTML =
        translations[currentLang]?.["btn-processing"] || "Processing...";
    }
    updateProgress(20, "Resolving Spotify track...");

    const parts = url.replace("soundloaders_resolve:", "").split("|||");
    const dataVal = parts[0];
    const tokenVal = parts[1];
    const BASE = "https://soundloaders.app";

    let matchLink = "";
    let lastErr = null;
    const maxResolveAttempts = 3;

    for (let attempt = 1; attempt <= maxResolveAttempts; attempt++) {
      if (checkCancelled()) return { cancelled: true };
      try {
        if (attempt > 1) {
          updateProgress(
            20,
            `Resolving Spotify track (Retry ${attempt}/${maxResolveAttempts})...`,
          );
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }

        const res = await scraperFetch(
          {
            url: BASE + "/action/tracks",
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
              "User-Agent": getUserAgent(),
              "X-Requested-With": "XMLHttpRequest",
              Referer: BASE + "/",
              Origin: BASE,
            },
            data:
              "data=" +
              encodeURIComponent(dataVal) +
              "&track_token=" +
              encodeURIComponent(tokenVal),
            rawResponse: true,
          },
          "Soundloaders",
        );
        let dd = res?.data ?? res;
        if (typeof dd === "string") {
          try {
            dd = JSON.parse(dd);
          } catch (_) {}
        }
        let dlHtml =
          (typeof dd === "object" ? dd?.html || dd?.data : dd) || "";
        const match = dlHtml.match(
          /href=["'](https:\/\/dl\.soundloaders\.app\/cdnv1\?token=[^"']+)["']/,
        );
        if (match && match[1]) {
          matchLink = match[1];
          break;
        }
      } catch (err) {
        lastErr = err;
      }
    }

    if (matchLink) {
      updateProgress(50, "Starting MP3 download...");
      actualDownloadUrl = matchLink;
    } else {
      throw (
        lastErr ||
        new Error("Could not resolve Soundloaders download link")
      );
    }
  } else if (
    url.startsWith("youtube_resolve:") ||
    url.startsWith("ytmp3gg_resolve:")
  ) {
    const raw = url.startsWith("youtube_resolve:")
      ? url.replace("youtube_resolve:", "")
      : url.replace("ytmp3gg_resolve:", "");
    const parts = raw.split("|||");
    const ytId = parts[0];
    const format = parts[1] || "mp3";
    const quality = parts[2] || "128";

    let downloadUrl = null;

    try {
      if (btn) {
        btn.innerHTML = `<div>${translations[currentLang]?.["btn-processing"] || "Processing..."} (ytmp3)</div>`;
      }
      updateProgress(10, "Converting with ytmp3.mobi...");

      const mobiHeaders = {
        Origin: "https://ytmp3.mobi",
        Referer: "https://ytmp3.mobi/",
        "User-Agent": getUserAgent(),
      };

      const initData = await scraperFetch(
        {
          url: "https://a.ymcdn.org/api/v1/init?p=y&23=1llum1n471",
          headers: mobiHeaders,
        },
        "ytmp3.mobi Init",
      );

      if (initData && !initData.error && initData.convertURL) {
        const convData = await scraperFetch(
          {
            url: `${initData.convertURL}&v=${ytId}&f=${format}`,
            headers: mobiHeaders,
          },
          "ytmp3.mobi Convert",
        );

        if (convData && !convData.error) {
          let dlUrl = convData.downloadURL;
          let progUrl = convData.progressURL;
          let progress = 0;
          let attempts = 0;
          const maxAttempts = 30;

          while (progress < 3 && attempts < maxAttempts) {
            if (checkCancelled()) return { cancelled: true };

            await new Promise((r) => setTimeout(r, 1500));
            if (!progUrl) break;

            const progData = await scraperFetch(
              { url: progUrl, headers: mobiHeaders },
              "ytmp3.mobi Progress",
            );
            if (!progData || progData.error) break;
            progress = progData.progress;
            if (progData.downloadURL) dlUrl = progData.downloadURL;

            if (btn) {
              btn.innerHTML = `<div>${translations[currentLang]?.["btn-processing"] || "Processing..."} (${attempts + 1}/${maxAttempts})</div>`;
            }
            updateProgress(
              Math.min(90, 10 + Math.round(((attempts + 1) / maxAttempts) * 80)),
              `Converting with ytmp3... (${attempts + 1}/${maxAttempts})`,
            );

            if (progress >= 3) break;
            attempts++;
          }

          if (dlUrl && progress >= 3) {
            if (dlUrl.startsWith("//")) dlUrl = "https:" + dlUrl;
            if (dlUrl.startsWith("/")) dlUrl = "https://ytmp3.mobi" + dlUrl;
            downloadUrl = dlUrl;
          }
        }
      }
    } catch (mobiErr) {
      console.warn("ytmp3.mobi engine failed, falling back to convert1s:", mobiErr);
    }

    if (!downloadUrl && !checkCancelled()) {
      try {
        if (btn) {
          btn.innerHTML = `<div>${translations[currentLang]?.["btn-processing"] || "Processing..."} (convert1s)</div>`;
        }
        updateProgress(15, "Converting with ytmp3.gg...");

        const headers = {
          Origin: "https://media.ytmp3.gg",
          Referer: "https://media.ytmp3.gg/",
          "User-Agent": getUserAgent(),
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        };

        let conv = null;
        for (let initAttempt = 1; initAttempt <= 2; initAttempt++) {
          if (checkCancelled()) return { cancelled: true };
          try {
            if (initAttempt > 1) {
              await new Promise((r) => setTimeout(r, 1500));
            }
            const convRes = await scraperFetch({
              url: "https://hub.convert1s.com/api/download",
              method: "POST",
              headers,
              data: JSON.stringify({
                url: `https://www.youtube.com/watch?v=${ytId}`,
                os: "macos",
                output: {
                  type: format === "mp4" ? "video" : "audio",
                  format,
                  quality,
                },
                audio: { bitrate: "128k" },
              }),
            });
            let parsedConv = convRes;
            if (typeof parsedConv === "string")
              parsedConv = JSON.parse(parsedConv);
            if (parsedConv && !parsedConv.error && parsedConv.statusUrl) {
              conv = parsedConv;
              break;
            }
          } catch (_) {}
        }

        if (conv && conv.statusUrl) {
          let pollCount = 0;
          const maxPolls = 30;
          while (!downloadUrl && pollCount < maxPolls) {
            if (checkCancelled()) return { cancelled: true };
            if (btn) {
              btn.innerHTML = `<div>${translations[currentLang]?.["btn-processing"] || "Processing..."} (${pollCount + 1}/${maxPolls})</div>`;
            }
            updateProgress(
              Math.min(90, 20 + pollCount * 2),
              `Converting... (${pollCount + 1}/${maxPolls})`,
            );

            await new Promise((r) => setTimeout(r, 1500));
            try {
              const pollData = await scraperFetch({
                url: conv.statusUrl,
                headers: {
                  Origin: "https://media.ytmp3.gg",
                  Referer: "https://media.ytmp3.gg/",
                  "User-Agent": getUserAgent(),
                  Accept: "application/json, text/plain, */*",
                },
              });
              let poll =
                typeof pollData === "string"
                  ? JSON.parse(pollData)
                  : pollData;
              if (poll && poll.status === "completed" && poll.downloadUrl) {
                downloadUrl = poll.downloadUrl;
                break;
              }
              if (poll && (poll.status === "error" || poll.status === "failed")) {
                break;
              }
            } catch (_) {}
            pollCount++;
          }
        }
      } catch (ggErr) {
        console.warn("convert1s engine failed:", ggErr);
      }
    }

    if (checkCancelled()) return { cancelled: true };

    if (downloadUrl) {
      actualDownloadUrl = downloadUrl;
    } else {
      throw new Error(
        "Failed to convert YouTube track. All download servers were unreachable.",
      );
    }
  } else {
    // Handle SnapSave tokens or general worker resolves
    let resolved = false;
    let pollCount = 0;
    const maxPolls = 20;

    while (!resolved && pollCount < maxPolls) {
      if (checkCancelled()) return { cancelled: true };

      if (btn) {
        btn.innerHTML = `<div>${translations[currentLang]?.["btn-processing"] || "Processing..."} ${pollCount > 0 ? `(${pollCount})` : ""}</div>`;
      }
      updateProgress(
        Math.min(90, 10 + pollCount * 4),
        `Resolving URL... (${pollCount + 1}/${maxPolls})`,
      );

      try {
        const statusRes = await scraperFetch(
          {
            url: actualDownloadUrl,
            rawResponse: true,
          },
          "Resolver",
        );

        if (statusRes && statusRes.data) {
          let data = statusRes.data;
          if (typeof data === "string") {
            try {
              data = JSON.parse(data);
            } catch (_) {}
          }

          if (data.fileUrl || data.url || data.download_url) {
            actualDownloadUrl = data.fileUrl || data.url || data.download_url;
            resolved = true;
          } else if (data.status === "success" && data.download_url) {
            actualDownloadUrl = data.download_url;
            resolved = true;
          } else if (typeof data === "string" && data.includes('"fileUrl":')) {
            const match = data.match(/"fileUrl"\s*:\s*"([^"]+)"/);
            if (match) {
              actualDownloadUrl = match[1];
              resolved = true;
            }
          }
        }
      } catch (err) {
        console.warn("Poll attempt failed", err);
      }

      if (!resolved) {
        pollCount++;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    if (!resolved) {
      throw new Error("Unable to resolve download URL");
    }
  }

  return { url: actualDownloadUrl, cancelled: false };
}
