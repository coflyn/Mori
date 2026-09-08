// storage.js — file system downloading, retries, and persistence
import { Filesystem, CapacitorHttp } from "../utils/index.js";
import { translations } from "../i18n/index.js";
import { currentLang } from "../modules/core.js";

/**
 * Removes temporary .tmp files across all search directories
 */
export async function cleanupTempFiles(fullPath, fileName, directoriesToTry) {
  if (!Filesystem) return;
  for (const dir of directoriesToTry) {
    await Filesystem.deleteFile({
      path: fullPath + "/" + `${fileName}.tmp`,
      directory: dir,
    }).catch(() => {});
  }
}

/**
 * Deletes saved file across directories (e.g. after cancellation)
 */
export async function deleteSavedFile(savedFile, directoriesToTry) {
  if (!Filesystem || !savedFile?.path) return;
  for (const dir of directoriesToTry) {
    await Filesystem.deleteFile({
      path: savedFile.path,
      directory: dir,
    }).catch(() => {});
  }
}

/**
 * Executes file download using Tauri, Capacitor Filesystem, or CapacitorHttp fallback
 */
export async function saveToStorage({
  actualDownloadUrl,
  fileName,
  fullPath,
  targetFolder,
  downloadHeaders,
  directoriesToTry,
  checkCancelled,
}) {
  let savedFile = null;
  let successfulDir = "EXTERNAL_STORAGE";
  let attempts = 0;

  const isAutoRetry = localStorage.getItem("mori_auto_retry") !== "false";
  const customMaxRetry = parseInt(
    localStorage.getItem("mori_max_retry") || "3",
    10,
  );
  const maxAttempts = isAutoRetry ? customMaxRetry : 1;

  const tauriInvoke =
    window.__TAURI__?.core?.invoke ||
    window.__TAURI_INTERNALS__?.invoke ||
    window.__TAURI__?.invoke;

  // 1. Desktop / Tauri Invocation
  if (tauriInvoke) {
    try {
      const desktopRes = await tauriInvoke("tauri_download_file", {
        url: actualDownloadUrl,
        filename: fileName,
        folder: targetFolder || "",
        headers: downloadHeaders || {},
      });
      if (desktopRes && desktopRes.status) {
        savedFile = { path: desktopRes.path, uri: desktopRes.uri };
      }
    } catch (tErr) {
      console.warn("Tauri native download failed:", tErr);
      throw new Error(
        typeof tErr === "string"
          ? tErr
          : tErr?.message || JSON.stringify(tErr),
      );
    }
  }

  // 2. Mobile / Capacitor Filesystem Download
  if (!savedFile && Filesystem) {
    for (const dir of directoriesToTry) {
      if (savedFile) break;
      attempts = 0;
      while (attempts < maxAttempts && !savedFile) {
        if (checkCancelled()) {
          await cleanupTempFiles(fullPath, fileName, directoriesToTry);
          return { savedFile: null, successfulDir, cancelled: true };
        }
        attempts++;
        try {
          if (attempts > 1) {
            await new Promise((r) => setTimeout(r, 1000));
          }
          const isBypassSsl =
            localStorage.getItem("mori_bypass_ssl") === "true";
          const isForceIpv4 =
            localStorage.getItem("mori_force_ipv4") === "true";

          const tempFileName = `${fileName}.tmp`;
          const dlOpts = {
            url: actualDownloadUrl,
            path: fullPath + "/" + tempFileName,
            directory: dir,
            progress: true,
            headers: downloadHeaders,
          };
          if (isBypassSsl) dlOpts.disableSSLValidation = true;
          if (isForceIpv4) dlOpts.ipv4Only = true;

          const tempSaved = await Filesystem.downloadFile(dlOpts);
          if (tempSaved) {
            // Rename .tmp to actual file name atomically on completion
            try {
              await Filesystem.rename({
                from: fullPath + "/" + tempFileName,
                to: fullPath + "/" + fileName,
                directory: dir,
              });
              savedFile = { path: fullPath + "/" + fileName };
            } catch (_) {
              // Fallback copy if rename unsupported
              await Filesystem.copy({
                from: fullPath + "/" + tempFileName,
                to: fullPath + "/" + fileName,
                directory: dir,
              });
              await Filesystem.deleteFile({
                path: fullPath + "/" + tempFileName,
                directory: dir,
              }).catch(() => {});
              savedFile = { path: fullPath + "/" + fileName };
            }
            successfulDir = dir;
          }
        } catch (dlErr) {
          console.warn(
            `Download attempt ${attempts} on ${dir} failed:`,
            dlErr,
          );
          // Clean up leftover .tmp file on error
          await Filesystem.deleteFile({
            path: fullPath + "/" + `${fileName}.tmp`,
            directory: dir,
          }).catch(() => {});

          // Fallback to CapacitorHttp blob download if retries exhausted
          if (attempts >= maxAttempts && CapacitorHttp) {
            try {
              const httpRes = await CapacitorHttp.get({
                url: actualDownloadUrl,
                responseType: "blob",
                headers: downloadHeaders,
                connectTimeout: 20000,
                readTimeout: 30000,
              });
              if (
                httpRes &&
                httpRes.status === 200 &&
                httpRes.data &&
                typeof httpRes.data === "string"
              ) {
                await Filesystem.writeFile({
                  path: fullPath + "/" + fileName,
                  data: httpRes.data,
                  directory: dir,
                });
                savedFile = { path: fullPath + "/" + fileName };
                successfulDir = dir;
              }
            } catch (fallbackErr) {
              console.warn(
                `Http blob fallback on ${dir} failed:`,
                fallbackErr,
              );
            }
          }
        }
      }
    }
  }

  if (!savedFile) {
    if (checkCancelled()) {
      await cleanupTempFiles(fullPath, fileName, directoriesToTry);
      return { savedFile: null, successfulDir, cancelled: true };
    }
    await cleanupTempFiles(fullPath, fileName, directoriesToTry);
    throw new Error(
      translations[currentLang]?.["toast-download-failed"] || "Download failed",
    );
  }

  if (checkCancelled()) {
    await deleteSavedFile(savedFile, directoriesToTry);
    return { savedFile: null, successfulDir, cancelled: true };
  }

  return { savedFile, successfulDir, cancelled: false };
}
