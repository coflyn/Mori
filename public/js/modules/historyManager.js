import { Filesystem } from "../utils/index.js";

const HISTORY_KEY = "mori_history";

export function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse history:", e);
    return [];
  }
}

export function saveHistory(history) {
  try {
    const limit =
      parseInt(localStorage.getItem("mori_history_limit"), 10) || 50;
    const trimmed = history.slice(0, limit);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error("Failed to save history:", e);
  }
}

export function addHistoryItem(item) {
  if (localStorage.getItem("mori_incognito") === "true") return;

  const history = getHistory();
  // Prevent exact duplicate URLs at the top
  const existingIdx = history.findIndex((h) => h.url === item.url);
  if (existingIdx !== -1) {
    history.splice(existingIdx, 1);
  }

  history.unshift({
    id: Date.now().toString(),
    timestamp: Date.now(),
    title: item.title || "Media Download",
    thumbnail: item.thumbnail || null,
    downloads: item.downloads || [],
    url: item.url || "",
    source: item.source || "Mori",
  });

  saveHistory(history);
}

export async function deleteHistoryItem(id) {
  let history = getHistory();
  const target = history.find((item) => item.id === id);

  if (
    target &&
    target.thumbnail &&
    !target.thumbnail.startsWith("data:") &&
    !target.thumbnail.startsWith("http")
  ) {
    try {
      if (window.Capacitor?.isNativePlatform() && Filesystem) {
        await Filesystem.deleteFile({
          path: target.thumbnail,
          directory: "CACHE",
        });
      }
    } catch (e) {
      console.warn("Failed to delete thumbnail cache file:", e);
    }
  }

  history = history.filter((item) => item.id !== id);
  saveHistory(history);
  return history;
}

export function clearAllHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function autoClearExpiredHistory() {
  const retentionDays =
    parseInt(localStorage.getItem("mori_history_retention"), 10) || 0;
  if (retentionDays <= 0) return;

  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let history = getHistory();
  const filtered = history.filter((item) => item.timestamp > cutoffTime);

  if (filtered.length !== history.length) {
    saveHistory(filtered);
    console.log(
      `[HISTORY CLEANUP] Purged ${history.length - filtered.length} expired history items older than ${retentionDays} days.`,
    );
  }
}
