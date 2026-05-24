import { directus_url } from "@/lib/directus/directusSDK";

export type DirectusAsset = {
  id?: string | null;
  filename_disk?: string | null;
  filename_download?: string | null;
  description?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
};

export function getDirectusAssetUrl(asset: DirectusAsset | string | null | undefined) {
  if (!asset) return null;

  const assetId = typeof asset === "string" ? asset : asset.filename_disk ?? asset.id;
  if (!assetId) return null;

  return `${directus_url.replace(/\/$/, "")}/assets/${assetId}`;
}

export function getDirectusAssetAlt(asset: DirectusAsset | string | null | undefined) {
  if (!asset || typeof asset === "string") return "";
  return asset.description ?? asset.title ?? asset.filename_download ?? "";
}
