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
    !url.toLowerCase().match(/\.(mp4|mp3|m4a|zip|pdf|jpg|jpeg|png|webp)(\?|$)/)
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
      throw lastErr || new Error("Could not resolve Apple Music download link");
    }
  } else if (url.startsWith("spotidown_resolve:")) {
    if (btn) {
      btn.innerHTML =
        translations[currentLang]?.["btn-processing"] || "Processing...";
    }
    updateProgress(20, "Resolving Spotify track...");

    function createMultipartBody(fields) {
      const boundary =
        "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
      let body = "";
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) {
          body += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
        }
      }
      body += `--${boundary}--\r\n`;
      return {
        body,
        contentType: `multipart/form-data; boundary=${boundary}`,
      };
    }

    const parts = url.replace("spotidown_resolve:", "").split("|||");
    let dataVal = parts[0] || "";
    let tokenVal = parts[1] || "";
    let baseVal = parts[2] ? decodeURIComponent(parts[2]) : "";
    let cookiesStr = parts[3] ? decodeURIComponent(parts[3]) : "";

    // Backward compatibility if encoded as payloadStr|||cookies
    if (dataVal.includes("=") && (!tokenVal || !tokenVal.startsWith("http"))) {
      try {
        const sp = new URLSearchParams(dataVal);
        if (sp.has("data")) dataVal = sp.get("data") || "";
        if (sp.has("token")) tokenVal = sp.get("token") || "";
        if (sp.has("base")) baseVal = sp.get("base") || "";
        if (parts[1]) cookiesStr = decodeURIComponent(parts[1]);
      } catch (_) {}
    }

    let foundLink = "";
    let lastErr = null;
    const maxResolveAttempts = 3;

    for (let attempt = 1; attempt <= maxResolveAttempts; attempt++) {
      if (checkCancelled()) return { cancelled: true };
      try {
        if (attempt > 1 || !cookiesStr) {
          if (attempt > 1) {
            updateProgress(
              20,
              `Resolving Spotify track (Retry ${attempt}/${maxResolveAttempts})...`,
            );
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
          try {
            const trackUrl = baseVal || "https://open.spotify.com";
            const rSession = await scraperFetch({
              url: "https://spotidown.app/action",
              method: "POST",
              data: `url=${encodeURIComponent(trackUrl)}&g-recaptcha-response=dummy_token`,
              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": getUserAgent(),
                "X-Requested-With": "XMLHttpRequest",
                Origin: "https://spotidown.app",
                Referer: "https://spotidown.app/",
              },
              rawResponse: true,
            });
            const freshCookies = getCookiesFromHeaders(rSession.headers);
            if (freshCookies) cookiesStr = freshCookies;
          } catch (_) {}
        }

        const mp = createMultipartBody({
          data: dataVal,
          base: baseVal,
          token: tokenVal,
        });

        const reqHeaders = {
          "Content-Type": mp.contentType,
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
            data: mp.body,
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
        if (dd && dd.error && dd.message) {
          lastErr = new Error(dd.message);
          cookiesStr = "";
        }
        let dlHtml = (typeof dd === "object" ? dd?.data || dd?.html : dd) || "";
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
      throw lastErr || new Error("Could not resolve SpotiDown download link");
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
    const baseVal = parts[2] ? decodeURIComponent(parts[2]) : "";
    let cookiesStr = parts[3] ? decodeURIComponent(parts[3]) : "";
    const BASE = "https://spotimate.app";

    function createMultipartBody(fields) {
      const boundary =
        "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
      let body = "";
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null) {
          body += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
        }
      }
      body += `--${boundary}--\r\n`;
      return {
        body,
        contentType: `multipart/form-data; boundary=${boundary}`,
      };
    }

    let matchLink = "";
    let lastErr = null;
    const maxResolveAttempts = 3;

    for (let attempt = 1; attempt <= maxResolveAttempts; attempt++) {
      if (checkCancelled()) return { cancelled: true };
      try {
        if (attempt > 1 || !cookiesStr) {
          if (attempt > 1) {
            updateProgress(
              20,
              `Resolving Spotify track (Retry ${attempt}/${maxResolveAttempts})...`,
            );
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
          try {
            const rHome = await scraperFetch({
              url: BASE + "/en1",
              headers: { "User-Agent": getUserAgent() },
              rawResponse: true,
            });
            let freshCookies = getCookiesFromHeaders(rHome.headers) || "";
            const rVerify = await scraperFetch({
              url: BASE + "/api/userverify",
              method: "POST",
              data: "url=" + encodeURIComponent(baseVal || "https://open.spotify.com"),
              headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": getUserAgent(),
                Referer: BASE + "/en1",
                Origin: BASE,
                ...(freshCookies ? { Cookie: freshCookies } : {}),
              },
              rawResponse: true,
            });
            const vCookies = getCookiesFromHeaders(rVerify.headers);
            if (vCookies) freshCookies = freshCookies ? `${freshCookies}; ${vCookies}` : vCookies;
            if (freshCookies) cookiesStr = freshCookies;
          } catch (_) {}
        }

        const mp = createMultipartBody({
          data: dataVal,
          token: tokenVal,
          track_token: tokenVal,
          ...(baseVal ? { base: baseVal } : {}),
        });

        const slHeaders = {
          "Content-Type": mp.contentType,
          "User-Agent": getUserAgent(),
          Referer: BASE + "/en1",
          Origin: BASE,
        };
        if (cookiesStr) slHeaders["Cookie"] = cookiesStr;

        const res = await scraperFetch(
          {
            url: BASE + "/action/track",
            method: "POST",
            headers: slHeaders,
            data: mp.body,
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
        if (dd && dd.error) {
          lastErr = new Error(dd.message || "Soundloaders error");
          cookiesStr = "";
        }
        let dlHtml = (typeof dd === "object" ? dd?.html || dd?.data : dd) || "";
        const parser = new DOMParser();
        const doc = parser.parseFromString(dlHtml, "text/html");
        doc.querySelectorAll("a").forEach((a) => {
          const href = a.getAttribute("href")?.trim();
          const text = a.textContent.trim();
          if (
            href &&
            href.startsWith("http") &&
            !href.includes("tunecable.com") &&
            !href.includes("premium") &&
            !text.toLowerCase().includes("cover") &&
            !href.includes("scdn.co") &&
            text !== "Download Another Song"
          ) {
            if (!matchLink) matchLink = href;
          }
        });
        if (!matchLink) {
          const match =
            dlHtml.match(
              /href=["'](https:\/\/(?:dl\.spotimate\.app|dl\.soundloaders\.app)[^"']+)["']/,
            ) ||
            dlHtml.match(
              /href=["'](https:\/\/[^"']*(?:cdnv1|\/v1\?token=)[^"']+)["']/,
            );
          if (match && match[1]) {
            matchLink = match[1];
          }
        }
        if (matchLink) break;
      } catch (err) {
        lastErr = err;
      }
    }

    // Fallback to SpotiDown if Soundloaders action/track fails
    if (!matchLink && baseVal) {
      updateProgress(35, "Connecting to Spotify backup resolver...");
      try {
        const rSession = await scraperFetch({
          url: "https://spotidown.app/action",
          method: "POST",
          data: `url=${encodeURIComponent(baseVal)}&g-recaptcha-response=dummy_token`,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": getUserAgent(),
            "X-Requested-With": "XMLHttpRequest",
            Origin: "https://spotidown.app",
            Referer: "https://spotidown.app/",
          },
          rawResponse: true,
        });
        const freshCookies = getCookiesFromHeaders(rSession.headers) || "";
        let rData = rSession.data;
        if (typeof rData === "string") {
          try {
            rData = JSON.parse(rData);
          } catch (_) {}
        }
        const html = rData?.data || rData?.html || "";
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const form = doc.querySelector('form[name="submitspurl"]');
        if (form) {
          const spData = form.querySelector('input[name="data"]')?.value || "";
          const spToken =
            form.querySelector('input[name="token"]')?.value || "";
          const spBase =
            form.querySelector('input[name="base"]')?.value || baseVal;
          const trackMp = createMultipartBody({
            data: spData,
            base: spBase,
            token: spToken,
          });
          const dlRes = await scraperFetch({
            url: "https://spotidown.app/action/track",
            method: "POST",
            data: trackMp.body,
            headers: {
              "Content-Type": trackMp.contentType,
              "User-Agent": getUserAgent(),
              "X-Requested-With": "XMLHttpRequest",
              Origin: "https://spotidown.app",
              Referer: "https://spotidown.app/",
              ...(freshCookies ? { Cookie: freshCookies } : {}),
            },
            rawResponse: true,
          });
          let dd = dlRes.data;
          if (typeof dd === "string") {
            try {
              dd = JSON.parse(dd);
            } catch (_) {}
          }
          let dlHtml = dd?.data || dd?.html || "";
          const dlDoc = parser.parseFromString(dlHtml, "text/html");
          const dlLinks = Array.from(dlDoc.querySelectorAll("a"))
            .map((a) => a.getAttribute("href"))
            .filter(
              (h) =>
                h &&
                h.startsWith("http") &&
                !h.includes("premium.html") &&
                !h.includes("cover"),
            );
          if (dlLinks.length > 0) {
            matchLink = dlLinks[0];
          }
        }
      } catch (fbErr) {
        console.warn("SoundLoaders fallback error:", fbErr);
      }
    }

    if (matchLink) {
      updateProgress(50, "Starting MP3 download...");
      actualDownloadUrl = matchLink;
    } else {
      throw (
        lastErr || new Error("Could not resolve Soundloaders download link")
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

      const DEFAULT_API_KEY =
        "ytmp3_572dd96834f5c4a575b198d63e1df13e0caf73667c6fdfe39dc6160fb4246b55";
      const mobiHeaders = {
        Origin: "https://ytmp3.gl",
        Referer: "https://ytmp3.gl/",
        "User-Agent": getUserAgent(),
        Accept: "application/json, text/plain, */*",
      };

      const initData = await scraperFetch(
        {
          url: `https://fancy-sea-5d3d.holy-breeze-fec5.workers.dev/?m=i&k=${DEFAULT_API_KEY}&v=${ytId}&f=${format}&_=${Date.now()}`,
          headers: mobiHeaders,
        },
        "ytmp3.mobi Init",
      );

      if (initData && !initData.error) {
        let dlUrl = initData.downloadURL;
        let progUrl = initData.progressURL;
        let progress = 0;
        let attempts = 0;
        const maxAttempts = 30;

        if (initData.status === "progress" && progUrl) {
          while (progress < 3 && attempts < maxAttempts) {
            if (checkCancelled()) return { cancelled: true };

            await new Promise((r) => setTimeout(r, 1500));

            const progData = await scraperFetch(
              { url: `${progUrl}&_=${Date.now()}`, headers: mobiHeaders },
              "ytmp3.mobi Progress",
            );
            if (!progData || progData.error) break;
            if (progData.status === "download" && progData.downloadURL) {
              dlUrl = progData.downloadURL;
              break;
            }
            progress = progData.progress || 0;
            if (progData.downloadURL) dlUrl = progData.downloadURL;

            if (btn) {
              btn.innerHTML = `<div>${translations[currentLang]?.["btn-processing"] || "Processing..."} (${attempts + 1}/${maxAttempts})</div>`;
            }
            updateProgress(
              Math.min(
                90,
                10 + Math.round(((attempts + 1) / maxAttempts) * 80),
              ),
              `Converting with ytmp3... (${attempts + 1}/${maxAttempts})`,
            );

            if (progress >= 3) break;
            attempts++;
          }
        }

        if (dlUrl) {
          if (dlUrl.startsWith("//")) dlUrl = "https:" + dlUrl;
          if (dlUrl.startsWith("/")) {
            dlUrl =
              "https://fancy-sea-5d3d.holy-breeze-fec5.workers.dev" + dlUrl;
          }
          downloadUrl = dlUrl;
        }
      }
    } catch (mobiErr) {
      console.warn(
        "ytmp3.mobi engine failed, falling back to convert1s:",
        mobiErr,
      );
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
                typeof pollData === "string" ? JSON.parse(pollData) : pollData;
              if (poll && poll.status === "completed" && poll.downloadUrl) {
                downloadUrl = poll.downloadUrl;
                break;
              }
              if (
                poll &&
                (poll.status === "error" || poll.status === "failed")
              ) {
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
