import {
  CapacitorHttp,
  CHROME_UA,
  getCookiesFromHeaders,
  decodeSnapSave,
  extractFinalUrl,
  serializeData,
} from "./utils.js";

export async function scrapeSoundCloud(url) {
  try {
    const r1 = await CapacitorHttp.get({
      url: "https://www.klickaud.org/en14",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const cookies = getCookiesFromHeaders(r1.headers);

    await CapacitorHttp.post({
      url: "https://www.klickaud.org/download.php",
      data: { value: url },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
        "User-Agent": "Mozilla/5.0",
      },
    });

    return await scrapeProxy(url);
  } catch (e) {
    return await scrapeProxy(url);
  }
}

export async function scrapeThreads(url) {
  try {
    const mainRes = await CapacitorHttp.get({
      url: "https://threadster.app/",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const cookies = mainRes.headers["set-cookie"] || "";

    const dlRes = await CapacitorHttp.post({
      url: "https://threadster.app/download",
      data: { url },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
      },
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(dlRes.data, "text/html");
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
    return { status: true, result: { title: "Threads Media", downloads } };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

export async function scrapeTikTok(url) {
  let currentStatus = null;
  try {
    const mainRes = await CapacitorHttp.get({
      url: "https://snaptik.app/en",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    currentStatus = mainRes.status;

    const parser = new DOMParser();
    const doc = parser.parseFromString(mainRes.data, "text/html");
    const token = doc.querySelector('input[name="token"]')?.value;
    if (!token) throw new Error("Scraper outdated (token missing).");

    const abcRes = await CapacitorHttp.post({
      url: "https://snaptik.app/abc2.php",
      data: { token, url },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    currentStatus = abcRes.status;

    const script1 = abcRes.data;
    const script2 = await new Promise((resolve, reject) => {
      try {
        const mockEval = (s) => resolve(s);
        const fn = new Function("eval", script1);
        fn(mockEval);
      } catch (e) {
        reject(new Error("Scraper outdated (eval failed)."));
      }
    });

    const capturedHtml = await new Promise((resolve, reject) => {
      let html = "";
      const context = {
        $: () => ({
          set innerHTML(t) {
            html = t;
          },
          remove: () => {},
          style: { display: "" },
        }),
        app: { showAlert: (msg) => reject(new Error(msg)) },
        document: { getElementById: () => ({ src: "" }) },
        fetch: () => {
          resolve(html);
          return { json: () => Promise.resolve({ thumbnail_url: "" }) };
        },
        gtag: () => {},
        Math: { round: () => 0 },
        XMLHttpRequest: function () {
          return { open: () => {}, send: () => {} };
        },
        window: { location: { hostname: "snaptik.app" } },
        setTimeout: () => {},
        setInterval: () => {},
        console: { log: () => {} },
        URL: { createObjectURL: () => "" },
      };
      try {
        const fn = new Function(...Object.keys(context), script2);
        fn(...Object.values(context));
      } catch (e) {
        reject(new Error("DOM Simulation failed."));
      }
    });

    const resDoc = parser.parseFromString(capturedHtml, "text/html");
    const downloads = [];
    resDoc.querySelectorAll("a").forEach((a) => {
      let href = a.getAttribute("href");
      let text = a.textContent.trim().toLowerCase();
      if (href) {
        if (href.startsWith("/")) href = "https://snaptik.app" + href;
        const isCdnLink =
          href.includes("acxcdn.com") ||
          href.includes("token=") ||
          href.includes("download.php");
        const isWebRedirect =
          href.includes("/en/download") || href.includes("/id/download");

        if (isCdnLink && !isWebRedirect) {
          if (text.includes("app")) return;
          let label = "VIDEO";
          if (text.includes("music") || text.includes("mp3")) label = "MP3";
          if (text.includes("photo")) label = "PHOTO";
          const isMirror =
            (label === "VIDEO" && downloads.some((d) => d.type === "VIDEO")) ||
            (label === "MP3" && downloads.some((d) => d.type === "MP3"));
          downloads.push({ type: label, url: href, isMirror });
        }
      }
    });

    const titleEl =
      resDoc.querySelector(".video-title") || resDoc.querySelector("h3");
    if (titleEl) titleEl.querySelectorAll("a").forEach((a) => a.remove());
    const title = titleEl?.textContent?.trim() || "TikTok Content";
    const thumbEl = resDoc.querySelector("img");
    const thumb = thumbEl
      ? thumbEl.getAttribute("src")?.startsWith("/")
        ? "https://snaptik.app" + thumbEl.getAttribute("src")
        : thumbEl.getAttribute("src")
      : null;

    return {
      status: true,
      result: { title, thumbnail: thumb, downloads, sourceUrl: url },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeInstagram(url) {
  let currentStatus = null;
  try {
    const cleanUrl = url.split("?")[0];
    const r1 = await CapacitorHttp.get({
      url: "https://indown.io/",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    currentStatus = r1.status;
    const parser = new DOMParser();
    const doc1 = parser.parseFromString(r1.data, "text/html");
    const cookies = getCookiesFromHeaders(r1.headers);
    const token = doc1.querySelector('input[name="_token"]')?.value;

    if (!token) throw new Error("Scraper outdated (token missing).");

    const r2 = await CapacitorHttp.post({
      url: "https://indown.io/download",
      data: { link: cleanUrl, _token: token },
      headers: {
        Cookie: cookies,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
      },
    });
    currentStatus = r2.status;

    const doc2 = parser.parseFromString(r2.data, "text/html");
    const downloads = [];
    let thumbnail = null;

    doc2
      .querySelectorAll(".container .row .col-md-4, .row .col-md-4")
      .forEach((el) => {
        const a = el.querySelector("a");
        const img = el.querySelector("img");
        let href = a?.getAttribute("href");
        let imgSrc = img?.getAttribute("src");

        if (imgSrc && !imgSrc.includes("logo")) {
          imgSrc = imgSrc.startsWith("/")
            ? "https://indown.io" + imgSrc
            : imgSrc;
          if (!thumbnail) thumbnail = imgSrc;
        }

        if (href && href.includes("fetch?url=")) {
          if (href.startsWith("/")) href = "https://indown.io" + href;
          let realUrl = href;
          try {
            realUrl = decodeURIComponent(href.split("fetch?url=")[1]);
          } catch (e) {}

          const type =
            href.includes(".mp4") ||
            href.includes("video") ||
            realUrl.includes(".mp4")
              ? "VIDEO"
              : "IMAGE";
          const isMirror = downloads.some((d) => d.url === href);
          downloads.push({ type, url: href, thumbnail: realUrl, isMirror });
        }
      });

    if (downloads.length === 0) {
      doc2.querySelectorAll("a").forEach((a) => {
        let href = a.getAttribute("href");
        if (href && href.includes("fetch?url=")) {
          if (href.startsWith("/")) href = "https://indown.io" + href;
          const type =
            href.includes(".mp4") || href.includes("video") ? "VIDEO" : "IMAGE";
          const isMirror = downloads.some((d) => d.url === href);
          downloads.push({ type, url: href, isMirror });
        }
      });
    }

    if (downloads.length === 0)
      throw new Error("Media links not found. Post might be private.");

    const title =
      doc2.querySelector("h5")?.textContent?.trim() || "Instagram Content";
    if (!thumbnail) {
      const img = doc2.querySelector('.row img:not([src*="logo"])');
      if (img)
        thumbnail = img.src.startsWith("/")
          ? "https://indown.io" + img.src
          : img.src;
    }

    return {
      status: true,
      result: { title, thumbnail, downloads, sourceUrl: url },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeYouTube(url) {
  let currentStatus = null;
  try {
    const res = await CapacitorHttp.post({
      url: "https://app.ytdown.to/proxy.php",
      data: { url: url },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0",
      },
    });
    currentStatus = res.status;

    const data = res.data;
    if (!data || !data.api || data.api.status !== "ok") {
      throw new Error(data?.api?.message || "YouTube scraper error.");
    }

    const { title, imagePreviewUrl, mediaItems } = data.api;
    const downloads = mediaItems.map((item) => ({
      type: `${item.mediaExtension.toUpperCase()} ${item.mediaQuality}`,
      url: item.mediaUrl,
    }));

    return {
      status: true,
      result: {
        title: title || "YouTube Content",
        thumbnail: imagePreviewUrl,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeTwitter(url) {
  let currentStatus = null;
  try {
    const twitterUrl = url.replace(
      /https:\/\/(fixupx|fxtwitter|vxtwitter|nitter|twitter)\.com/g,
      "https://x.com",
    );
    const r1 = await CapacitorHttp.get({
      url: "https://tweeload.com/en",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    currentStatus = r1.status;

    const parser = new DOMParser();

    const r2 = await CapacitorHttp.post({
      url: "https://tweeload.com/en/download",
      data: serializeData({ url: twitterUrl }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
      },
    });
    currentStatus = r2.status;

    const doc2 = parser.parseFromString(r2.data, "text/html");
    const downloads = [];

    doc2
      .querySelectorAll(".download__item__info__actions tbody tr")
      .forEach((tr) => {
        const tds = tr.querySelectorAll("td");
        const quality = tds[0]?.textContent?.trim();
        let dlUrl = tr
          .querySelector("a.download__item__info__actions__button")
          ?.getAttribute("href");
        if (dlUrl) {
          if (dlUrl.startsWith("/")) dlUrl = "https://tweeload.com" + dlUrl;
          const label = quality ? quality + " VIDEO" : "VIDEO";
          const isMirror = downloads.some((d) => d.type.includes("VIDEO"));
          downloads.push({ type: label, url: dlUrl, isMirror });
        }
      });

    if (downloads.length === 0) {
      doc2.querySelectorAll("a.btn").forEach((a) => {
        let href = a.getAttribute("href");
        if (
          href &&
          (href.includes("downloads.acxcdn.com") ||
            href.includes("twimg.com") ||
            href.includes("tweeload"))
        ) {
          const text = a.textContent.trim();
          if (text.toLowerCase() !== "download via the mobile app") {
            const isImage =
              href.includes("/image?") || text.toLowerCase().includes("image");
            const isVideo = !isImage;
            const label = isVideo
              ? text.includes("HD")
                ? "HD VIDEO"
                : "VIDEO"
              : "IMAGE";
            const isMirror =
              isVideo && downloads.some((d) => d.type.includes("VIDEO"));
            downloads.push({ type: label, url: href, isMirror });
          }
        }
      });
    }

    if (downloads.length === 0) throw new Error("Twitter links not found.");

    const name = doc2
      .querySelector(".download__item__info__user__name")
      ?.textContent?.trim();
    const handle = doc2
      .querySelector(".download__item__info__user__handle")
      ?.textContent?.trim();
    return {
      status: true,
      result: {
        title: name ? `${name} (${handle})` : "Twitter Content",
        thumbnail: null,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeSpotify(url) {
  let currentStatus = null;
  try {
    const r1 = await CapacitorHttp.get({
      url: "https://spotidown.app/",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    currentStatus = r1.status;

    const parser = new DOMParser();
    const doc1 = parser.parseFromString(r1.data, "text/html");

    const form = doc1.querySelector('form[name="spotifyurl"]');
    const data = { url: url };
    form?.querySelectorAll("input").forEach((input) => {
      const name = input.getAttribute("name");
      const value = input.getAttribute("value") || "";
      if (name && name !== "url") data[name] = value;
    });

    const r2 = await CapacitorHttp.post({
      url: "https://spotidown.app/action",
      data: serializeData(data),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": CHROME_UA,
        Origin: "https://spotidown.app",
        Referer: "https://spotidown.app/",
      },
    });

    let r2Data = r2.data;
    if (typeof r2Data === "string") {
      try {
        r2Data = JSON.parse(r2Data);
      } catch (e) {}
    }

    if (r2Data.error) throw new Error(r2Data.message || "Spotify error");

    let finalHtml = r2Data.data;
    const doc2 = parser.parseFromString(finalHtml, "text/html");
    const form2 = doc2.querySelector('form[name="submitspurl"]');

    if (form2) {
      const data2 = {};
      form2.querySelectorAll("input").forEach((input) => {
        const name = input.getAttribute("name");
        const value = input.getAttribute("value") || "";
        if (name) data2[name] = value;
      });

      const r3 = await CapacitorHttp.post({
        url: "https://spotidown.app/action/track",
        data: serializeData(data2),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": CHROME_UA,
          Origin: "https://spotidown.app",
          Referer: "https://spotidown.app/",
        },
      });

      let r3Data = r3.data;
      if (typeof r3Data === "string") {
        try {
          r3Data = JSON.parse(r3Data);
        } catch (e) {}
      }
      finalHtml = r3Data.data || r3Data;
    }

    const doc3 = parser.parseFromString(finalHtml, "text/html");
    const title =
      doc3.querySelector("h3")?.textContent?.trim() || "Spotify Track";
    const artist = doc3.querySelector("p")?.textContent?.trim();
    const thumbnail = doc3.querySelector("img")?.getAttribute("src");
    const downloads = [];

    doc3.querySelectorAll("a").forEach((a) => {
      const link = a.getAttribute("href");
      const text = a.textContent.trim();
      if (
        link &&
        link.startsWith("http") &&
        !link.includes("premium.html") &&
        text !== "Download Another Song"
      ) {
        downloads.push({ type: text || "MP3", url: link });
      }
    });

    return {
      status: true,
      result: {
        title: artist ? `${artist} - ${title}` : title,
        thumbnail,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapePinterest(url) {
  let currentStatus = null;
  try {
    const r1 = await CapacitorHttp.get({
      url: "https://pindown.io/",
      headers: { "User-Agent": CHROME_UA },
    });
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

    const r2 = await CapacitorHttp.post({
      url: "https://pindown.io/action",
      data: { url, [tokenName]: tokenValue, lang: "en" },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookies,
        "User-Agent": CHROME_UA,
      },
    });
    currentStatus = r2.status;

    let r2Data = r2.data;
    if (typeof r2Data === "string") r2Data = JSON.parse(r2Data);

    const doc2 = parser.parseFromString(r2Data.html, "text/html");
    const downloads = [];
    doc2.querySelectorAll(".columns .column").forEach((el) => {
      const title = el.querySelector(".is-size-6")?.textContent?.trim();
      const dlUrl = el.querySelector(".button")?.getAttribute("href");
      if (dlUrl) downloads.push({ type: title || "DOWNLOAD", url: dlUrl });
    });

    return {
      status: true,
      result: {
        title: doc2.querySelector("h3")?.textContent?.trim() || "Pinterest",
        thumbnail: doc2.querySelector(".image img")?.getAttribute("src"),
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeAppleMusic(url) {
  let currentStatus = null;
  try {
    const headers = {
      "User-Agent": CHROME_UA,
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
    };

    const r1 = await CapacitorHttp.get({
      url: "https://aplmate.com/",
      headers: { ...headers, Accept: "text/html" },
    });
    currentStatus = r1.status;
    const cookies = getCookiesFromHeaders(r1.headers);

    const r2 = await CapacitorHttp.post({
      url: "https://aplmate.com/action/userverify",
      data: serializeData({ url }),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookies,
      },
    });

    let r2Data = r2.data;
    if (typeof r2Data === "string") r2Data = JSON.parse(r2Data);
    const token = r2Data.success ? r2Data.token : null;
    if (!token) throw new Error(r2Data.message || "Verification failed.");

    const r3 = await CapacitorHttp.post({
      url: "https://aplmate.com/action",
      data: serializeData({ url, "cf-turnstile-response": token }),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
      },
    });

    let r3Data = r3.data;
    if (typeof r3Data === "string") r3Data = JSON.parse(r3Data);
    if (r3Data.error) throw new Error(r3Data.message || "Action failed.");

    const parser = new DOMParser();
    let finalHtml = r3Data.html;
    const doc2 = parser.parseFromString(finalHtml, "text/html");
    const form2 = doc2.querySelector('form[name="submitapurl"]');

    if (form2) {
      const data2 = {};
      form2.querySelectorAll("input").forEach((input) => {
        const name = input.getAttribute("name");
        const value = input.getAttribute("value") || "";
        if (name) data2[name] = value;
      });

      const r4 = await CapacitorHttp.post({
        url: "https://aplmate.com/action/track",
        data: serializeData(data2),
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies,
        },
      });
      let r4Data = r4.data;
      if (typeof r4Data === "string") r4Data = JSON.parse(r4Data);
      finalHtml = r4Data.data || r4Data;
    }

    const doc3 = parser.parseFromString(finalHtml, "text/html");
    const title =
      doc3.querySelector(".hover-underline")?.textContent?.trim() ||
      doc3.querySelector("h3")?.textContent?.trim() ||
      "Apple Music Content";
    const artist = doc3.querySelector("p")?.textContent?.trim();
    const thumbnail = doc3.querySelector("img")?.getAttribute("src");
    const downloads = [];

    doc3.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      const text = a.textContent.trim();
      if (
        href &&
        (href.includes("/dl?token=") || a.classList.contains("abutton"))
      ) {
        if (href.includes("ko-fi.com") || href.includes("premium.html")) return;
        if (text.toLowerCase().includes("another song")) return;
        downloads.push({
          type: text || "MP3",
          url: href.startsWith("http") ? href : "https://aplmate.com" + href,
        });
      }
    });

    return {
      status: true,
      result: {
        title: artist ? `${artist} - ${title}` : title,
        thumbnail,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeFacebook(url) {
  let currentStatus = null;
  try {
    const headers = {
      "User-Agent": CHROME_UA,
      Origin: "https://snapsave.app",
      Referer: "https://snapsave.app/id",
    };

    const r1 = await CapacitorHttp.get({
      url: "https://snapsave.app/id",
      headers: { ...headers, Accept: "text/html" },
    });
    currentStatus = r1.status;
    const cookies = getCookiesFromHeaders(r1.headers);

    const r2 = await CapacitorHttp.post({
      url: "https://snapsave.app/action.php?lang=id",
      data: serializeData({ url }),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
      },
    });
    currentStatus = r2.status;

    const decodedHtml = decodeSnapSave(r2.data);
    const parser = new DOMParser();
    const doc = parser.parseFromString(decodedHtml, "text/html");
    const downloads = [];

    doc.querySelectorAll("table tbody tr").forEach((tr) => {
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
      if (extracted && extracted.url.startsWith("http")) {
        downloads.push({ type: quality || "VIDEO", url: extracted.url });
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

    return {
      status: true,
      result: { title: "Facebook Media", thumbnail, downloads, sourceUrl: url },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeBandcamp(url) {
  let currentStatus = null;
  try {
    const headers = {
      "User-Agent": CHROME_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    };

    // Step 1: Get CSRF
    const r1 = await CapacitorHttp.get({
      url: "https://bandcampdownloader.app/",
      headers,
    });
    currentStatus = r1.status;
    const cookies = getCookiesFromHeaders(r1.headers);
    const parser = new DOMParser();
    const doc1 = parser.parseFromString(r1.data, "text/html");

    const csrfInput = doc1.querySelector('form[name="submitbcurl"] input[type="hidden"]');
    const csrfName = csrfInput?.getAttribute("name");
    const csrfValue = csrfInput?.getAttribute("value");

    if (!csrfName || !csrfValue) throw new Error("CSRF token not found.");

    // Step 2: Process URL
    const r2 = await CapacitorHttp.post({
      url: "https://bandcampdownloader.app/action",
      data: serializeData({ url, [csrfName]: csrfValue }),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
      },
    });
    currentStatus = r2.status;

    let r2Data = r2.data;
    if (typeof r2Data === "string") r2Data = JSON.parse(r2Data);

    if (r2Data.error) throw new Error(r2Data.message || "Failed to process URL.");
    if (!r2Data.success || !r2Data.html) throw new Error("Unexpected response.");

    const doc2 = parser.parseFromString(r2Data.html, "text/html");
    const trackForms = doc2.querySelectorAll('form[name="submitapurl"]');
    if (trackForms.length === 0) throw new Error("No tracks found.");

    const firstDataB64 = trackForms[0].querySelector('input[name="data"]')?.value;
    const firstMeta = JSON.parse(atob(firstDataB64));

    const downloads = [];
    const isAlbum = trackForms.length > 1;

    for (let i = 0; i < trackForms.length; i++) {
      const form = trackForms[i];
      const dataVal = form.querySelector('input[name="data"]')?.value;
      const baseVal = form.querySelector('input[name="base"]')?.value;
      const tokenVal = form.querySelector('input[name="token"]')?.value;
      const meta = JSON.parse(atob(dataVal));

      const r3 = await CapacitorHttp.post({
        url: "https://bandcampdownloader.app/action/track",
        data: serializeData({ data: dataVal, base: baseVal, token: tokenVal, type: "320" }),
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies,
        },
      });

      let r3Data = r3.data;
      if (typeof r3Data === "string") r3Data = JSON.parse(r3Data);
      if (r3Data.error) continue;

      const doc3 = parser.parseFromString(r3Data.data, "text/html");
      doc3.querySelectorAll("a.abutton").forEach((a) => {
        const href = a.getAttribute("href");
        const label = a.textContent.trim();
        if (href && href.includes("/dl?token=")) {
          const prefix = isAlbum ? `${(i + 1).toString().padStart(2, "0")}. ` : "";
          downloads.push({
            type: `${prefix}${label}`,
            url: `https://bandcampdownloader.app${href}`,
          });
        }
      });
    }

    if (downloads.length === 0) throw new Error("Download links not found.");

    return {
      status: true,
      result: {
        title: isAlbum ? (firstMeta.album || firstMeta.name) : firstMeta.name,
        thumbnail: firstMeta.cover,
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapePixiv(url) {
  let currentStatus = null;
  try {
    const illustIdMatch = url.match(/artworks\/(\d+)/) || url.match(/illust_id=(\d+)/);
    if (!illustIdMatch) throw new Error("Invalid Pixiv URL.");
    const illustId = illustIdMatch[1];

    const res = await CapacitorHttp.get({
      url: `https://www.phixiv.net/api/info?id=${illustId}`,
    });
    currentStatus = res.status;

    const data = res.data;
    if (data.error || !data.image_proxy_urls) {
      throw new Error("Artwork data secured/blocked.");
    }

    let downloads = data.image_proxy_urls.map((u, i) => {
      let type = "IMAGE";
      if (u.toLowerCase().includes(".mp4")) type = "VIDEO";
      if (data.is_ugoira && type === "VIDEO") type = "UGOIRA (MP4)";
      else if (data.image_proxy_urls.length > 1 && !data.is_ugoira) type = `PAGE ${i + 1}`;
      return { type, url: u };
    });

    if (data.is_ugoira && downloads.some(d => d.type.includes("VIDEO"))) {
      downloads = downloads.filter(d => d.type.includes("VIDEO"));
    }

    return {
      status: true,
      result: {
        title: data.title ? `${data.title} by ${data.author_name || "Unknown"}` : "Pixiv Artwork",
        thumbnail: data.image_proxy_urls[0],
        downloads,
        sourceUrl: url,
      },
    };
  } catch (err) {
    return { status: false, message: err.message, statusCode: currentStatus };
  }
}

export async function scrapeProxy(url) {


  try {
    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return await res.json();
  } catch (e) {
    return { status: false, message: "Local server not available." };
  }
}
