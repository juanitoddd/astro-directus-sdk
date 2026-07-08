import { readFiles } from "@directus/sdk";
import directus from "./directusSDK";
import type { EditorJsContent } from "./types";

// Live `directus_files` fields refreshed onto each image block's snapshot `data.file`.
const REFRESH_FIELDS = [
  "id",
  "image_credits",
  "focal_point_x",
  "focal_point_y",
  "width",
  "height",
] as const;

/** The file id stored in an EditorJS image block's `data.file` (handles a few shapes). */
function fileIdOf(file: any): string | null {
  if (!file || typeof file !== "object") return null;
  return file.fileId ?? file.id ?? null;
}

/** Recursively collect every image block's `data.file` object (incl. nested flex/grid content). */
function collectImageFiles(node: any, out: any[]): void {
  if (Array.isArray(node)) {
    for (const n of node) collectImageFiles(n, out);
    return;
  }
  if (node && typeof node === "object") {
    if (node.type === "image" && node.data && typeof node.data === "object" && node.data.file) {
      out.push(node.data.file);
    }
    for (const value of Object.values(node)) collectImageFiles(value, out);
  }
}

/**
 * Refresh each image block's `data.file` with live `directus_files` metadata (image_credits,
 * focal point, intrinsic dimensions). Mutates `content` in place, so older EditorJS snapshots
 * pick up current values without re-saving the block. No-op if Directus is unavailable, there
 * are no images, or the fetch fails (snapshots are left untouched).
 */
export async function enrichEditorJsImages(content: EditorJsContent | null | undefined): Promise<void> {
  if (!directus || !content) return;

  const files: any[] = [];
  collectImageFiles(content, files);
  const ids = [...new Set(files.map(fileIdOf).filter((id): id is string => !!id))];
  if (ids.length === 0) return;

  let records: any[] = [];
  try {
    records = await directus.request(
      // @ts-expect-error — `image_credits` is a custom field not in the SDK's DirectusFile type
      readFiles({ filter: { id: { _in: ids } }, fields: [...REFRESH_FIELDS], limit: -1 }),
    );
  } catch {
    return; // permission/network issue — keep the existing snapshots
  }

  const byId = new Map(records.map((r) => [String(r.id), r]));
  for (const file of files) {
    const rec = byId.get(String(fileIdOf(file)));
    if (!rec) continue;
    for (const key of REFRESH_FIELDS) {
      if (key === "id") continue;
      if (rec[key] != null) file[key] = rec[key]; // fresh value wins
    }
  }
}
