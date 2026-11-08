// imageConverter.js — Image format converter & compressor (WebP, JPG, PNG)
export async function convertImage(
  file,
  { format = "image/jpeg", quality = 0.9, scale = 1.0 },
) {
  if (!file || !(file instanceof Blob || file instanceof File)) {
    throw new Error("Invalid image file provided.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const targetW = Math.max(1, Math.round(origW * scale));
        const targetH = Math.max(1, Math.round(origH * scale));

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");

        if (format === "image/jpeg") {
          // Fill white background for transparent images
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
      img.onerror = () => reject(new Error("Failed to decode image."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}
