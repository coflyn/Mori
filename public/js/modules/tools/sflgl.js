// sflgl.js — Safelinku / SFLGL link bypass engine
import { scraperFetch } from "../../scrapers/httpHelper.js";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function extractCleanUrl(text) {
  if (!text || typeof text !== "string") return "";
  const match = text.match(/https?:\/\/[^\s]+/i);
  let clean = match ? match[0] : text.trim();
  clean = clean.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "https://" + clean;
  }
  return clean;
}

class DomainCookieJar {
  constructor() {
    this.domains = new Map();
  }

  getHost(urlStr) {
    try {
      return new URL(urlStr).host;
    } catch (_) {
      return "";
    }
  }

  syncFromBridge(urlStr) {
    try {
      const bridge =
        typeof window !== "undefined"
          ? window.MoriMainBridge || window.MoriShareBridge
          : null;
      if (typeof bridge?.getCookiesForUrl === "function") {
        const raw = bridge.getCookiesForUrl(urlStr);
        if (raw) {
          const host = this.getHost(urlStr);
          raw.split(";").forEach((pair) => {
            const eqIdx = pair.indexOf("=");
            if (eqIdx !== -1) {
              const k = pair.slice(0, eqIdx).trim();
              const v = pair.slice(eqIdx + 1).trim();
              if (k) this.set(host, k, v);
            }
          });
        }
      }
    } catch (_) {}
  }

  set(host, name, value) {
    if (!host || !name) return;
    if (!this.domains.has(host)) {
      this.domains.set(host, new Map());
    }
    this.domains.get(host).set(name, value);
  }

  get(host, name) {
    if (!host || !name) return null;
    const store = this.domains.get(host);
    if (!store) return null;
    return store.get(name) || null;
  }

  getCookieHeader(urlStr) {
    const host = this.getHost(urlStr);
    const store = this.domains.get(host);
    if (!store || store.size === 0) return "";
    const pairs = [];
    for (const [k, v] of store.entries()) {
      pairs.push(`${k}=${v}`);
    }
    return pairs.join("; ");
  }

  setFromHeaders(headers, urlStr) {
    const host = this.getHost(urlStr);
    if (urlStr) this.syncFromBridge(urlStr);
    if (!headers || !host) return;

    const raw =
      headers["set-cookie"] ||
      headers["Set-Cookie"] ||
      headers["Set-cookie"] ||
      "";
    if (!raw) return;

    const lines = String(raw).split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const part = line.split(";")[0].trim();
      const eqIdx = part.indexOf("=");
      if (eqIdx !== -1) {
        const name = part.slice(0, eqIdx).trim();
        const value = part.slice(eqIdx + 1).trim();
        if (name) this.set(host, name, value);
      }
    }
  }
}

function generateSessionToken(rawXsrfCookie) {
  const unquotedXsrf = decodeURIComponent(rawXsrfCookie);
  const hashPart =
    "#NGE1MWM3YTE4NDRmYWJmYzE1NmM0Zjg5YmJlZjljYjg0ZGE4ZTQyNmFmNzM4YmRiNTU2YjNlYmYxY2I4YmI3Ng==";
  return unquotedXsrf.slice(0, 128 - hashPart.length) + hashPart;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchHttp(url, options = {}, jar) {
  let currentUrl = url;
  let method = options.method || "GET";
  let data = options.data;
  let headers = {
    "User-Agent": DEFAULT_UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    ...(options.headers || {}),
  };

  const maxHops = 10;
  for (let hop = 0; hop < maxHops; hop++) {
    if (jar) {
      jar.syncFromBridge(currentUrl);
      const cookieHeader = jar.getCookieHeader(currentUrl);
      if (cookieHeader) headers["Cookie"] = cookieHeader;
    }

    const res = await scraperFetch(
      {
        url: currentUrl,
        method,
        data,
        headers,
        redirect: "manual",
        rawResponse: true,
        parseJson: false,
      },
      "SFLGL",
    );

    if (jar) {
      jar.setFromHeaders(res.headers, currentUrl);
      if (res.url) jar.setFromHeaders(res.headers, res.url);
    }

    const location = res.headers?.location || res.headers?.Location;
    if (res.status >= 300 && res.status < 400 && location) {
      headers["Referer"] = currentUrl;
      currentUrl = new URL(location, currentUrl).href;
      method = "GET";
      data = undefined;
      continue;
    }

    return {
      url: res.url || currentUrl,
      status: res.status,
      headers: res.headers || {},
      data: res.data,
    };
  }

  throw new Error("Too many redirects");
}

function checkBase64Params(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const keys = ["url", "link", "target", "go", "u", "dest"];
    for (const key of keys) {
      const val = parsed.searchParams.get(key);
      if (!val) continue;
      try {
        const decoded = atob(val);
        if (/^https?:\/\//i.test(decoded)) {
          return decoded.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
        }
      } catch (_) {}
      if (/^https?:\/\//i.test(val)) {
        return val.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
      }
    }
  } catch (_) {}
  return null;
}

