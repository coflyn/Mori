const axios = require("axios");
const cheerio = require("cheerio");
const FormData = require("form-data");
const qs = require("querystring");

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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

    if (!script1 || !script1.includes("eval")) throw new Error("Invalid response from SnapTik.");

    const script2 = await new Promise((resolve) => {
      const mockEval = (s) => resolve(s);
      const fn = new Function("eval", script1);
      fn(mockEval);
    });

    const { html } = await new Promise((resolve, reject) => {
      let capturedHtml = "";
      const context = {
        $: () => ({ set innerHTML(t) { capturedHtml = t; }, remove: () => {}, style: { display: "" } }),
        app: { showAlert: (msg) => reject(new Error(msg)) },
        document: { getElementById: () => ({ src: "" }) },
        fetch: () => { resolve({ html: capturedHtml }); return { json: () => Promise.resolve({ thumbnail_url: "" }) }; },
        gtag: () => {}, Math: { round: () => 0 }, XMLHttpRequest: function () { return { open: () => {}, send: () => {} }; },
        window: { location: { hostname: "snaptik.app" } }, setTimeout: () => {}, setInterval: () => {}, console: { log: () => {} },
      };
      try {
        const keys = Object.keys(context);
        const values = Object.values(context);
        const fn = new Function(...keys, script2);
        fn(...values);
        setTimeout(() => resolve({ html: capturedHtml }), 500);
      } catch (e) { reject(e); }
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
        
        const isMirror = (label === "VIDEO" && downloads.some(d => d.type === "VIDEO")) || 
                         (label === "MP3" && downloads.some(d => d.type === "MP3"));
        
        downloads.push({ type: label, url: link, isMirror });
      }
    });

    const titleEl = $(".video-title").first();
    if (titleEl.length) {
        titleEl.find("a").remove();
    }
    const title = titleEl.text().trim() || "TikTok Content";
    return { status: true, result: { title, thumbnail: $("#thumbnail").attr("src"), downloads } };
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
        const { data } = await axios.post("https://app.ytdown.to/proxy.php", qs.stringify({ url }), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                "User-Agent": "Mozilla/5.0"
            },
        });

        if (!data || !data.api || data.api.status !== "ok") throw new Error("Failed to fetch YouTube data.");

        const downloads = data.api.mediaItems.map((item) => ({
            type: `${item.mediaExtension.toUpperCase()} ${item.mediaQuality}`,
            url: item.mediaUrl
        }));

        return { status: true, result: { title: data.api.title || "YouTube Content", thumbnail: data.api.imagePreviewUrl, downloads } };
    } catch (error) {
        return { status: false, message: error.message };
    }
}

async function tweeload(url) {
    try {
        const twitterUrl = url.replace(/https:\/\/(fixupx|fxtwitter|vxtwitter|nitter|twitter)\.com/g, "https://x.com");
        const client = axios.create({
            baseURL: "https://tweeload.com",
            headers: { "User-Agent": userAgents[0], "Referer": "https://tweeload.com/" },
        });

        const r1 = await client.get("/en");
        const cookies = r1.headers["set-cookie"];
        const cookieHeader = cookies ? cookies.map((c) => c.split(";")[0]).join("; ") : "";

        const params = new URLSearchParams();
        params.append("url", twitterUrl);

        const { data: html } = await client.post("/en/download", params.toString(), {
            headers: { Cookie: cookieHeader, "Content-Type": "application/x-www-form-urlencoded" },
        });

        const $ = cheerio.load(html);
        const downloads = [];
        let mediaType = "VIDEO";

        $(".download__item__info__actions tbody tr").each((i, el) => {
            const $tds = $(el).find("td");
            const quality = $tds.eq(0).text().trim();
            const dlUrl = $(el).find("a.download__item__info__actions__button").attr("href");
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

        if (downloads.length === 0) throw new Error("Failed to extract Twitter links.");

        const name = $(".download__item__info__user__name").first().text().trim();
        const handle = $(".download__item__info__user__handle").first().text().trim();

        return {
            status: true,
            result: {
                title: `${name} (${handle})` || "Twitter Content",
                thumbnail: null,
                downloads
            }
        };
    } catch (e) {
        return { status: false, message: e.message };
    }
}

async function spotidown(url) {
    try {
        const headers = {
            "User-Agent": userAgents[0],
            "Referer": "https://spotidown.app/",
            "Origin": "https://spotidown.app",
        };

        const r1 = await axios.get("https://spotidown.app/", { headers });
        const cookies = r1.headers["set-cookie"];
        const $1 = cheerio.load(r1.data);
        const $form = $1('form[name="spotifyurl"]');

        const fd1 = new URLSearchParams();
        $form.find('input').each((i, el) => {
            const name = $1(el).attr('name');
            const value = $1(el).attr('value') || "";
            if (name && name !== "url") fd1.append(name, value);
        });
        fd1.append("url", url);

        const r2 = await axios.post("https://spotidown.app/action", fd1.toString(), {
            headers: {
                ...headers,
                "Content-Type": "application/x-www-form-urlencoded",
                "Cookie": cookies ? cookies.map(c => c.split(';')[0]).join('; ') : ""
            },
        });

        if (r2.data.error) throw new Error(r2.data.message || "Spotify error.");

        const $2 = cheerio.load(r2.data.data);
        const $form2 = $2('form[name="submitspurl"]');
        let finalHtml = r2.data.data;

        if ($form2.length) {
            const fd2 = new URLSearchParams();
            $form2.find('input').each((i, el) => {
                const name = $2(el).attr('name');
                const value = $2(el).attr('value') || "";
                if (name) fd2.append(name, value);
            });

            const r3 = await axios.post("https://spotidown.app/action/track", fd2.toString(), {
                headers: {
                    ...headers,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Cookie": cookies ? cookies.map(c => c.split(';')[0]).join('; ') : ""
                },
            });
            finalHtml = r3.data.data;
        }

        const $3 = cheerio.load(finalHtml);
        const title = $3("h3").first().text().trim() || $3("h1").first().text().trim() || "Spotify Track";
        const artist = $3("p").first().text().trim();
        const thumbnail = $3("img").first().attr("src");
        const downloads = [];

        $3("a").each((i, el) => {
            const link = $3(el).attr("href");
            const text = $3(el).text().trim();
            if (link && link.startsWith("http") && !link.includes("premium.html") && text !== "Download Another Song") {
                downloads.push({ type: text || "MP3", url: link });
            }
        });

        return {
            status: true,
            result: {
                title: artist ? `${artist} - ${title}` : title,
                thumbnail,
                downloads
            }
        };
    } catch (e) {
        return { status: false, message: e.message };
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
  if (!url) return res.status(400).json({ status: false, message: "URL is required" });
  
  let data;
  if (url.includes('tiktok.com')) data = await snaptik(url);
  else if (url.includes('instagram.com')) data = await instagram(url);
  else if (url.includes('youtube.com') || url.includes('youtu.be')) data = await youtube(url);
  else if (url.includes('twitter.com') || url.includes('x.com')) data = await tweeload(url);
  else if (url.includes('spotify.com')) data = await spotidown(url);
  else data = { status: false, message: "URL not supported yet." };

  res.json(data);
});

app.listen(port, () => console.log(`Mori Server running at http://localhost:${port}`));
