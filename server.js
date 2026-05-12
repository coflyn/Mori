const axios = require("axios");
const cheerio = require("cheerio");
const FormData = require("form-data");
const qs = require("querystring");

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
];

async function snaptik(url) {
  try {
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    const client = axios.create({
      baseURL: "https://snaptik.app",
      headers: {
        "User-Agent": userAgent,
        Referer: "https://snaptik.app/",
        Origin: "https://snaptik.app",
      },
    });

    const { data: mainPage } = await client.get("/");
    const $main = cheerio.load(mainPage);
    const token = $main('input[name="token"]').val();

    if (!token) throw new Error("Could not find session token on SnapTik.");

    const form = new FormData();
    form.append("token", token);
    form.append("url", url);

    const { data: script1 } = await client.post("/abc2.php", form, {
      headers: { ...form.getHeaders() },
    });

    if (!script1 || !script1.includes("eval"))
      throw new Error("Invalid response from SnapTik.");

    const script2 = await new Promise((resolve) => {
      const mockEval = (s) => resolve(s);
      const fn = new Function("eval", script1);
      fn(mockEval);
    });

    const { html } = await new Promise((resolve, reject) => {
      let capturedHtml = "";
      const context = {
        $: () => ({
          set innerHTML(t) {
            capturedHtml = t;
          },
          remove: () => {},
          style: { display: "" },
        }),
        app: { showAlert: (msg) => reject(new Error(msg)) },
        document: { getElementById: () => ({ src: "" }) },
        fetch: () => {
          resolve({ html: capturedHtml });
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
      };
      try {
        const keys = Object.keys(context);
        const values = Object.values(context);
        const fn = new Function(...keys, script2);
        fn(...values);
        setTimeout(() => resolve({ html: capturedHtml }), 500);
      } catch (e) {
        reject(e);
      }
    });

    const $ = cheerio.load(html);
    const downloads = [];
    $("a").each((i, el) => {
      let link = $(el).attr("href");
      const text = $(el).text().trim().toLowerCase();
      if (link && link.startsWith("http")) {
        if (text.includes("app")) return;
        let label = "VIDEO";
        if (text.includes("music") || text.includes("mp3")) label = "MP3";
        if (text.includes("photo")) label = "PHOTO";

        const isMirror =
          (label === "VIDEO" && downloads.some((d) => d.type === "VIDEO")) ||
          (label === "MP3" && downloads.some((d) => d.type === "MP3"));

        downloads.push({ type: label, url: link, isMirror });
      }
    });

    const titleEl = $(".video-title").first();
    if (titleEl.length) {
      titleEl.find("a").remove();
    }
    const title = titleEl.text().trim() || "TikTok Content";
    return {
      status: true,
      result: { title, thumbnail: $("#thumbnail").attr("src"), downloads },
    };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

async function instagram(url) {
  try {
    const cleanUrl = url.split("?")[0];
    const res1 = await axios.get("https://indown.io/", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const cookies = res1.headers["set-cookie"]
      ? res1.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ")
      : "";
    const $ = cheerio.load(res1.data);
    const token = $('input[name="_token"]').val();

    const res2 = await axios.post(
      "https://indown.io/download",
      qs.stringify({ link: cleanUrl, _token: token }),
      {
        headers: {
          Cookie: cookies,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
        },
      },
    );

    const $2 = cheerio.load(res2.data);
    let downloads = [];
    $2(".container .row .col-md-4").each((i, el) => {
      const link = $2(el).find("a").attr("href");
      if (link && link.includes("fetch?url=")) {
        const decoded = decodeURIComponent(link);
        downloads.push({
          type: decoded.includes(".mp4") ? "VIDEO" : "IMAGE",
          url: link,
        });
      }
    });

    if (downloads.length === 0) {
      $2("a").each((i, el) => {
        const link = $2(el).attr("href");
        if (link && link.includes("fetch?url=")) {
          const decoded = decodeURIComponent(link);
          downloads.push({
            type: decoded.includes(".mp4") ? "VIDEO" : "IMAGE",
            url: link,
          });
        }
      });
    }

    return {
      status: true,
      result: {
        title: $2("h5").first().text().trim() || "Instagram Content",
        thumbnail: $2("img").first().attr("src"),
        downloads,
      },
    };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

async function youtube(url) {
  try {
    const { data } = await axios.post(
      "https://app.ytdown.to/proxy.php",
      qs.stringify({ url }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0",
        },
      },
    );

    if (!data || !data.api || data.api.status !== "ok")
      throw new Error("Failed to fetch YouTube data.");

    const downloads = data.api.mediaItems.map((item) => ({
      type: `${item.mediaExtension.toUpperCase()} ${item.mediaQuality}`,
      url: item.mediaUrl,
    }));

    return {
      status: true,
      result: {
        title: data.api.title || "YouTube Content",
        thumbnail: data.api.imagePreviewUrl,
        downloads,
      },
    };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

async function tweeload(url) {
  try {
    const twitterUrl = url.replace(
      /https:\/\/(fixupx|fxtwitter|vxtwitter|nitter|twitter|mobile\.twitter)\.com/g,
      "https://x.com",
    );
    const client = axios.create({
      baseURL: "https://tweeload.com",
      headers: {
        "User-Agent": userAgents[0],
        Referer: "https://tweeload.com/",
      },
    });

    const r1 = await client.get("/en");
    const cookies = r1.headers["set-cookie"];
    const cookieHeader = cookies
      ? cookies.map((c) => c.split(";")[0]).join("; ")
      : "";

    const params = new URLSearchParams();
    params.append("url", twitterUrl);

    const { data: html } = await client.post(
      "/en/download",
      params.toString(),
      {
        headers: {
          Cookie: cookieHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const $ = cheerio.load(html);
    const downloads = [];
    let mediaType = "VIDEO";

    $(".download__item__info__actions tbody tr").each((i, el) => {
      const $tds = $(el).find("td");
      const quality = $tds.eq(0).text().trim();
      const dlUrl = $(el)
        .find("a.download__item__info__actions__button")
        .attr("href");
      if (dlUrl) {
        if (dlUrl.includes("/image?")) mediaType = "IMAGE";
        downloads.push({ type: quality || "DOWNLOAD", url: dlUrl });
      }
    });

    if (downloads.length === 0) {
      $("a.btn").each((i, el) => {
        const href = $(el).attr("href");
        if (href && href.includes("downloads.acxcdn.com")) {
          const text = $(el).text().trim();
          if (text.toLowerCase() !== "download via the mobile app") {
            if (href.includes("/image?")) mediaType = "IMAGE";
            downloads.push({ type: text || "DOWNLOAD", url: href });
          }
        }
      });
    }

    if (downloads.length === 0)
      throw new Error("Failed to extract Twitter links.");

    const name = $(".download__item__info__user__name").first().text().trim();
    const handle = $(".download__item__info__user__handle")
      .first()
      .text()
      .trim();

    return {
      status: true,
      result: {
        title: `${name} (${handle})` || "Twitter Content",
        thumbnail: null,
        downloads,
      },
    };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

async function spotidown(url) {
  try {
    const headers = {
      "User-Agent": userAgents[0],
      Referer: "https://spotidown.app/",
      Origin: "https://spotidown.app",
    };

    const r1 = await axios.get("https://spotidown.app/", { headers });
    const cookies = r1.headers["set-cookie"];
    const $1 = cheerio.load(r1.data);
    const $form = $1('form[name="spotifyurl"]');

    const fd1 = new URLSearchParams();
    $form.find("input").each((i, el) => {
      const name = $1(el).attr("name");
      const value = $1(el).attr("value") || "";
      if (name && name !== "url") fd1.append(name, value);
    });
    fd1.append("url", url);

    const r2 = await axios.post(
      "https://spotidown.app/action",
      fd1.toString(),
      {
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies ? cookies.map((c) => c.split(";")[0]).join("; ") : "",
        },
      },
    );

    if (r2.data.error) throw new Error(r2.data.message || "Spotify error.");

    const $2 = cheerio.load(r2.data.data);
    const $form2 = $2('form[name="submitspurl"]');
    let finalHtml = r2.data.data;

    if ($form2.length) {
      const fd2 = new URLSearchParams();
      $form2.find("input").each((i, el) => {
        const name = $2(el).attr("name");
        const value = $2(el).attr("value") || "";
        if (name) fd2.append(name, value);
      });

      const r3 = await axios.post(
        "https://spotidown.app/action/track",
        fd2.toString(),
        {
          headers: {
            ...headers,
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: cookies
              ? cookies.map((c) => c.split(";")[0]).join("; ")
              : "",
          },
        },
      );
      finalHtml = r3.data.data;
    }

    const $3 = cheerio.load(finalHtml);
    const title =
      $3("h3").first().text().trim() ||
      $3("h1").first().text().trim() ||
      "Spotify Track";
    const artist = $3("p").first().text().trim();
    const thumbnail = $3("img").first().attr("src");
    const downloads = [];

    $3("a").each((i, el) => {
      const link = $3(el).attr("href");
      const text = $3(el).text().trim();
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
      },
    };
  } catch (e) {
    return { status: false, message: e.message };
  }
}

async function pindown(url) {
  try {
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    const client = axios.create({
      baseURL: "https://pindown.io",
      headers: {
        "User-Agent": userAgent,
        Referer: "https://pindown.io/",
        Origin: "https://pindown.io",
      },
    });

    const { data: homeHtml, headers: homeHeaders } = await client.get("/");
    const $home = cheerio.load(homeHtml);
    const tokenInput = $home('input[type="hidden"]').not('[name="lang"]');
    const tokenName = tokenInput.attr("name");
    const tokenValue = tokenInput.attr("value");

    if (!tokenName || !tokenValue)
      throw new Error("Could not find session token on pindown.io");

    const cookies = homeHeaders["set-cookie"];
    const cookieHeader = cookies
      ? cookies.map((c) => c.split(";")[0]).join("; ")
      : "";

    const formData = new URLSearchParams();
    formData.append("url", url);
    formData.append(tokenName, tokenValue);
    formData.append("lang", "en");

    const { data: actionData } = await client.post(
      "/action",
      formData.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          Cookie: cookieHeader,
        },
      },
    );

    if (!actionData.success || !actionData.html)
      throw new Error(
        actionData.message || "Failed to fetch download links from pindown.io",
      );

    const $ = cheerio.load(actionData.html);
    const downloads = [];

    $(".columns .column").each((i, el) => {
      const $el = $(el);
      const title = $el.find(".is-size-6").text().trim();
      const $btn = $el.find(".button");
      let downloadUrl = $btn.attr("href");
      const isApi =
        $btn.attr("onclick") && $btn.attr("onclick").includes("fetchVideoUrl");

      if (isApi) {
        const match = $btn.attr("onclick").match(/'([^']+)'/);
        if (match) downloadUrl = "https://pindown.io" + match[1];
      }

      if (downloadUrl) {
        downloads.push({
          type: title || "DOWNLOAD",
          url: downloadUrl,
          isApi: !!isApi,
        });
      }
    });

    for (let dl of downloads) {
      if (dl.isApi) {
        try {
          const { data: apiData } = await client.get(dl.url, {
            headers: { Cookie: cookieHeader },
          });
          if (apiData.success && apiData.url) dl.url = apiData.url;
        } catch (e) {}
      }
    }

    return {
      status: true,
      result: {
        title: $("h3").first().text().trim() || "Pinterest Content",
        thumbnail: $(".image img").attr("src"),
        downloads,
      },
    };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

async function aplmate(url) {
  try {
    const headers = {
      "User-Agent": userAgents[0],
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://aplmate.com/",
      Origin: "https://aplmate.com",
    };

    const r1 = await axios.get("https://aplmate.com/", {
      headers: { ...headers, Accept: "text/html" },
    });
    const cookies = r1.headers["set-cookie"];
    const cookieStr = cookies
      ? cookies.map((c) => c.split(";")[0]).join("; ")
      : "";

    const r2 = await axios.post(
      "https://aplmate.com/action/userverify",
      `url=${encodeURIComponent(url)}`,
      {
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: cookieStr,
        },
      },
    );

    const token = r2.data && r2.data.success ? r2.data.token : null;
    if (!token)
      throw new Error(
        r2.data.message || "Failed to get verification token from Aplmate.",
      );

    const fd1 = new URLSearchParams();
    fd1.append("url", url);
    fd1.append("cf-turnstile-response", token);

    const r3 = await axios.post("https://aplmate.com/action", fd1.toString(), {
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieStr,
      },
    });

    if (r3.data.error)
      throw new Error(r3.data.message || "Error during initial action.");

    const $2 = cheerio.load(r3.data.html);
    const $form2 = $2('form[name="submitapurl"]');
    let finalHtml = r3.data.html;

    if ($form2.length) {
      const fd2 = new URLSearchParams();
      $form2.find("input").each((i, el) => {
        const name = $2(el).attr("name");
        const value = $2(el).attr("value") || "";
        if (name) fd2.append(name, value);
      });

      const r4 = await axios.post(
        "https://aplmate.com/action/track",
        fd2.toString(),
        {
          headers: {
            ...headers,
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: cookieStr,
          },
        },
      );

      if (r4.data.error)
        throw new Error(r4.data.message || "Error during track action.");
      finalHtml = r4.data.data;
    }

    const $ = cheerio.load(finalHtml);
    const title =
      $(".hover-underline").first().text().trim() ||
      $("h3").first().text().trim() ||
      "Apple Music Content";
    const artist = $("p").first().text().trim();
    const thumbnail = $("img").first().attr("src");
    const downloads = [];

    $("a").each((i, el) => {
      const $el = $(el);
      const link = $el.attr("href");
      const text = $el.text().trim();
      if (link && (link.includes("/dl?token=") || $el.hasClass("abutton"))) {
        if (link.includes("ko-fi.com") || link.includes("premium.html")) return;
        if (text.toLowerCase().includes("another song")) return;
        downloads.push({
          type: text || "MP3",
          url: link.startsWith("http") ? link : "https://aplmate.com" + link,
        });
      }
    });

    return {
      status: true,
      result: {
        title: artist ? `${artist} - ${title}` : title,
        thumbnail,
        downloads,
      },
    };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

function decodeSnapSave(data) {
  try {
    const regex =
      /eval\(function\(h,u,n,t,e,r\)\{.*?\}\("(.*?)",(\d+),"(.*?)",(\d+),(\d+),(\d+)\)\)/;
    const match = data.match(regex);
    if (match) {
      const h = match[1],
        u = parseInt(match[2]),
        n = match[3],
        t = parseInt(match[4]),
        e = parseInt(match[5]);
      const delimiter = n[e],
        parts = h.split(delimiter);
      let decoded = "";
      for (let s of parts) {
        if (s === "") continue;
        let val = 0;
        for (let j = 0; j < s.length; j++)
          val += n.indexOf(s[j]) * Math.pow(e, s.length - 1 - j);
        decoded += String.fromCharCode(val - t);
      }
      return decodeURIComponent(escape(decoded));
    }
    return data;
  } catch (err) {
    return data;
  }
}

function extractFinalUrl(input) {
  if (!input) return null;
  let raw = input.trim().replace(/^["'\\]+|["'\\]+$/g, ""),
    isRender = false;

  if (raw.includes("get_progressApi")) {
    isRender = true;
    const tokenMatch = raw.match(/token=([^&'"]+)/);
    if (tokenMatch) raw = tokenMatch[1];
  }

  // Handle Base64/JWT-like tokens (SnapSave/Threadster)
  if (raw.includes(".") && !raw.startsWith("http")) {
    try {
      const parts = raw.split(".");
      // Check if it looks like a JWT (header.payload.signature) or just payload.sig
      const payloadPart = parts.length >= 2 ? parts[1] : parts[0];
      if (payloadPart) {
        const payload = JSON.parse(
          Buffer.from(payloadPart, "base64").toString(),
        );
        if (payload.video_url)
          return { url: payload.video_url, isRender: true };
        if (payload.url) return { url: payload.url, isRender: false };
      }
    } catch (e) {}
  }

  if (raw.startsWith("//")) return { url: "https:" + raw, isRender };
  if (raw.startsWith("/")) {
    if (input.includes("snapsave.app"))
      return { url: "https://snapsave.app" + raw, isRender };
    if (input.includes("threadster.app"))
      return { url: "https://threadster.app" + raw, isRender };
    return { url: "https://snapsave.app" + raw, isRender }; // default
  }
  return { url: raw, isRender };
}

async function snapsave(url) {
  try {
    const headers = {
      "User-Agent": userAgents[0],
      Origin: "https://snapsave.app",
      Referer: "https://snapsave.app/id",
    };
    const r1 = await axios.get("https://snapsave.app/id", { headers });
    const cookies = r1.headers["set-cookie"];
    const cookieStr = cookies
      ? cookies.map((c) => c.split(";")[0]).join("; ")
      : "";
    const params = new URLSearchParams();
    params.append("url", url);

    const response = await axios.post(
      "https://snapsave.app/action.php?lang=id",
      params.toString(),
      {
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieStr,
        },
      },
    );

    const decodedHtml = decodeSnapSave(response.data);
    const $ = cheerio.load(decodedHtml);
    const downloads = [];

    $("table tbody tr").each((i, el) => {
      const quality = $(el).find("td.video-quality").length
        ? $(el).find("td.video-quality").text().trim()
        : $(el).find("td").eq(0).text().trim();
      const linkAttr =
        $(el).find("a.btn-download").attr("href") ||
        $(el).find("button").attr("onclick") ||
        $(el).find("a").attr("href");
      const extracted = extractFinalUrl(linkAttr);
      if (extracted && extracted.url.startsWith("http")) {
        downloads.push({ type: quality || "VIDEO", url: extracted.url });
      }
    });

    if (downloads.length === 0)
      throw new Error("Could not extract download links.");
    return { status: true, result: { title: "Facebook Media", downloads } };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

async function klickaud(url) {
  try {
    const headers = {
      "User-Agent": userAgents[0],
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      Referer: "https://www.klickaud.org/en14",
      Origin: "https://www.klickaud.org",
    };

    const r1 = await axios.get("https://www.klickaud.org/en14", { headers });
    const cookies = r1.headers["set-cookie"];
    const cookieStr = cookies
      ? cookies.map((c) => c.split(";")[0]).join("; ")
      : "";

    let csrfToken = "";
    try {
      const rToken = await axios.get(
        "https://www.klickaud.org/csrf-token-endpoint.php",
        {
          headers: { ...headers, Cookie: cookieStr },
        },
      );
      csrfToken = rToken.data && rToken.data.csrf_token;
    } catch (e) {}

    const params = new URLSearchParams();
    params.append("value", url);
    if (csrfToken) params.append("csrf_token", csrfToken);

    await axios.post(
      "https://www.klickaud.org/download.php",
      params.toString(),
      {
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieStr,
        },
      },
    );

    const sseUrl = `https://www.klickaud.org/worker_sse.php?url=${encodeURIComponent(url)}`;

    return new Promise((resolve, reject) => {
      axios({
        method: "get",
        url: sseUrl,
        responseType: "stream",
        headers: {
          ...headers,
          Referer: "https://www.klickaud.org/download.php",
          Cookie: cookieStr,
          Accept: "text/event-stream",
        },
        timeout: 30000,
      })
        .then((response) => {
          let buffer = "";
          let found = false;

          response.data.on("data", (chunk) => {
            if (found) return;
            buffer += chunk.toString();

            // Process complete SSE messages
            const messages = buffer.split("\n\n");
            buffer = messages.pop(); // Keep incomplete message in buffer

            for (const message of messages) {
              if (message.includes("event: ready")) {
                const lines = message.split("\n");
                const dataLine = lines.find((l) => l.startsWith("data:"));
                if (dataLine) {
                  try {
                    const dataStr = dataLine.replace("data:", "").trim();
                    const data = JSON.parse(dataStr);
                    if (data.download_url) {
                      found = true;
                      resolve({
                        status: true,
                        result: {
                          title: data.file_name
                            ? data.file_name
                                .replace("_KLICKAUD.mp3", "")
                                .replace(/_/g, " ")
                            : "SoundCloud Track",
                          thumbnail: null,
                          type: "AUDIO",
                          downloads: [
                            {
                              type: "MP3 (128kbps)",
                              url: `/api/download-proxy?url=${encodeURIComponent(data.download_url)}&filename=${encodeURIComponent(data.file_name || "track.mp3")}`,
                            },
                          ],
                        },
                      });
                      response.data.destroy();
                      return;
                    }
                  } catch (e) {}
                }
              }
              if (message.includes("event: failed")) {
                found = true;
                reject(new Error("Worker failed."));
                response.data.destroy();
                return;
              }
            }
          });
          response.data.on("end", () => {
            if (!found) reject(new Error("Timeout."));
          });
        })
        .catch((err) => reject(err));
    });
  } catch (error) {
    return { status: false, message: error.message };
  }
}

async function threadster(url) {
  try {
    const headers = {
      "User-Agent": userAgents[0],
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      Origin: "https://threadster.app",
      Referer: "https://threadster.app/",
    };

    const r1 = await axios.get("https://threadster.app/", { headers });
    const cookies = r1.headers["set-cookie"];
    const cookieStr = cookies
      ? cookies.map((c) => c.split(";")[0]).join("; ")
      : "";

    const params = new URLSearchParams();
    params.append("url", url);

    const response = await axios.post(
      "https://threadster.app/download",
      params.toString(),
      {
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieStr,
        },
      },
    );

    const $ = cheerio.load(response.data);
    const downloads = [];

    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (href && (href.includes("token=") || href.includes("acxcdn.com"))) {
        const extracted = extractFinalUrl(href);
        if (extracted && extracted.url.startsWith("http")) {
          let type = "VIDEO";
          const lowerUrl = extracted.url.toLowerCase();
          if (
            lowerUrl.includes(".jpg") ||
            lowerUrl.includes(".jpeg") ||
            lowerUrl.includes(".png") ||
            lowerUrl.includes(".webp")
          ) {
            type = "IMAGE";
          }
          downloads.push({ type, url: extracted.url });
        }
      }
    });

    if (downloads.length === 0) throw new Error("No download links found.");
    return { status: true, result: { title: "Threads Media", downloads } };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

async function pixiv(url) {
  try {
    const illustIdMatch = url.match(/artworks\/(\d+)/) || url.match(/illust_id=(\d+)/);
    if (!illustIdMatch) throw new Error("Invalid Pixiv URL.");
    const illustId = illustIdMatch[1];

    const res = await axios.get(`https://www.phixiv.net/api/info?id=${illustId}`, { timeout: 15000 });
    const data = res.data;

    if (data.error || !data.image_proxy_urls) {
      throw new Error("Failed to fetch artwork data.");
    }

    let downloads = data.image_proxy_urls.map((u, i) => {
      let type = "IMAGE";
      if (u.toLowerCase().includes(".mp4")) type = "VIDEO";
      if (data.is_ugoira && type === "VIDEO") type = "UGOIRA (MP4)";
      else if (data.image_proxy_urls.length > 1 && !data.is_ugoira) type = `PAGE ${i + 1}`;
      return { type, url: u };
    });

    // If Ugoira, prefer video and remove static thumbnail if video exists
    if (data.is_ugoira && downloads.some(d => d.type.includes("VIDEO"))) {
      downloads = downloads.filter(d => d.type.includes("VIDEO"));
    }

    return {
      status: true,
      result: {
        title: data.title ? `${data.title} by ${data.author_name || "Unknown"}` : "Pixiv Artwork",
        thumbnail: data.image_proxy_urls[0],
        downloads,
      },
    };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

async function bandcamp(url) {

  try {
    const headers = {
      "User-Agent": userAgents[0],
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      Referer: "https://bandcampdownloader.app/",
      Origin: "https://bandcampdownloader.app",
    };

    const r1 = await axios.get("https://bandcampdownloader.app/", { headers, timeout: 15000 });
    const cookies = r1.headers["set-cookie"];
    const cookieStr = cookies ? cookies.map((c) => c.split(";")[0]).join("; ") : "";

    const $1 = cheerio.load(r1.data);
    const csrfName = $('form[name="submitbcurl"] input[type="hidden"]').attr("name");
    const csrfValue = $('form[name="submitbcurl"] input[type="hidden"]').attr("value");

    if (!csrfName || !csrfValue) throw new Error("Failed to extract CSRF token.");

    const formData = new URLSearchParams();
    formData.append("url", url);
    formData.append(csrfName, csrfValue);

    const r2 = await axios.post("https://bandcampdownloader.app/action", formData.toString(), {
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieStr },
      timeout: 30000,
    });

    if (r2.data.error) throw new Error(r2.data.message || "Failed to process URL.");
    if (!r2.data.success || !r2.data.html) throw new Error("Unexpected response from server.");

    const $2 = cheerio.load(r2.data.html);
    const trackForms = $2('form[name="submitapurl"]');
    if (trackForms.length === 0) throw new Error("No tracks found.");

    const firstDataB64 = $2(trackForms.first()).find('input[name="data"]').val();
    const firstMeta = JSON.parse(Buffer.from(firstDataB64, "base64").toString("utf8"));

    const downloads = [];
    const isAlbum = trackForms.length > 1;

    for (let i = 0; i < trackForms.length; i++) {
      const form = trackForms[i];
      const dataVal = $2(form).find('input[name="data"]').val();
      const baseVal = $2(form).find('input[name="base"]').val();
      const tokenVal = $2(form).find('input[name="token"]').val();
      const meta = JSON.parse(Buffer.from(dataVal, "base64").toString("utf8"));

      const trackFormData = new URLSearchParams();
      trackFormData.append("data", dataVal);
      trackFormData.append("base", baseVal);
      trackFormData.append("token", tokenVal);
      trackFormData.append("type", "320");

      try {
        const r3 = await axios.post("https://bandcampdownloader.app/action/track", trackFormData.toString(), {
          headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieStr },
          timeout: 60000,
        });

        if (r3.data.error) continue;

        const $3 = cheerio.load(r3.data.data);
        $3("a.abutton").each((_, el) => {
          const href = $3(el).attr("href");
          const label = $3(el).text().trim();
          if (href && href.includes("/dl?token=")) {
            const prefix = isAlbum ? `${(i + 1).toString().padStart(2, "0")}. ` : "";
            downloads.push({
              type: `${prefix}${label}`,
              url: `https://bandcampdownloader.app${href}`,
            });
          }
        });
      } catch (e) {
        console.error("Bandcamp track error:", e.message);
      }
    }

    if (downloads.length === 0) throw new Error("Could not extract download links.");

    return {
      status: true,
      result: {
        title: isAlbum ? (firstMeta.album || firstMeta.name) : firstMeta.name,
        thumbnail: firstMeta.cover,
        downloads,
      },
    };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

const express = require("express");

const cors = require("cors");
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/api/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url)
    return res.status(400).json({ status: false, message: "URL is required" });

  let data;
  if (url.includes("tiktok.com")) data = await snaptik(url);
  else if (url.includes("instagram.com")) data = await instagram(url);
  else if (url.includes("youtube.com") || url.includes("youtu.be"))
    data = await youtube(url);
  else if (url.includes("twitter.com") || url.includes("x.com"))
    data = await tweeload(url);
  else if (url.includes("spotify.com")) data = await spotidown(url);
  else if (url.includes("pinterest.com") || url.includes("pin.it"))
    data = await pindown(url);
  else if (url.includes("music.apple.com")) data = await aplmate(url);
  else if (url.includes("facebook.com") || url.includes("fb.watch"))
    data = await snapsave(url);
  else if (url.includes("soundcloud.com")) data = await klickaud(url);
  else if (url.includes("threads.net") || url.includes("threads.com"))
    data = await threadster(url);
  else if (url.includes("bandcamp.com")) data = await bandcamp(url);
  else if (url.includes("pixiv.net")) data = await pixiv(url);
  else data = { status: false, message: "URL not supported yet." };

  res.json(data);
});

app.get("/api/download-proxy", async (req, res) => {
  const { url, filename } = req.query;
  if (!url) return res.status(400).send("URL required");

  try {
    const response = await axios({
      method: "get",
      url: url,
      responseType: "stream",
      headers: {
        "User-Agent": userAgents[0],
        Referer: "https://www.klickaud.org/",
      },
    });

    const cleanName = (filename || "download.mp3").replace(
      /[/\\?%*:|"<>]/g,
      "-",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${cleanName}"`);
    res.setHeader("Content-Type", "audio/mpeg");
    response.data.pipe(res);
  } catch (e) {
    res.status(500).send("Proxy failed: " + e.message);
  }
});

app.listen(port, () =>
  console.log(`Mori Server running at http://localhost:${port}`),
);
