// imageConverter.js — Image format converter & compressor (WebP, JPG, PNG)
// Zero-copy memory decoding via URL.createObjectURL & createImageBitmap
export async function convertImage(
  file,
  { format = "image/jpeg", quality = 0.9, scale = 1.0 } = {},
) {
  if (!file || !(file instanceof Blob || file instanceof File)) {
    throw new Error("Invalid image file provided.");
  }

  // Preferred modern path: createImageBitmap (off-thread hardware accelerated decoding)
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const origW = bitmap.width;
      const origH = bitmap.height;
      const targetW = Math.max(1, Math.round(origW * scale));
      const targetH = Math.max(1, Math.round(origH * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");

      if (format === "image/jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetW, targetH);
      }

      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      bitmap.close?.();

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, format, quality),
      );
      if (!blob) throw new Error("Image conversion failed.");

      const ext =
        format === "image/jpeg"
          ? "jpg"
          : format === "image/png"
          ? "png"
          : "webp";

      return {
        blob,
        originalWidth: origW,
        originalHeight: origH,
        width: targetW,
        height: targetH,
        originalSize: file.size,
        convertedSize: blob.size,
        format,
        ext,
      };
    } catch (_) {
      // Fallback to Image element with ObjectURL below
    }
  }

  // Fallback path: HTMLImageElement with zero-copy URL.createObjectURL
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;
      const targetW = Math.max(1, Math.round(origW * scale));
      const targetH = Math.max(1, Math.round(origH * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");

      if (format === "image/jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetW, targetH);
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Image conversion failed."));
            return;
          }
          const ext =
            format === "image/jpeg"
              ? "jpg"
              : format === "image/png"
              ? "png"
              : "webp";

          resolve({
            blob,
            originalWidth: origW,
            originalHeight: origH,
            width: targetW,
            height: targetH,
            originalSize: file.size,
            convertedSize: blob.size,
            format,
            ext,
          });
        },
        format,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to decode image."));
    };

    img.src = objectUrl;
  });
}
