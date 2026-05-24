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

export type DirectusAssetTransform = {
  width?: number;
  height?: number;
  quality?: number;
  fit?: "cover" | "contain" | "inside" | "outside";
  format?: "jpg" | "png" | "webp" | "avif" | "tiff";
  withoutEnlargement?: boolean;
};

function buildAssetUrl(id: string) {
  return `${directus_url.replace(/\/$/, "")}/assets/${id}`;
}

function appendTransform(url: string, transform: DirectusAssetTransform | undefined) {
  if (!transform) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(transform)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  if (!qs) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${qs}`;
}

export function getDirectusAssetUrl(
  asset: DirectusAsset | string | null | undefined,
  transform?: DirectusAssetTransform,
) {
  const relativeURL = false
  console.log("asset::::", asset)
  if (!asset) return null;
  if (typeof asset === "string") return appendTransform(buildAssetUrl(asset), transform);

  if (asset.url) {
    const base = relativeURL ? asset.url : `${directus_url.replace(/\/$/, "")}${asset.url}`;
    return appendTransform(base, transform);
  }
  if (asset.fileURL) {
    const base = relativeURL ? asset.fileURL : `${directus_url.replace(/\/$/, "")}${asset.fileURL}`;
    return appendTransform(base, transform);
  }

  const assetId = asset.fileId ?? asset.filename_disk ?? asset.id;
  if (!assetId) return null;
  return appendTransform(buildAssetUrl(assetId), transform);
}

export function getDirectusAssetAlt(asset: DirectusAsset | string | null | undefined) {
  if (!asset || typeof asset === "string") return "";
  return asset.description ?? asset.title ?? asset.filename_download ?? asset.name ?? "";
}

export function getDirectusAssetSrcset(
  asset: DirectusAsset | string | null | undefined,
  widths: number[],
  transform?: Omit<DirectusAssetTransform, "width">,
) {
  return widths
    .map((width) => {
      const url = getDirectusAssetUrl(asset, { ...transform, width });
      return url ? `${url} ${width}w` : null;
    })
    .filter(Boolean)
    .join(", ");
}
