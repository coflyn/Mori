// Pull a usable link out of Chinese cloud-drive share captions.

const TRAILING_PUNCT = /[。，,；;）】、！？…」』)\]\}"']+$/u;
const TEXT_PASSWORD =
  /(?:提取码|访问码|密码|pwd)\s*[：:]\s*([A-Za-z0-9]{3,8})/i;
const PASSWORD_PARAM = /^(?:pwd|pass|passcode|password)$/i;

/**
 * First http(s) URL in text, without trailing punctuation.
 * @param {string} text
 * @returns {string}
 */
export function firstHttpUrl(text) {
  if (!text || typeof text !== "string") return "";
  const match = text.match(/https?:\/\/[^\s]+/i);
  if (!match) return "";
  let url = match[0].replace(/[\u200B-\u200D\uFEFF]/g, "");
  let previous = "";
  while (url && url !== previous) {
    previous = url;
    url = url.replace(TRAILING_PUNCT, "");
  }
  return url;
}

function captionPassword(text, url) {
  const at = text.indexOf(url);
  if (at < 0) {
    const match = text.match(TEXT_PASSWORD);
    return match ? match[1] : "";
  }
  const afterRaw = text.slice(at + url.length);
  const nextUrl = afterRaw.search(/https?:\/\//i);
  const after = afterRaw.slice(0, nextUrl >= 0 ? Math.min(nextUrl, 80) : 80);
  const before = text.slice(Math.max(0, at - 40), at);
  const afterMatch = after.match(TEXT_PASSWORD);
  if (afterMatch) return afterMatch[1];
  const beforeMatch = before.match(TEXT_PASSWORD);
  return beforeMatch ? beforeMatch[1] : "";
}

function existingPassword(urlObject) {
  let found = "";
  urlObject.searchParams.forEach((value, key) => {
    if (!found && PASSWORD_PARAM.test(key)) found = value;
  });
  return found.replace(TRAILING_PUNCT, "");
}

/**
 * Recognize a Chinese cloud-drive share caption.
 * Returns null when the text has no share URL Mori knows how to keep.
 * The returned url is safe to open: the public path is unchanged and the
 * extraction code is kept in the query (or in the 115 command path).
 * @param {string} text
 * @returns {{platform: string, shareId: string, password: string, url: string} | null}
 */
export function parseShareText(text) {
  if (!text || typeof text !== "string") return null;
  const rawUrl = firstHttpUrl(text);
  if (!rawUrl) return null;

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const identified = identifyShare(host, rawUrl);
  if (!identified) return null;

  const captionCode = captionPassword(text, rawUrl);
  let password = identified.pathPassword || "";
  if (!password) {
    password = existingPassword(parsed);
    if (!password && captionCode && identified.passwordParam) {
      password = captionCode;
      parsed.searchParams.set(identified.passwordParam, captionCode);
    }
  }

  return {
    platform: identified.platform,
    shareId: identified.shareId,
    password,
    url: parsed.href.replace(/\/$/, ""),
  };
}

/**
 * URL to put in the input box. Share links keep their extraction code.
 * Other links only lose surrounding caption text and trailing punctuation.
 * @param {string} text
 * @returns {string}
 */
export function normalizeLooseUrl(text) {
  if (!text || typeof text !== "string") return "";
  const share = parseShareText(text);
  if (share) return share.url;
  return firstHttpUrl(text);
}

function identifyShare(host, rawUrl) {
  let match = rawUrl.match(
    /115(?:cdn|rc)?\.com\/(sw[A-Za-z0-9]{8,})-([A-Za-z0-9]{4,8})/i,
  );
  if (match) {
    return {
      platform: "115",
      shareId: match[1],
      pathPassword: match[2],
      passwordParam: null,
    };
  }

  match = rawUrl.match(/115(?:cdn|rc)?\.com\/s\/(sw[A-Za-z0-9]+)/i);
  if (match) {
    return {
      platform: "115",
      shareId: match[1],
      pathPassword: "",
      passwordParam: "password",
    };
  }

  const rules = [
    {
      platform: "quark",
      host: /(^|\.)pan\.quark\.cn$/i,
      id: /\/s\/([A-Za-z0-9]+)/i,
      passwordParam: "pwd",
    },
    {
      platform: "uc",
      host: /(^|\.)drive\.uc\.cn$/i,
      id: /\/s\/([A-Za-z0-9]+)/i,
      passwordParam: "pwd",
    },
    {
      platform: "xunlei",
      host: /(^|\.)pan\.xunlei\.com$/i,
      id: /\/s\/([A-Za-z0-9_-]+)/i,
      passwordParam: "pwd",
    },
    {
      platform: "baidu",
      host: /(^|\.)pan\.baidu\.com$/i,
      id: /\/s\/(1[A-Za-z0-9_-]+)/i,
      passwordParam: "pwd",
    },
    {
      platform: "139",
      host: /(^|\.)yun\.139\.com$/i,
      id: /\/w\/i\/([A-Za-z0-9_-]+)/i,
      passwordParam: "pwd",
    },
    {
      platform: "guangya",
      host: /(^|\.)guangyapan\.com$/i,
      id: /\/s\/([A-Za-z0-9_-]+)/i,
      passwordParam: "pwd",
    },
    {
      platform: "aliyun",
      host: /(^|\.)(?:alipan|aliyundrive)\.com$/i,
      id: /\/s\/([A-Za-z0-9]+)/i,
      passwordParam: "pwd",
    },
  ];

  for (const rule of rules) {
    if (!rule.host.test(host)) continue;
    const idMatch = rawUrl.match(rule.id);
    if (!idMatch) return null;
    return {
      platform: rule.platform,
      shareId: idMatch[1],
      pathPassword: "",
      passwordParam: rule.passwordParam,
    };
  }

  if (/(^|\.)ilanzou\.(?:com|net|org|cn)$/i.test(host)) {
    const idMatch = rawUrl.match(/\/s\/([A-Za-z0-9_-]+)/i);
    if (!idMatch) return null;
    return {
      platform: "ilanzou",
      shareId: idMatch[1],
      pathPassword: "",
      passwordParam: "pwd",
    };
  }

  if (
    /(^|\.)(?:lanzou[a-z0-9-]*|lan[zs]o[ux])\.(?:com|net|org|cn)$/i.test(host)
  ) {
    let pathname = "";
    try {
      pathname = new URL(rawUrl).pathname;
    } catch {
      pathname = "";
    }
    const idMatch = pathname.match(/\/([A-Za-z0-9]+)\/?$/i);
    if (!idMatch) return null;
    return {
      platform: "lanzou",
      shareId: idMatch[1],
      pathPassword: "",
      passwordParam: "pwd",
    };
  }

  if (/(^|\.)123(?:865|pan|684|912)\.(?:com|cn)$/i.test(host)) {
    const idMatch = rawUrl.match(/\/s\/([A-Za-z0-9]+-[A-Za-z0-9]+)/i);
    if (idMatch) {
      return {
        platform: "123",
        shareId: idMatch[1],
        pathPassword: "",
        passwordParam: "pwd",
      };
    }
  }

  if (/(^|\.)share\.123pan\.cn$/i.test(host)) {
    const idMatch = rawUrl.match(/\/123pan\/([A-Za-z0-9-]+)/i);
    if (idMatch) {
      return {
        platform: "123",
        shareId: idMatch[1],
        pathPassword: "",
        passwordParam: "pwd",
      };
    }
  }

  if (/123pan/i.test(host)) {
    const idMatch = rawUrl.match(/[?&]sk=([A-Za-z0-9-]+)/i);
    if (idMatch) {
      return {
        platform: "123",
        shareId: idMatch[1],
        pathPassword: "",
        passwordParam: "pwd",
      };
    }
  }

  return null;
}