async function resolveGateway(html, currentUrl, jar) {
  const formMatch = html.match(
    /<form[^>]+action=["']([^"']+)["'][^>]*>([\s\S]*?)<\/form>/i,
  );
  const rayMatch = html.match(/name=["']ray_id["']\s+value=["']([^"']+)["']/i);
  const aliasMatch = html.match(
    /name=["']alias["']\s+value=["']([^"']+)["']/i,
  );

  if (!formMatch || !rayMatch || !aliasMatch) return null;

  const actionUrl = formMatch[1];
  const rayId = rayMatch[1];
  const alias = aliasMatch[1];

  const parsedAction = new URL(actionUrl, currentUrl);
  const blogOrigin = `${parsedAction.protocol}//${parsedAction.host}`;
  const blogHost = parsedAction.host;
  const redirectUrl = `${blogOrigin}/redirect.php?ray_id=${encodeURIComponent(
    rayId,
  )}&alias=${encodeURIComponent(alias)}`;

  // 1. Follow redirect.php (lands on step 1 blog article page)
  const r2 = await fetchHttp(
    redirectUrl,
    { headers: { Referer: currentUrl } },
    jar,
  );
  const step1PageUrl = r2.url || redirectUrl;
  jar.syncFromBridge(step1PageUrl);

  let xsrf1 = jar.get(blogHost, "XSRF-TOKEN");
  if (!xsrf1) return null;

  const tokenPayload1 = generateSessionToken(xsrf1);
  const sessionHeaders = {
    Origin: blogOrigin,
    Referer: step1PageUrl,
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
    "X-Requested-With": "XMLHttpRequest",
    "X-XSRF-TOKEN": xsrf1,
  };

  // 2. Call /api/session (Step 1)
  const sessionRes1 = await fetchHttp(
    `${blogOrigin}/api/session`,
    {
      method: "POST",
      headers: sessionHeaders,
      data: JSON.stringify({ _token: tokenPayload1 }),
    },
    jar,
  );

  let sessionData1 = {};
  try {
    sessionData1 =
      typeof sessionRes1.data === "object"
        ? sessionRes1.data
        : JSON.parse(sessionRes1.data);
  } catch (_) {}

  let step = sessionData1.step || 1;
  let step2PageUrl = step1PageUrl;

  if (step === 1) {
    await sleep(800);
    const verifyRes = await fetchHttp(
      `${blogOrigin}/api/verify`,
      {
        method: "POST",
        headers: sessionHeaders,
        data: JSON.stringify({ _a: 0, captcha: null, passcode: null }),
      },
      jar,
    );

    let verifyData = {};
    try {
      verifyData =
        typeof verifyRes.data === "object"
          ? verifyRes.data
          : JSON.parse(verifyRes.data);
    } catch (_) {}

    let target = verifyData.target || "/redirect.php";
    if (target.startsWith("/")) target = `${blogOrigin}${target}`;

    // 3. Follow target redirect to step 2 blog article page
    const r3 = await fetchHttp(
      target,
      { headers: { Referer: step1PageUrl } },
      jar,
    );
    step2PageUrl = r3.url || target;
    jar.syncFromBridge(step2PageUrl);

    const xsrf2 = jar.get(blogHost, "XSRF-TOKEN") || xsrf1;
    sessionHeaders["Referer"] = step2PageUrl;
    sessionHeaders["X-XSRF-TOKEN"] = xsrf2;

    const tokenPayload2 = generateSessionToken(xsrf2);
    await fetchHttp(
      `${blogOrigin}/api/session`,
      {
        method: "POST",
        headers: sessionHeaders,
        data: JSON.stringify({ _token: tokenPayload2 }),
      },
      jar,
    );
  }

  // 4. Request /api/go
  await sleep(1500);
  const key = Math.floor(Math.random() * 1000);
  const size = `${(1920 + key) * 2}.${(1080 + key) * 2}`;

  sessionHeaders["Referer"] = step2PageUrl;
  const goRes = await fetchHttp(
    `${blogOrigin}/api/go`,
    {
      method: "POST",
      headers: sessionHeaders,
      data: JSON.stringify({ key, size }),
    },
    jar,
  );

  let goData = {};
  try {
    goData =
      typeof goRes.data === "object" ? goRes.data : JSON.parse(goRes.data);
  } catch (_) {
    return null;
  }

  let readyUrl = goData.url;
  if (!readyUrl) return null;
  if (!/^https?:\/\//i.test(readyUrl)) {
    readyUrl = new URL(readyUrl, blogOrigin).href;
  }

  // 5. Fetch final ready URL
  const rReady = await fetchHttp(
    readyUrl,
    { headers: { Referer: step2PageUrl } },
    jar,
  );

  if (rReady.url && !rReady.url.includes("sfl.gl") && !rReady.url.includes("safelinku.com")) {
    return rReady.url;
  }

  const htmlReady =
    typeof rReady.data === "string" ? rReady.data : JSON.stringify(rReady.data);

  const destMatch = htmlReady.match(
    /window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i,
  );
  if (destMatch && destMatch[1]) {
    let unescaped = destMatch[1]
      .replace(/\\\//g, "/")
      .replace(/\\u0026/g, "&")
      .replace(/&amp;/g, "&")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();
    if (/^https?:\/\//i.test(unescaped)) {
      return unescaped;
    }
  }

  const allUrls = htmlReady.match(/https?:\\\/\\\/[^\s"'`<>]+/g) || [];
  for (const u of allUrls) {
    const clean = u
      .replace(/\\\//g, "/")
      .replace(/\\u0026/g, "&")
      .replace(/&amp;/g, "&")
      .trim();
    if (
      !clean.includes("sfl.gl") &&
      !clean.includes("safelinku.com") &&
      !clean.includes("khaddavi.net") &&
      !clean.includes("google") &&
      !clean.includes("schema.org") &&
      !clean.includes("cloudflare")
    ) {
      return clean;
    }
  }

  return readyUrl;
}

export async function skipSflgl(url) {
  try {
    if (!url || typeof url !== "string") throw new Error("Invalid URL.");
    let initialUrl = extractCleanUrl(url);

    const b64Check = checkBase64Params(initialUrl);
    if (b64Check) {
      return {
        status: true,
        result: {
          originalUrl: initialUrl,
          destinationUrl: b64Check,
        },
      };
    }

    const jar = new DomainCookieJar();
    const visited = new Set();
    let currentUrl = initialUrl;
    const maxChain = 8;

    for (let hop = 0; hop < maxChain; hop++) {
      if (visited.has(currentUrl)) break;
      visited.add(currentUrl);

      const res = await fetchHttp(currentUrl, {}, jar);
      currentUrl = res.url || currentUrl;
      const html = typeof res.data === "string" ? res.data : "";

      if (
        html.includes('name="ray_id"') ||
        html.includes("name='ray_id'") ||
        html.includes("redirect.php")
      ) {
        const resolved = await resolveGateway(html, currentUrl, jar);
        if (resolved) {
          const cleanResolved = resolved
            .replace(/[\u200B-\u200D\uFEFF]/g, "")
            .trim();
          const cleanInitial = initialUrl
            .replace(/[\u200B-\u200D\uFEFF]/g, "")
            .trim()
            .replace(/\/$/, "");
          if (cleanResolved.replace(/\/$/, "") !== cleanInitial) {
            currentUrl = cleanResolved;
            break;
          }
        }
      }

      const metaRefresh = html.match(
        /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"']+)["']/i,
      );
      if (metaRefresh && metaRefresh[1]) {
        currentUrl = new URL(metaRefresh[1].trim(), currentUrl).href;
        continue;
      }

      break;
    }

    const cleanResult = currentUrl
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();
    const cleanInitial = initialUrl
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim()
      .replace(/\/$/, "");

    if (
      cleanResult.replace(/\/$/, "") === cleanInitial ||
      cleanResult.includes("sfl.gl") ||
      cleanResult.includes("safelinku.com")
    ) {
      throw new Error("Unable to bypass this link. Target may be expired or protected by CAPTCHA.");
    }

    return {
      status: true,
      result: {
        originalUrl: initialUrl,
        destinationUrl: cleanResult,
      },
    };
  } catch (error) {
    return {
      status: false,
      message: error.message || "Failed to bypass link",
    };
  }
}
