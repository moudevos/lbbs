"use client";

import { compressImage, isAllowedImageType } from "@/lib/images/compress-image";

export async function prepareImageForUpload(file: File, options?: Parameters<typeof compressImage>[1]) {
  if (!isAllowedImageType(file)) throw new Error("Solo se permiten imagenes jpg, png o webp");
  return compressImage(file, options);
}

export async function uploadImageForm(endpoint: string, file: File, fieldName = "file") {
  const prepared = await prepareImageForUpload(file);
  const formData = new FormData();
  formData.set(fieldName, prepared);
  const response = await fetch(endpoint, { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "No se pudo subir la imagen");
  return data as { path: string; publicUrl?: string };
}
