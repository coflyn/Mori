// imageToPdf.js — Convert multiple images into a single PDF document
// Uses pdf-lib for pure client-side PDF composition (zero external API, 100% offline)
import { ensurePdfLib } from "../../utils/pdfHelper.js";

/**
 * Converts an array of image File/Blob objects into a single PDF Blob.
 * @param {Array<File|Blob>} files - List of image files
 * @param {Object} options - Conversion options
 * @param {"fit"|"a4"} [options.pageSize="fit"] - "fit" (original image dimensions) or "a4" (standard A4 page)
 * @param {number} [options.quality=0.9] - Compression quality for canvas fallback (WebP/other)
 * @param {Function} [options.onProgress] - Progress callback (current, total)
 * @returns {Promise<{ blob: Blob, numPages: number, size: number }>}
 */
export async function imagesToPdf(
  files,
  { pageSize = "fit", quality = 0.9, onProgress = null } = {},
) {
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new Error("No image files provided.");
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file || !(file instanceof Blob || file instanceof File)) {
      throw new Error(`Invalid file at index ${i}. Expected File or Blob.`);
    }
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("imagesToPdf requires a DOM environment.");
  }

  await ensurePdfLib();

  const { PDFDocument } = window.PDFLib || {};
  if (!PDFDocument) {
    throw new Error("PDF processing engine is not available.");
  }

  const pdfDoc = await PDFDocument.create();
  const total = files.length;

  // A4 dimensions in PDF points (72 points per inch)
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    onProgress?.(i + 1, total);

    // Yield to UI rendering loop
    await new Promise((resolve) => setTimeout(resolve, 0));

    let image = null;
    const arrayBuffer = await file.arrayBuffer();

    // 1. Direct embed attempt (JPG / PNG)
    if (file.type === "image/jpeg" || file.type === "image/jpg") {
      try {
        image = await pdfDoc.embedJpg(arrayBuffer);
      } catch (_) {
        image = null;
      }
    } else if (file.type === "image/png") {
      try {
        image = await pdfDoc.embedPng(arrayBuffer);
      } catch (_) {
        image = null;
      }
    }

    // 2. Fallback via Canvas (handles WebP, AVIF, HEIC, or corrupt EXIF headers)
    if (!image) {
      const imgBuffer = await new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 1000;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                reject(new Error(`Failed to convert image at index ${i}`));
                return;
              }
              const buf = await blob.arrayBuffer();
              resolve(buf);
            },
            "image/jpeg",
            quality,
          );
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error(`Failed to load image at index ${i}`));
        };
        img.src = objectUrl;
      });

      image = await pdfDoc.embedJpg(imgBuffer);
    }

    // 3. Page layout calculation
    if (pageSize === "a4") {
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      const imgRatio = image.width / image.height;
      const pageRatio = A4_WIDTH / A4_HEIGHT;

      let drawWidth = A4_WIDTH;
      let drawHeight = A4_HEIGHT;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > pageRatio) {
        // Image is wider than A4
        drawWidth = A4_WIDTH;
        drawHeight = A4_WIDTH / imgRatio;
        offsetY = (A4_HEIGHT - drawHeight) / 2;
      } else {
        // Image is taller than A4
        drawHeight = A4_HEIGHT;
        drawWidth = A4_HEIGHT * imgRatio;
        offsetX = (A4_WIDTH - drawWidth) / 2;
      }

      page.drawImage(image, {
        x: offsetX,
        y: offsetY,
        width: drawWidth,
        height: drawHeight,
      });
    } else {
      // "fit": page dimension matches image resolution 1:1 (cleanest & highest quality)
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

  return {
    blob: pdfBlob,
    numPages: total,
    size: pdfBlob.size,
  };
}
