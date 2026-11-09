// storageHelper.js — Helper to save generated/converted blobs to Mori folders or trigger download
import { Filesystem, showToast, triggerHaptic } from "../../utils/index.js";

export async function saveBlobToMori(blob, fileName, folder = "Download/Mori", meta = {}) {
  if (!blob) {
    showToast("No data to save");
    return { success: false, error: "No blob data" };
  }

  const notifyFileSaved = (savedPath, savedUri) => {
    const isAudio = /\.(mp3|wav|m4a|aac|flac|ogg|opus|weba)(\?|#|$)/i.test(fileName);
    const isPdf = /\.pdf(\?|#|$)/i.test(fileName);
    const isImage = /\.(jpe?g|png|webp|gif|svg|avif|bmp)(\?|#|$)/i.test(fileName);
    const isVideo = /\.(mp4|webm|mov|mkv|m4v|3gp|flv)(\?|#|$)/i.test(fileName);
    const defaultType = isVideo ? "VIDEO" : isAudio ? "MP3" : isPdf ? "PDF" : isImage ? "IMAGE" : "FILE";

    const toolKey = meta.tool || "tool";
    const itemUrl = meta.url || `mori-tool://${toolKey}/${Date.now()}/${encodeURIComponent(fileName)}`;

    window.dispatchEvent(
      new CustomEvent("mori_file_saved", {
        detail: {
          url: itemUrl,
          sourceUrl: meta.sourceUrl || itemUrl,
          path: savedPath,
          uri: savedUri || savedPath,
          title: meta.title || fileName,
          thumbnail: meta.thumbnail || null,
          type: meta.type || defaultType,
        },
      }),
    );
  };

  // 1. Convert blob to pure base64
  let base64Data = "";
  try {
    const reader = new FileReader();
    base64Data = await new Promise((resolve, reject) => {
      reader.onload = () => {
        const res = String(reader.result || "");
        const commaIdx = res.indexOf(",");
        resolve(commaIdx !== -1 ? res.slice(commaIdx + 1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    showToast("Failed to process file data");
    return { success: false, error: err.message };
  }

  // 2. Android Native Bridge Direct File Save (Highest Reliability)
  if (typeof window !== "undefined" && window.MoriMainBridge?.saveBase64File) {
    try {
      const ok = window.MoriMainBridge.saveBase64File(base64Data, folder, fileName);
      if (ok) {
        triggerHaptic("success");
        showToast(`Saved: ${fileName}`);
        const fullSavedPath = `${folder}/${fileName}`;
        notifyFileSaved(fullSavedPath, fullSavedPath);
        return { success: true, path: fullSavedPath, uri: fullSavedPath };
      }
    } catch (bridgeErr) {
      console.warn("MoriMainBridge.saveBase64File failed:", bridgeErr);
    }
  }

  // 3. Capacitor Filesystem Plugin (iOS / Android fallback)
  if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() && Filesystem) {
    const directories = ["EXTERNAL_STORAGE", "DOCUMENTS", "EXTERNAL"];
    const foldersToTry = [folder, "Download/Mori", "Documents/Mori"];

    for (const targetFolder of foldersToTry) {
      for (const dir of directories) {
        try {
          await Filesystem.mkdir({
            path: targetFolder,
            directory: dir,
            recursive: true,
          }).catch(() => {});

          await Filesystem.writeFile({
            path: `${targetFolder}/${fileName}`,
            directory: dir,
            data: base64Data,
            recursive: true,
          });

          const fullSavedPath = `${targetFolder}/${fileName}`;
          if (window.MoriMainBridge?.scanMediaFile) {
            window.MoriMainBridge.scanMediaFile(fullSavedPath);
          }
          let savedUri = fullSavedPath;
          try {
            const uriObj = await Filesystem.getUri({
              path: fullSavedPath,
              directory: dir,
            });
            if (uriObj?.uri) savedUri = uriObj.uri;
          } catch (_) {}

          triggerHaptic("success");
          showToast(`Saved: ${fileName}`);
          notifyFileSaved(fullSavedPath, savedUri);
          return { success: true, path: fullSavedPath, uri: savedUri };
        } catch (_) {}
      }
    }
  }

  // 4. Web browser download fallback
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerHaptic("success");
    showToast(`Downloaded: ${fileName}`);
    notifyFileSaved(fileName, url);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { success: true, path: fileName, uri: url };
  } catch (err) {
    showToast("Failed to save file");
    return { success: false, error: err.message };
  }
}
