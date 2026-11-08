// pdfCompressor.js — PDF Compressor via pdf.js rendering + pdf-lib re-packaging
// High-performance binary stream pipeline using canvas.toBlob & ArrayBuffer
import { ensurePdfLib } from "../../utils/pdfHelper.js";

let pdfjsLibPromise = null;
export async function ensurePdfJs() {
  if (typeof window === "undefined") return null;
  if (window.pdfjsLib) return window.pdfjsLib;
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "js/vendor/pdf.min.js";
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "js/vendor/pdf.worker.min.js";
        }
        resolve(window.pdfjsLib);
      };
      script.onerror = () => {
        pdfjsLibPromise = null;
        reject(new Error("Failed to load pdf.min.js"));
      };
      document.head.appendChild(script);
    });
  }
  return pdfjsLibPromise;
}

export async function compressPdfFile(
  file,
  { level = "medium", onProgress = null } = {},
) {
  if (!file || !(file instanceof Blob || file instanceof File)) {
    throw new Error("Invalid PDF file provided.");
  }

  await Promise.all([ensurePdfLib(), ensurePdfJs()]);

  const { PDFDocument } = window.PDFLib || {};
  const pdfjs = window.pdfjsLib;

  if (!PDFDocument || !pdfjs) {
    throw new Error("PDF processing engine is not available.");
  }

  pdfjs.GlobalWorkerOptions.workerSrc = "js/vendor/pdf.worker.min.js";

  const arrayBuffer = await file.arrayBuffer();

  const configs = {
    low: { scale: 1.1, quality: 0.85 },
    medium: { scale: 0.9, quality: 0.7 },
    high: { scale: 0.7, quality: 0.5 },
  };
  const cfg = configs[level] || configs.medium;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapPacked: true,
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  if (!numPages || numPages === 0) {
    throw new Error("PDF document has no readable pages.");
  }

  const newPdf = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(pageNum, numPages);
    // Yield event loop to ensure UI progress bar / indicator renders smoothly
    await new Promise((r) => setTimeout(r, 0));

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: cfg.scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    // High performance zero-copy blob pipeline (eliminates atob base64 string loops)
    const imgBlob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", cfg.quality),
    );

    if (imgBlob) {
      const imgBuffer = await imgBlob.arrayBuffer();
      const embeddedImage = await newPdf.embedJpg(imgBuffer);
      const origViewport = page.getViewport({ scale: 1.0 });
      const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: origViewport.width,
        height: origViewport.height,
      });
    }

    canvas.width = 0;
    canvas.height = 0;
  }

  const compressedBytes = await newPdf.save({ useObjectStreams: true });
  const compressedBlob = new Blob([compressedBytes], {
    type: "application/pdf",
  });

  return {
    blob: compressedBlob,
    originalSize: file.size,
    compressedSize: compressedBlob.size,
    numPages,
  };
}
