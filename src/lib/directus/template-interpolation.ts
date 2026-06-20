import { pickTranslation } from "./types";
import type { EditorJsContent } from "./types";

/**
 * Resolve a dot-path against a fetched item.
 * - `name` → `item.name`
 * - `translations.biography` → `pickTranslation(item.translations, lang).biography`
 * Any segment named `translations` is resolved to the language-appropriate translation.
 */
function resolvePath(item: unknown, path: string, lang: string): unknown {
  const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
  let current: any = item;
  for (const key of parts) {
    if (current == null) return undefined;
    if (key === "translations" && Array.isArray(current.translations)) {
      current = pickTranslation(current.translations, lang);
      continue;
    }
    current = current[key];
  }
  return current;
}

const TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;

/** Replace every `{{path}}` token in a string with the resolved scalar value (missing → ""). */
function interpolateString(value: string, item: unknown, lang: string): string {
  return value.replace(TOKEN, (_match, path) => {
    const resolved = resolvePath(item, String(path), lang);
    if (resolved === undefined || resolved === null) return "";
    // v1: only scalar values are inlined. Relations/objects (e.g. images) are handled later.
    if (typeof resolved === "object") return "";
    return String(resolved);
  });
}

/** Deep-walk any value, interpolating every string it contains. */
function deepInterpolate(node: unknown, item: unknown, lang: string): unknown {
  if (typeof node === "string") return interpolateString(node, item, lang);
  if (Array.isArray(node)) return node.map((n) => deepInterpolate(n, item, lang));
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(node)) out[key] = deepInterpolate(val, item, lang);
    return out;
  }
  return node;
}

/**
 * Fill a display-template's EditorJS body with values from `item`, using the
 * current `lang` for any `{{translations.*}}` placeholders.
 */
export function interpolateTemplate(
  template: EditorJsContent,
  item: unknown,
  lang: string,
): EditorJsContent {
  return deepInterpolate(template, item, lang) as EditorJsContent;
}
