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

/**
 * Resolve a dimension to an absolute pixel number for a Directus transform param.
 * - Absolute pixels (`200`, `"200"`, `"200px"`) → that number.
 * - When `base` is given, `%`/`vw` resolve against it (e.g. `"50%"` with base 640 → 320) — used
 *   for mobile dimensions, where the breakpoint width IS the reference, so a `100%` image isn't
 *   requested larger than the breakpoint.
 * - Everything else (`"auto"`, `"20rem"`, `"vh"`, or `%`/`vw` with no `base`) → `undefined`, so
 *   the caller appends no param (the server can't resolve those to pixels).
 */
export function toPixelParam(
  value: number | string | null | undefined,
  base?: number,
): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : undefined;
  if (typeof value !== "string") return undefined;
  const v = value.trim();

  // Absolute pixels: "200" or "200px".
  const px = v.match(/^(\d+(?:\.\d+)?)(?:px)?$/i);
  if (px) {
    const n = Number(px[1]);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
  }

  // Relative to a known base (the breakpoint): "50%" / "50vw" → base * fraction.
  if (typeof base === "number" && Number.isFinite(base)) {
    const rel = v.match(/^(\d+(?:\.\d+)?)(?:%|vw)$/i);
    if (rel) {
      const n = (Number(rel[1]) / 100) * base;
      return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
    }
  }

  return undefined; // "auto", "rem", "vh", or %/vw without a base
}

export type DirectusFocalPoint = {
  focal_point_x?: number | null;
  focal_point_y?: number | null;
  width?: number | null;
  height?: number | null;
};

/**
 * Focal point (pixel coords) → object-position percentages, one per axis.
 * Returns `null` for an axis when the coord or the intrinsic dimension is missing.
 */
export function focalPointPercent(
  file: DirectusFocalPoint | null | undefined,
): { x: string | null; y: string | null } {
  const pct = (coord?: number | null, size?: number | null) =>
    coord != null && size ? `${Math.round((coord / size) * 10000) / 100}%` : null;
  return {
    x: pct(file?.focal_point_x, file?.width),
    y: pct(file?.focal_point_y, file?.height),
  };
}

/**
 * Focal point → inline `object-position:X% Y%` declaration (center fallback per axis).
 * Returns `undefined` when no focal point is set, so `style={…}` can be omitted.
 * Only visible when the image is cropped (`object-fit: cover` with a fixed height/aspect).
 */
export function focalToObjectPosition(file: DirectusFocalPoint | null | undefined): string | undefined {
  const { x, y } = focalPointPercent(file);
  return x || y ? `object-position:${x ?? "50%"} ${y ?? "50%"}` : undefined;
}

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
