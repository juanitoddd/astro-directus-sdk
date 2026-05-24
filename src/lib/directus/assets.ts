import { directus_url } from "@/lib/directus/directusSDK";

export type DirectusAsset = {
  id?: string | null;
  filename_disk?: string | null;
  filename_download?: string | null;
  description?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
  name?: string | null;
  size?: string | null;
  extension?: string | null;
  fileId?: string | null;
  fileURL?: string | null;
  url?: string | null;
};

function buildAssetUrl(id: string) {
  return `${directus_url.replace(/\/$/, "")}/assets/${id}`;
}

export function getDirectusAssetUrl(asset: DirectusAsset | string | null | undefined) {
  const relativeURL = false
  console.log("asset::::", asset)
  if (!asset) return null;
  if (typeof asset === "string") return buildAssetUrl(asset);

  if (asset.url) return relativeURL ? asset.url : `${directus_url.replace(/\/$/, "")}${asset.url}`;
  if (asset.fileURL) return asset.fileURL;

  const assetId = asset.fileId ?? asset.filename_disk ?? asset.id;
  if (!assetId) return null;
  return buildAssetUrl(assetId);
}

export function getDirectusAssetAlt(asset: DirectusAsset | string | null | undefined) {
  if (!asset || typeof asset === "string") return "";
  return asset.description ?? asset.title ?? asset.filename_download ?? asset.name ?? "";
}
