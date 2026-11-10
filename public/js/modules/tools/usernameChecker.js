// usernameChecker.js — Multi-Platform Social Media & Domain Availability Checker
import { scraperFetch } from "../../scrapers/httpHelper.js";
import { getUserAgent } from "../../utils/index.js";
import { findTikTokUser } from "./tiktokFinder.js";

export function toDomainLabel(u) {
  if (!u || typeof u !== "string") return "";
  return u
    .toLowerCase()
    .replace(/[_.]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

async function checkDomainAvailability(u, tld) {
  const label = toDomainLabel(u);
  if (!label || label.length > 63) {
    throw new Error("Invalid domain label");
  }
  const domain = `${label}.${tld}`;
  const res = await scraperFetch(
    {
      url: `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=NS`,
      headers: { Accept: "application/dns-json" },
      rawResponse: true,
      parseJson: false,
    },
    "DomainCheck",
  );
  const json = typeof res.data === "object" ? res.data : JSON.parse(res.data);
  if (json.Status === 0) {
    return (
      (Array.isArray(json.Answer) && json.Answer.length > 0) ||
      (Array.isArray(json.Authority) && json.Authority.length > 0)
    );
  }
  if (json.Status === 3) {
    return false;
  }
  throw new Error(`DNS status ${json.Status}`);
}

const DOMAIN_TLDS = ["com", "id", "net", "org", "io", "dev", "me", "xyz", "app"];

const DOMAIN_CHECKS = DOMAIN_TLDS.map((tld) => ({
  id: `domain_${tld}`,
  name: `.${tld}`,
  category: "Domain",
  isDomain: true,
  tld,
  profileUrl: (u) => `https://${toDomainLabel(u) || u}.${tld}`,
  check: (u) => checkDomainAvailability(u, tld),
}));

export const CHECKER_PLATFORMS = [
  {
    id: "tiktok",
    name: "TikTok",
    category: "Social Video",
    profileUrl: (u) => `https://www.tiktok.com/@${u}`,
    check: async (u) => {
      try {
        const res = await findTikTokUser(u);
        return res.status && !!res.profile;
      } catch (_) {
        return false;
      }
    },
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "Video",
    profileUrl: (u) => `https://www.youtube.com/@${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://www.youtube.com/@${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "YouTubeCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "telegram",
    name: "Telegram",
    category: "Messaging",
    profileUrl: (u) => `https://t.me/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://t.me/${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "TelegramCheck",
      );
      const text = typeof res.data === "string" ? res.data : "";
      return text.includes("tgme_page_extra") || text.includes("tgme_page_title");
    },
  },
  {
    id: "snapchat",
    name: "Snapchat",
    category: "Social",
    profileUrl: (u) => `https://www.snapchat.com/add/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://www.snapchat.com/add/${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "SnapchatCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "spotify",
    name: "Spotify",
    category: "Music",
    profileUrl: (u) => `https://open.spotify.com/user/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://open.spotify.com/user/${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "SpotifyCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    category: "Music",
    profileUrl: (u) => `https://soundcloud.com/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://soundcloud.com/${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "SoundCloudCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "twitch",
    name: "Twitch",
    category: "Livestream",
    profileUrl: (u) => `https://www.twitch.tv/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://decapi.me/twitch/id/${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "TwitchCheck",
      );
      const text = String(res.data || "").trim();
      return /^\d+$/.test(text);
    },
  },
  {
    id: "roblox",
    name: "Roblox",
    category: "Gaming",
    profileUrl: (u) => `https://www.roblox.com/search/users?keyword=${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: "https://users.roblox.com/v1/usernames/users",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          data: JSON.stringify({ usernames: [u], excludeBannedUsers: false }),
          rawResponse: true,
          parseJson: false,
        },
        "RobloxCheck",
      );
      if (res.status === 200) {
        try {
          const json =
            typeof res.data === "object" ? res.data : JSON.parse(res.data);
          return Array.isArray(json?.data) && json.data.length > 0;
        } catch (_) {}
      }
      return false;
    },
  },
  {
    id: "steam",
    name: "Steam",
    category: "Gaming",
    profileUrl: (u) => `https://steamcommunity.com/id/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://steamcommunity.com/id/${encodeURIComponent(u)}/?xml=1`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "SteamCheck",
      );
      const text = typeof res.data === "string" ? res.data : "";
      return text.includes("<steamID64>");
    },
  },
  {
    id: "duolingo",
    name: "Duolingo",
    category: "Education",
    profileUrl: (u) => `https://www.duolingo.com/profile/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "DuolingoCheck",
      );
      if (res.status === 200) {
        try {
          const json =
            typeof res.data === "object" ? res.data : JSON.parse(res.data);
          return Array.isArray(json?.users) && json.users.length > 0;
        } catch (_) {}
      }
      return false;
    },
  },
  {
    id: "wattpad",
    name: "Wattpad",
    category: "Writing",
    profileUrl: (u) => `https://www.wattpad.com/user/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://www.wattpad.com/user/${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "WattpadCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "chesscom",
    name: "Chess.com",
    category: "Gaming",
    profileUrl: (u) => `https://www.chess.com/member/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://api.chess.com/pub/player/${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "ChessCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "linktree",
    name: "Linktree",
    category: "Social",
    profileUrl: (u) => `https://linktr.ee/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://linktr.ee/${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "LinktreeCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "vimeo",
    name: "Vimeo",
    category: "Video",
    profileUrl: (u) => `https://vimeo.com/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://vimeo.com/${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "VimeoCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "github",
    name: "GitHub",
    category: "Developer",
    profileUrl: (u) => `https://github.com/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://api.github.com/users/${encodeURIComponent(u)}`,
          headers: { "User-Agent": "MoriApp" },
          rawResponse: true,
          parseJson: false,
        },
        "GitHubCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "gitlab",
    name: "GitLab",
    category: "Developer",
    profileUrl: (u) => `https://gitlab.com/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://gitlab.com/${encodeURIComponent(u)}`,
          method: "GET",
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "GitLabCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "substack",
    name: "Substack",
    category: "Writing",
    profileUrl: (u) => `https://${u}.substack.com`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://${encodeURIComponent(u)}.substack.com`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "SubstackCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "dailymotion",
    name: "DailyMotion",
    category: "Video",
    profileUrl: (u) => `https://www.dailymotion.com/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://api.dailymotion.com/user/${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "DailymotionCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "blogspot",
    name: "Blogger",
    category: "Blog",
    profileUrl: (u) => `https://${toDomainLabel(u) || u}.blogspot.com`,
    check: async (u) => {
      const label = toDomainLabel(u);
      if (!label) throw new Error("Invalid blog subdomain");
      const res = await scraperFetch(
        {
          url: `https://${label}.blogspot.com/`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "BloggerCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "behance",
    name: "Behance",
    category: "Design",
    profileUrl: (u) => `https://www.behance.net/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://www.behance.net/${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "BehanceCheck",
      );
      return res.status === 200;
    },
  },
  ...DOMAIN_CHECKS,
];

export async function checkSinglePlatform(platform, username) {
  try {
    const isTaken = await platform.check(username);
    return {
      id: platform.id,
      name: platform.name,
      category: platform.category,
      isDomain: !!platform.isDomain,
      profileUrl: platform.profileUrl(username),
      status: isTaken ? "taken" : "available",
    };
  } catch (_) {
    return {
      id: platform.id,
      name: platform.name,
      category: platform.category,
      isDomain: !!platform.isDomain,
      profileUrl: platform.profileUrl(username),
      status: "error",
    };
  }
}

export async function checkAllUsernames(username, onItemResult = null) {
  if (!username || typeof username !== "string") {
    throw new Error("Invalid username provided.");
  }

  let clean = username.trim().replace(/^[@/]+/, "").trim();
  if (!clean) {
    throw new Error("Username cannot be empty.");
  }

  const promises = CHECKER_PLATFORMS.map(async (p) => {
    const res = await checkSinglePlatform(p, clean);
    onItemResult?.(res);
    return res;
  });

  const results = await Promise.all(promises);
  const takenCount = results.filter((r) => r.status === "taken").length;
  const availableCount = results.filter((r) => r.status === "available").length;

  return {
    username: clean,
    total: results.length,
    takenCount,
    availableCount,
    results,
  };
}
