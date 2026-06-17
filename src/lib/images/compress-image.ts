"use client";

type CompressOptions = {
  maxBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: "image/webp" | "image/jpeg";
};

const defaultOptions: Required<CompressOptions> = {
  maxBytes: 2 * 1024 * 1024,
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.86,
  outputType: "image/webp"
};

export function isAllowedImageType(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

export async function compressImage(file: File, options: CompressOptions = {}) {
  const config = { ...defaultOptions, ...options };
  if (!isAllowedImageType(file)) throw new Error("Solo se permiten imagenes jpg, png o webp");
  if (file.size <= config.maxBytes && file.type === "image/webp") return file;

  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(config.maxWidth / bitmap.width, config.maxHeight / bitmap.height, 1);
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la compresion");
  context.drawImage(bitmap, 0, 0, width, height);

  let quality = config.quality;
  let blob = await canvasToBlob(canvas, config.outputType, quality);
  while (blob.size > config.maxBytes && quality > 0.62) {
    quality -= 0.06;
    blob = await canvasToBlob(canvas, config.outputType, quality);
  }
  if (blob.size > config.maxBytes) throw new Error("La imagen comprimida supera 2MB");

  const baseName = file.name.replace(/\.[^.]+$/, "");
  const extension = config.outputType === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${baseName}.${extension}`, { type: config.outputType });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("No se pudo comprimir la imagen"));
      else resolve(blob);
    }, type, quality);
  });
}
