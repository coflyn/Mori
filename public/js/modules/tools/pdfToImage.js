// pdfToImage.js — Convert PDF pages into high quality images (JPG or PNG)
// Uses pdf.js for off-thread client-side page rendering (100% offline, zero server reliance)
import { ensurePdfJs } from "./pdfCompressor.js";

/**
 * Converts a PDF file into an array of image blobs (one per page).
 * @param {File|Blob} file - PDF document file
 * @param {Object} options - Extraction options
 * @param {"image/jpeg"|"image/png"} [options.format="image/jpeg"] - Output image format
 * @param {number} [options.scale=1.5] - Render scale / resolution multiplier (1.5 = Standard, 2.0 = HD)
 * @param {number} [options.quality=0.92] - JPEG compression quality
 * @param {Function} [options.onProgress] - Progress callback (currentPage, totalPages)
 * @returns {Promise<{ pages: Array<{ pageNum: number, blob: Blob, width: number, height: number }>, numPages: number, totalSize: number }>}
 */
export async function pdfToImages(
  file,
  { format = "image/jpeg", scale = 1.5, quality = 0.92, onProgress = null } = {},
) {
  if (!file || !(file instanceof Blob || file instanceof File)) {
    throw new Error("Invalid PDF file provided.");
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("pdfToImages requires a DOM environment.");
  }

  await ensurePdfJs();

  const pdfjs = window.pdfjsLib;
  if (!pdfjs) {
    throw new Error("PDF rendering engine is not available.");
  }

  pdfjs.GlobalWorkerOptions.workerSrc = "js/vendor/pdf.worker.min.js";

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  if (!numPages || numPages === 0) {
    throw new Error("PDF document has no readable pages.");
  }

  const pages = [];
  let totalSize = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(pageNum, numPages);

    // Yield to browser event loop for UI responsiveness
    await new Promise((resolve) => setTimeout(resolve, 0));

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext("2d");

    if (format === "image/jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, format, quality),
    );

    if (blob) {
      pages.push({
        pageNum,
        blob,
        width: canvas.width,
        height: canvas.height,
      });
      totalSize += blob.size;
    }

    // Clean up canvas memory
    canvas.width = 0;
    canvas.height = 0;
  }

  return {
    pages,
    numPages,
    totalSize,
  };
}
