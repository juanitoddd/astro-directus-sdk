import { getDirectusAssetUrl } from "./assets";
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

// ---------------------------------------------------------------------------
// Image tokens: {{image:<sourceField>, alt=<value>, link=<value>, maxWidth=…, maxHeight=…}}
// `image:` prefix marks an image. The first arg is the source file field (resolved from the
// item). Attributes are comma-separated key=value pairs where a quoted value is a literal and
// an unquoted value is a field reference resolved from the item.
// ---------------------------------------------------------------------------

/** Split on top-level commas, ignoring commas inside quotes. */
function splitArgs(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (const ch of input) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
    } else if (ch === ",") {
      args.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim() !== "") args.push(current);
  return args.map((a) => a.trim());
}

function isQuoted(value: string): boolean {
  return (
    value.length >= 2 &&
    ((value[0] === "'" && value.endsWith("'")) || (value[0] === '"' && value.endsWith('"')))
  );
}

/** Quoted → literal string; unquoted → field reference resolved from the item. */
function resolveValue(raw: string, item: unknown, lang: string): unknown {
  if (isQuoted(raw)) return raw.slice(1, -1);
  return resolvePath(item, raw, lang);
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toPixels(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function dimensionCss(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "number" ? `${value}px` : String(value);
}

/** Build the `<img>` (optionally linked) HTML for an `image:` token's body. */
function renderImageToken(spec: string, item: unknown, lang: string): string {
  const args = splitArgs(spec);
  if (args.length === 0) return "";

  // First arg = source file field (a reference unless explicitly quoted as a literal id/url).
  const source = resolveValue(args[0], item, lang);
  if (source === undefined || source === null || source === "") return "";

  const attrs: Record<string, unknown> = {};
  for (let i = 1; i < args.length; i++) {
    const eq = args[i].indexOf("=");
    if (eq === -1) continue;
    const key = args[i].slice(0, eq).trim();
    attrs[key] = resolveValue(args[i].slice(eq + 1).trim(), item, lang);
  }

  // Fixed width/height take precedence for the Directus transform; otherwise fall back to max*.
  const url = getDirectusAssetUrl(source as any, {
    width: toPixels(attrs.width ?? attrs.maxWidth),
    height: toPixels(attrs.height ?? attrs.maxHeight),
  });
  if (!url) return "";

  const alt = attrs.alt != null ? String(attrs.alt) : "";
  const link = attrs.link != null && attrs.link !== "" ? String(attrs.link) : "";

  const styleParts: string[] = [];
  const w = dimensionCss(attrs.width);
  const h = dimensionCss(attrs.height);
  const mw = dimensionCss(attrs.maxWidth);
  const mh = dimensionCss(attrs.maxHeight);
  // Fixed width/height (inline) override the `max-w-full h-auto` class, giving object-fit a box to crop.
  if (w) styleParts.push(`width:${w}`);
  if (h) styleParts.push(`height:${h}`);
  if (mw) styleParts.push(`max-width:${mw}`);
  if (mh) styleParts.push(`max-height:${mh}`);
  if (attrs.objectFit) styleParts.push(`object-fit:${attrs.objectFit}`);
  const styleAttr = styleParts.length ? ` style="${escapeAttr(styleParts.join(";"))}"` : "";

  const img = `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" class="max-w-full h-auto"${styleAttr} />`;
  return link
    ? `<a href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer">${img}</a>`
    : img;
}

const TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;

/** Replace every `{{…}}` token in a string. Scalars inline as text; `image:` tokens become `<img>`. */
function interpolateString(value: string, item: unknown, lang: string): string {
  return value.replace(TOKEN, (_match, raw) => {
    const token = String(raw).trim();
    if (token.startsWith("image:")) {
      return renderImageToken(token.slice("image:".length).trim(), item, lang);
    }
    const resolved = resolvePath(item, token, lang);
    if (resolved === undefined || resolved === null) return "";
    // Non-image objects (other relations) aren't inlined.
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
