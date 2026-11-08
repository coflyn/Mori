// animeSearch.js — Anime Scene Search via trace.moe API
const TRACE_API_BASE = "https://api.trace.moe/search";

export function formatTimestamp(seconds) {
  if (typeof seconds !== "number" || isNaN(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export async function searchAnimeScene(input) {
  if (!input) {
    throw new Error("Please provide an image URL or upload an image file.");
  }

  let res;
  if (typeof input === "string") {
    const cleanUrl = input.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      throw new Error("Invalid image URL. Must begin with http:// or https://");
    }

    const endpoint = `${TRACE_API_BASE}?anilistInfo&url=${encodeURIComponent(cleanUrl)}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Search limit reached. Please wait a minute and try again.");
      }
      const errText = await response.text().catch(() => "");
      throw new Error(errText || `Failed to search image (HTTP ${response.status})`);
    }
    res = await response.json();
  } else if (input instanceof Blob || input instanceof File) {
    const formData = new FormData();
    formData.append("image", input);

    const endpoint = `${TRACE_API_BASE}?anilistInfo`;
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Search limit reached. Please wait a minute and try again.");
      }
      if (response.status === 413) {
        throw new Error("Image file is too large. Maximum allowed size is 25MB.");
      }
      const errText = await response.text().catch(() => "");
      throw new Error(errText || `Failed to process image (HTTP ${response.status})`);
    }
    res = await response.json();
  } else {
    throw new Error("Unsupported input format for anime search.");
  }

  if (res?.error) {
    throw new Error(res.error);
  }

  const rawResults = Array.isArray(res?.result) ? res.result : [];
  if (rawResults.length === 0) {
    return {
      status: true,
      results: [],
      frameCount: res?.frameCount || 0,
    };
  }

  // Format and sort by similarity descending
  const results = rawResults
    .filter((item) => (item.similarity || 0) >= 0.7) // Keep reasonable matches (>= 70%)
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, 5) // Top 5 best matches
    .map((item) => {
      const anilist = item.anilist || {};
      const titles = anilist.title || {};
      const englishTitle = titles.english || "";
      const romajiTitle = titles.romaji || "";
      const nativeTitle = titles.native || "";
      const mainTitle = englishTitle || romajiTitle || nativeTitle || item.filename || "Unknown Anime";

      const timeRange = `${formatTimestamp(item.from)} - ${formatTimestamp(item.to)}`;
      const similarityPct = `${((item.similarity || 0) * 100).toFixed(1)}%`;

      return {
        mainTitle,
        romajiTitle,
        nativeTitle,
        episode: item.episode !== null && item.episode !== undefined ? item.episode : "N/A",
        from: item.from,
        to: item.to,
        timeRange,
        similarity: item.similarity,
        similarityPct,
        videoUrl: item.video,
        imageUrl: item.image,
        anilistId: anilist.id,
        anilistUrl: anilist.siteUrl || (anilist.id ? `https://anilist.co/anime/${anilist.id}` : ""),
        malUrl: anilist.idMal ? `https://myanimelist.net/anime/${anilist.idMal}` : "",
      };
    });

  return {
    status: true,
    results,
    frameCount: res?.frameCount || 0,
  };
}
