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
        downloads.push({ type: label, url: link });
      }
    });

    return { status: true, result: { title: $(".video-title").text().trim() || "TikTok Content", thumbnail: $("#thumbnail").attr("src"), downloads } };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

async function instagram(url) {
    try {
        const cleanUrl = url.split('?')[0];
        const res1 = await axios.get('https://indown.io/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const cookies = res1.headers['set-cookie'] ? res1.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';
        const $ = cheerio.load(res1.data);
        const token = $('input[name="_token"]').val();

        const res2 = await axios.post('https://indown.io/download', qs.stringify({ link: cleanUrl, _token: token }), {
            headers: { 'Cookie': cookies, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' }
        });

        const $2 = cheerio.load(res2.data);
        let downloads = [];
        $2('.container .row .col-md-4').each((i, el) => {
            const link = $2(el).find('a').attr('href');
            if (link && link.includes('fetch?url=')) {
                const decoded = decodeURIComponent(link);
                downloads.push({ type: decoded.includes('.mp4') ? 'VIDEO' : 'IMAGE', url: link });
            }
        });

        if (downloads.length === 0) {
            $2('a').each((i, el) => {
                const link = $2(el).attr('href');
                if (link && link.includes('fetch?url=')) {
                    const decoded = decodeURIComponent(link);
                    downloads.push({ type: decoded.includes('.mp4') ? 'VIDEO' : 'IMAGE', url: link });
                }
            });
        }

        return { status: true, result: { title: $2('h5').first().text().trim() || "Instagram Content", thumbnail: $2('img').first().attr('src'), downloads } };
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
  else data = { status: false, message: "URL not supported yet." };

  res.json(data);
});

app.listen(port, () => console.log(`Mori Server running at http://localhost:${port}`));
