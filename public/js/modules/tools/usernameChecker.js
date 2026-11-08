// usernameChecker.js — Multi-Platform Social Media Username Availability & Profile Checker
import { scraperFetch } from "../../scrapers/httpHelper.js";
import { getUserAgent } from "../../utils/index.js";
import { findTikTokUser } from "./tiktokFinder.js";

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
          const json = typeof res.data === "object" ? res.data : JSON.parse(res.data);
          return Array.isArray(json?.data) && json.data.length > 0;
        } catch (_) {}
      }
      return false;
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
    id: "devto",
    name: "Dev.to",
    category: "Developer",
    profileUrl: (u) => `https://dev.to/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://dev.to/api/users/by_username?url=${encodeURIComponent(u)}`,
          headers: { "User-Agent": "MoriApp" },
          rawResponse: true,
          parseJson: false,
        },
        "DevtoCheck",
      );
      if (res.status === 200) {
        try {
          const json = typeof res.data === "object" ? res.data : JSON.parse(res.data);
          return !!json?.id;
        } catch (_) {}
      }
      return false;
    },
  },
  {
    id: "hackernews",
    name: "Hacker News",
    category: "Developer",
    profileUrl: (u) => `https://news.ycombinator.com/user?id=${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(u)}.json`,
          headers: { "User-Agent": "MoriApp" },
          rawResponse: true,
          parseJson: false,
        },
        "HNCheck",
      );
      if (res.status === 200) {
        try {
          const json = typeof res.data === "object" ? res.data : JSON.parse(res.data);
          return json !== null && typeof json === "object";
        } catch (_) {}
      }
      return false;
    },
  },
  {
    id: "codeforces",
    name: "Codeforces",
    category: "Developer",
    profileUrl: (u) => `https://codeforces.com/profile/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://codeforces.com/api/user.info?handles=${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "CodeforcesCheck",
      );
      if (res.status === 200) {
        try {
          const json = typeof res.data === "object" ? res.data : JSON.parse(res.data);
          return json?.status === "OK";
        } catch (_) {}
      }
      return false;
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
  {
    id: "mastodon",
    name: "Mastodon",
    category: "Social",
    profileUrl: (u) => `https://mastodon.social/@${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://mastodon.social/api/v1/accounts/lookup?acct=${encodeURIComponent(u)}`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "MastodonCheck",
      );
      return res.status === 200;
    },
  },
  {
    id: "gravatar",
    name: "Gravatar",
    category: "Profiles",
    profileUrl: (u) => `https://gravatar.com/${u}`,
    check: async (u) => {
      const res = await scraperFetch(
        {
          url: `https://en.gravatar.com/${encodeURIComponent(u)}.json`,
          headers: { "User-Agent": getUserAgent() },
          rawResponse: true,
          parseJson: false,
        },
        "GravatarCheck",
      );
      return res.status === 200;
    },
  },
];

export async function checkSinglePlatform(platform, username) {
  try {
    const isTaken = await platform.check(username);
    return {
      id: platform.id,
      name: platform.name,
      category: platform.category,
      profileUrl: platform.profileUrl(username),
      status: isTaken ? "taken" : "available",
    };
  } catch (_) {
    return {
      id: platform.id,
      name: platform.name,
      category: platform.category,
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
