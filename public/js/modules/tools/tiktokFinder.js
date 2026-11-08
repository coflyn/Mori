// tiktokFinder.js — TikTok Account Intelligence
import { scraperFetch } from "../../scrapers/httpHelper.js";
import { getUserAgent } from "../../utils/index.js";

function generateRandomPublicIp() {
  const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const prefixes = [64, 72, 98, 104, 128, 134, 142, 151, 162, 172, 185, 198, 203, 209];
  const oct1 = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${oct1}.${r(10, 250)}.${r(1, 254)}.${r(1, 254)}`;
}

async function requestFinder(cleaned, retryCount = 0) {
  const queryUrl = `https://tikuserfinder.com/api/finder/resolve?input=${encodeURIComponent(
    cleaned,
  )}&kind=auto`;

  const clientIp = generateRandomPublicIp();

  const res = await scraperFetch(
    {
      url: queryUrl,
      method: "GET",
      headers: {
        "User-Agent": getUserAgent(),
        Accept: "application/json, text/plain, */*",
        Referer: "https://tikuserfinder.com/",
        "X-Forwarded-For": clientIp,
        "Client-IP": clientIp,
        "X-Real-IP": clientIp,
      },
      rawResponse: false,
      parseJson: true,
    },
    "TikUserFinder",
  );

  if (res?.code !== 0) {
    throw new Error(res?.message || "Failed to lookup TikTok account");
  }

  const data = res.data;
  if (!data) {
    throw new Error("Empty response from lookup provider");
  }

  // Quota bypass: rotate IP and retry if budget or limit is hit
  if (
    (data.status === "daily_limit" || data.errorReason === "budget") &&
    retryCount < 2
  ) {
    return requestFinder(cleaned, retryCount + 1);
  }

  return data;
}

export async function findTikTokUser(input) {
  if (!input || typeof input !== "string") {
    throw new Error("Invalid username or URL");
  }

  let cleaned = input.trim();
  // Strip leading @ if entered as @username
  if (cleaned.startsWith("@")) {
    cleaned = cleaned.slice(1);
  }

  const data = await requestFinder(cleaned);

  if (data.status === "not_found") {
    return {
      status: false,
      notFound: true,
      message: "Account not found on TikTok.",
    };
  }

  if (data.status === "daily_limit" || data.errorReason === "budget") {
    return {
      status: false,
      dailyLimit: true,
      message: "Lookup service is temporarily busy. Please try again in a moment.",
    };
  }

  if (data.status === "unsupported") {
    return {
      status: false,
      message:
        data.unsupportedReason === "name"
          ? "Please search by @username or profile link, not person's full name."
          : "Invalid or unsupported TikTok link/username format.",
    };
  }

  const profile = data.profile;
  if (!profile) {
    throw new Error("Profile data not found in response.");
  }

  return {
    status: true,
    profile,
    cached: data.cacheStatus === "hit",
  };
}
