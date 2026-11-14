// update.js — GitHub release check, in-app updater & about/share modals
import { translations, t } from "../i18n/index.js";
import { CapacitorHttp, Share, showToast, Filesystem } from "../utils/index.js";
import { showInfoModal } from "./modals.js";
import {
  APP_VERSION,
  UPDATE_CHECK_URL,
  REPO_URL,
  checkUpdateBtn,
  currentLang,
  openExternalUrl,
  howToUseBtn,
  aboutAppBtn,
  shareAppBtn,
} from "./core.js";

export function isNewerVersion(latest, current) {
  if (!latest || !current) return false;
  const parse = (v) => v.split(".").map((n) => parseInt(n, 10) || 0);
  const l = parse(latest);
  const c = parse(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const numL = l[i] || 0;
    const numC = c[i] || 0;
    if (numL > numC) return true;
    if (numL < numC) return false;
  }
  return false;
}

async function fetchLatestRelease() {
  let data;
  if (CapacitorHttp) {
    const res = await CapacitorHttp.get({
      url: UPDATE_CHECK_URL,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Mori-App",
      },
    });
    data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  } else {
    const res = await fetch(UPDATE_CHECK_URL);
    data = await res.json();
  }
  return data;
}

function formatChangelog(raw, latest, publishedAt, lang = {}) {
  const badgeText = lang["label-latest"] || "LATEST";
  const pubDate = publishedAt ? new Date(publishedAt) : new Date();
  const dateStr = !isNaN(pubDate.getTime())
    ? pubDate.toLocaleDateString(currentLang || "en", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const lines = (raw || "").replace(/\r\n/g, "\n").split("\n");
  let items = [];
  for (const rawLine of lines) {
    if (/^\s{2,}/.test(rawLine)) continue;
    const line = rawLine.trim();
    if (!line || /^#{1,6}\s+/.test(line) || /^[-*_]{3,}$/.test(line)) continue;
    const isBullet = /^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line);
    const hasBold = /\*\*[^*]+\*\*/.test(line);
    if (!isBullet && !hasBold) continue;

    const bulletMatch =
      line.match(/^[-*+]\s+(.*)$/) || line.match(/^\d+\.\s+(.*)$/);
    const text = bulletMatch ? bulletMatch[1].trim() : line;
    const boldMatch = text.match(/^\*\*([^*]+)\*\*[:\s-]*(.*)$/);
    if (boldMatch) {
      const title = boldMatch[1].trim().replace(/:$/, "");
      const desc = boldMatch[2]
        .trim()
        .replace(/^[:\-–—]\s*/, "")
        .replace(/[`]/g, "");
      items.push({ title: `${title}:`, desc });
    } else {
      const cleaned = text.replace(/[*_`#]/g, "").trim();
      if (cleaned.length > 0) {
        items.push({ title: cleaned, desc: "" });
      }
    }
    if (items.length >= 8) break;
  }

  if (items.length === 0) {
    items.push({
      title: lang["label-update-available"] || "New update available",
      desc: "",
    });
  }

  const itemsHtml = items
    .map(
      (item) => `
      <li style="display:flex;align-items:flex-start;gap:9px;line-height:1.4;font-size:0.84rem;text-align:left;">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#d9778a;margin-top:6px;flex-shrink:0;"></span>
        <div style="flex:1;word-break:break-word;">
          <strong style="color:var(--text-main, #1a1917);font-weight:700;">${item.title}</strong>${
            item.desc
              ? ` <span style="color:var(--text-muted, #666);">${item.desc}</span>`
              : ""
          }
        </div>
      </li>`,
    )
    .join("");

  return `
    <div style="margin:10px 0 14px 0;padding:14px 16px;background:var(--bg-card, rgba(0,0,0,0.03));border:1px solid var(--border-color, rgba(0,0,0,0.08));border-radius:14px;text-align:left;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:inline-flex;align-items:center;gap:8px;">
          <span style="font-size:1.15rem;font-weight:800;font-family:var(--font-serif, inherit);color:var(--text-main, #1a1917);letter-spacing:-0.2px;">v${latest}</span>
          <span style="background:#1a1917;color:#fff;font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:4px;letter-spacing:0.5px;text-transform:uppercase;line-height:1.4;">${badgeText}</span>
        </div>
        ${dateStr ? `<span style="font-size:0.8rem;color:var(--text-muted, #888);font-weight:500;">${dateStr}</span>` : ""}
      </div>
      <div style="height:1px;background:var(--border-color, rgba(0,0,0,0.08));margin:10px 0 12px 0;"></div>
      <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px;max-height:170px;overflow-y:auto;">
        ${itemsHtml}
      </ul>
    </div>
  `;
}

async function downloadAndInstallApk(apkAsset, latest, btn) {
  const isAndroid =
    window.Capacitor?.isNativePlatform?.() &&
    window.Capacitor?.getPlatform?.() === "android";

  if (!isAndroid || !window.MoriMainBridge?.installApk || !Filesystem) {
    openExternalUrl(apkAsset?.browser_download_url || REPO_URL);
    return;
  }

  const lang = translations[currentLang] || {};
  const apkFileName = apkAsset.name || `Mori-v${latest}.apk`;
  const targetPath = `Download/Mori/${apkFileName}`;
  let progressListener = null;

  const dlPrefix = (
    lang["downloading-progress"] || "Downloading..."
  ).replace(/\.+$/, "");

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = `${dlPrefix}... 0%`;
    }

    if (Filesystem.addListener) {
      progressListener = await Filesystem.addListener("progress", (p) => {
        if (p && p.contentLength > 0 && btn) {
          const pct = Math.min(
            99,
            Math.floor((p.bytes / p.contentLength) * 100),
          );
          btn.textContent = `${dlPrefix}... ${pct}%`;
        }
      });
    }

    let savedDir = "EXTERNAL_STORAGE";
    await Filesystem.downloadFile({
      url: apkAsset.browser_download_url,
      path: targetPath,
      directory: "EXTERNAL_STORAGE",
      progress: true,
    }).catch(async () => {
      savedDir = "DOCUMENTS";
      await Filesystem.downloadFile({
        url: apkAsset.browser_download_url,
        path: targetPath,
        directory: "DOCUMENTS",
        progress: true,
      });
    });

    if (progressListener) {
      try {
        await progressListener.remove();
      } catch (_) {}
      progressListener = null;
    }

    if (btn) {
      btn.textContent =
        lang["label-opening-installer"] || "Opening installer...";
    }

    let apkUri = targetPath;
    try {
      const uriObj = await Filesystem.getUri({
        path: targetPath,
        directory: savedDir,
      });
      if (uriObj?.uri) apkUri = uriObj.uri;
    } catch (_) {}

    window.MoriMainBridge.installApk(apkUri);
  } catch (err) {
    console.error("In-app update download failed:", err);
    const failMsg = lang["toast-download-failed"] || "Download failed";
    showToast?.(`${failMsg}, ${lang["label-open-github"] || "opening GitHub..."}`);
    openExternalUrl(apkAsset?.browser_download_url || REPO_URL);
  } finally {
    if (progressListener) {
      try {
        await progressListener.remove();
      } catch (_) {}
    }
    if (btn) {
      btn.disabled = false;
      const apkSize = apkAsset?.size
        ? ` (${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB)`
        : "";
      btn.textContent = `${lang["btn-download-install"] || "DOWNLOAD & INSTALL"}${apkSize}`;
    }
  }
}

function showUpdateModal(data, latest, isManual = false) {
  const lang = translations[currentLang] || {};
  const title = lang["label-update-available"] || "Update Available";
  const apkAsset = data?.assets?.find(
    (a) => a.name && a.name.toLowerCase().endsWith(".apk"),
  );
  const apkSize = apkAsset?.size
    ? `(${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB)`
    : "";
  const changelogHtml = formatChangelog(
    data?.body,
    latest,
    data?.published_at,
    lang,
  );

  const isAndroid =
    window.Capacitor?.isNativePlatform?.() &&
    window.Capacitor?.getPlatform?.() === "android";
  const btnLabel = isAndroid
    ? `${lang["btn-download-install"] || "DOWNLOAD & INSTALL"}${apkSize ? ` ${apkSize}` : ""}`
    : (lang["btn-update"] || "UPDATE");
  const openGithubLabel = lang["label-open-github"] || "Open in GitHub";

  const msg = `
    <div style="text-align:center;padding:2px 0;">
      ${changelogHtml}
      <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
        <button id="inAppUpdateBtn" class="primary-btn" style="width:100%;padding:11px 16px;border-radius:8px;font-weight:700;cursor:pointer;border:none;background:var(--primary);color:#fff;">
          ${btnLabel}
        </button>
        <span id="manualRepoLink" style="font-size:0.8rem;color:var(--text-muted, #888);text-decoration:underline;cursor:pointer;">
          ${openGithubLabel}
        </span>
      </div>
    </div>
  `;

  const skipKey = `mori_skip_auto_update_v${latest}`;
  showInfoModal(title, msg, {
    showDontShow: !isManual,
    dontShowKey: skipKey,
    dontShowLabel: lang["label-dont-show-again"] || "Don't show again",
  });

  setTimeout(() => {
    const updateBtn = document.getElementById("inAppUpdateBtn");
    const repoLink = document.getElementById("manualRepoLink");

    if (updateBtn) {
      updateBtn.onclick = () => {
        if (apkAsset) {
          downloadAndInstallApk(apkAsset, latest, updateBtn);
        } else {
          openExternalUrl(data?.html_url || REPO_URL);
        }
      };
    }

    if (repoLink) {
      repoLink.onclick = () => {
        openExternalUrl(data?.html_url || REPO_URL);
      };
    }
  }, 50);
}

export async function checkUpdate() {
  const actionLabel = checkUpdateBtn?.querySelector(".action-label");
  const origText = actionLabel?.textContent;
  if (actionLabel) {
    actionLabel.textContent = translations[currentLang]["btn-processing"];
  }

  try {
    const data = await fetchLatestRelease();
    const latest = (data?.tag_name || "").replace(/^v/i, "");

    if (latest && isNewerVersion(latest, APP_VERSION)) {
      if (actionLabel) actionLabel.textContent = translations[currentLang]["btn-update"];
      showUpdateModal(data, latest, true);
    } else {
      if (actionLabel) actionLabel.textContent = origText;
      const lang = translations[currentLang] || {};
      showInfoModal(lang["label-update"] || "Update", `${lang["label-up-to-date"] || "App is up to date."}`);
    }
  } catch (e) {
    console.error("Update check failed:", e);
    if (actionLabel) actionLabel.textContent = origText;
    const lang = translations[currentLang] || {};
    showInfoModal(
      lang["label-check-failed"] || "Check Failed",
      lang["label-check-failed-msg"] ||
        "Unable to reach GitHub. Check your connection and try again.",
    );
  }
}

export async function autoCheckUpdate() {
  if (localStorage.getItem("mori_auto_update") === "false") return;

  try {
    const data = await fetchLatestRelease();
    const latest = (data?.tag_name || "").replace(/^v/i, "");
    const skipKey = `mori_skip_auto_update_v${latest}`;
    if (localStorage.getItem(skipKey)) return;

    if (latest && isNewerVersion(latest, APP_VERSION)) {
      showUpdateModal(data, latest, false);
    }
  } catch (e) {
    console.warn("Auto update check failed:", e);
  }
}

checkUpdateBtn?.addEventListener("click", checkUpdate);
autoCheckUpdate();

howToUseBtn?.addEventListener("click", () => {
  const lang = translations[currentLang];
  const steps = lang["howtouse-steps"]
    .map((s, i) => `${i + 1}. ${s}`)
    .join("<br><br>");
  showInfoModal(lang["label-howtouse"], steps);
});

aboutAppBtn?.addEventListener("click", () => {
  const lang = translations[currentLang];
  showInfoModal(lang["label-about"], lang["about-text"]);
});

shareAppBtn?.addEventListener("click", async () => {
  const lang = translations[currentLang];
  if (window.Capacitor?.isNativePlatform?.() && Share) {
    await Share.share({
      title: "Mori App",
      text: lang["share-msg"],
      url: "https://github.com/coflyn/Mori",
      dialogTitle: "Share Mori",
    });
  } else {
    if (navigator.share) {
      navigator.share({
        title: "Mori App",
        text: lang["share-msg"],
        url: "https://github.com/coflyn/Mori",
      });
    } else {
      showToast(t("toast-share-not-supported"));
    }
  }
});

// Test trigger for development/testing popup
window.testUpdatePopup = (mockVersion = "4.5.3") => {
  showUpdateModal(
    {
      tag_name: `v${mockVersion}`,
      published_at: "2026-11-06T06:13:43Z",
      body: "- **Batch Media Format Setting**:\n- **Pure Audio Batch Handling**:\n- **Batch YouTube Shorts Normalization**:\n- **YouTube Shorts Download (#20)**:",
      assets: [
        {
          name: `Mori-v${mockVersion}.apk`,
          size: 3565158,
          browser_download_url: "https://github.com/coflyn/Mori/releases/latest",
        },
      ],
    },
    mockVersion,
    true,
  );
};

