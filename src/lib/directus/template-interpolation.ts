import { getDirectusAssetUrl, toPixelParam } from "./assets";
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

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dimensionCss(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "number" ? `${value}px` : String(value);
}

// ---------------------------------------------------------------------------
// Image reference block — replaces the old `{{image:…}}` token. The block's `data` carries:
//   - static:       width, height, maxWidth, maxHeight, objectFit  (used verbatim)
//   - interpolated: source, alt, link  (quoted = literal, unquoted = field reference — the
//                   same convention as the old token attributes)
// The block is rendered to an <img> and swapped for an `htmlblock`, so BlockRenderer renders it.
// ---------------------------------------------------------------------------

// The block `type` string(s) as emitted by the editor. Adjust to match your image-reference tool.
const IMAGE_REFERENCE_TYPES = new Set(["imageReference", "imagereference"]);

function isImageReferenceBlock(node: any): boolean {
  return (
    !!node && typeof node === "object" &&
    typeof node.type === "string" && IMAGE_REFERENCE_TYPES.has(node.type) &&
    !!node.data && typeof node.data === "object"
  );
}

// Alignment tune → text-align class (the wrapper div positions the inline image).
const ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

const MOBILE_BREAKPOINT = 640;

/** Build the `<img>` (linked + alignment-wrapped) HTML for an image reference block's `data`.
 *  Uses the same dimension fields + CSS vars as BlockRenderer's image case (`.editorjs-image`). */
function renderImageBlock(
  data: Record<string, unknown>,
  item: unknown,
  lang: string,
  alignment?: string | null,
): string {
  // Interpolated fields — support inline `{{token}}` interpolation (incl. `{{translations.*}}`).
  const source = interpolateString(String(data.url ?? data.source ?? ""), item, lang).trim();  
  if (!source) return "";
  const alt = interpolateString(String(data.alt ?? ""), item, lang);
  const link = interpolateString(String(data.link ?? ""), item, lang).trim();

  // Same static dimension fields as BlockRenderer's image case.
  const {
    widthDesktop, heightDesktop, widthMobile, heightMobile,
    maxWidth, maxHeight, maxWidthMobile, maxHeightMobile, objectFit,
  } = data as Record<string, string | number | null | undefined>;  
  // Transform params — absolute px only; mobile %/vw resolved against the breakpoint.
  const widthPx = [
    toPixelParam(widthDesktop),
    toPixelParam(maxWidth),
    toPixelParam(widthMobile, MOBILE_BREAKPOINT),
    toPixelParam(maxWidthMobile, MOBILE_BREAKPOINT),
  ].filter((v): v is number => v != null);
  const heightPx = [toPixelParam(heightDesktop)].filter((v): v is number => v != null);
  const transforms: { width?: number; height?: number } = {};
  if (widthPx.length) transforms.width = Math.max(...widthPx);
  if (heightPx.length) transforms.height = Math.max(...heightPx);  
    
  const url = getDirectusAssetUrl(source as any, transforms);  
  if (!url) return "";  

  // CSS vars consumed by `.editorjs-image` (same as BlockRenderer).
  const imgAttrs: Array<[string, string | null]> = [];
  const hasHeight = heightDesktop || maxHeight || heightMobile || maxHeightMobile;
  imgAttrs.push(["--dw", hasHeight ? "auto" : "100%"]);
  if (widthDesktop) imgAttrs.push(["--iw", dimensionCss(widthDesktop)]);
  if (heightDesktop) imgAttrs.push(["--ih", dimensionCss(heightDesktop)]);
  if (maxWidth) imgAttrs.push(["--imw", dimensionCss(maxWidth)]);
  if (maxHeight) imgAttrs.push(["--imh", dimensionCss(maxHeight)]);
  if (widthMobile) imgAttrs.push(["--iw-m", dimensionCss(widthMobile)]);
  if (heightMobile) imgAttrs.push(["--ih-m", dimensionCss(heightMobile)]);
  if (maxWidthMobile) imgAttrs.push(["--imw-m", dimensionCss(maxWidthMobile)]);
  if (maxHeightMobile) imgAttrs.push(["--imh-m", dimensionCss(maxHeightMobile)]);
  if (objectFit) imgAttrs.push(["--of", String(objectFit)]);

  const imgStyle = imgAttrs.filter(([, v]) => v).map(([p, v]) => `${p}:${v}`).join(";");
  const styleAttr = imgStyle ? ` style="${escapeAttr(imgStyle)}"` : "";

  const img = `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" class="editorjs-image max-w-full h-auto inline-block"${styleAttr} />`;    
  const content = link
    ? `<a href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer">${img}</a>`
    : img;

  // Wrap in a div so the alignment tune (text-align) positions the image.
  const contClasses = ['relative']
  const alignClass = alignment ? ALIGN_CLASS[alignment] ?? "" : "";
  if(alignClass) contClasses.push(alignClass)    
  //const clsAttr = alignClass ? ` class="${alignClass}"` : "";
  const credits = item.image.image_credits ? `<span class="absolute font-thin bottom-0 left-0 overflow-hidden bg-black p-1 text-xs text-gray-100">${item.image.image_credits}</span>` : ''
  return `<div class="${contClasses.join(' ')}">${content}${credits}</div>`;
}

const TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;

/** Replace every `{{path}}` token in a string with the resolved scalar value (missing → ""). */
function interpolateString(value: string, item: unknown, lang: string): string {
  return value.replace(TOKEN, (_match, raw) => {
    const resolved = resolvePath(item, String(raw).trim(), lang);
    if (resolved === undefined || resolved === null) return "";
    if (typeof resolved === "object") return ""; // relations/objects aren't inlined
    return String(resolved);
  });
}

/** Deep-walk any value, interpolating strings and expanding image reference blocks. */
function deepInterpolate(node: unknown, item: unknown, lang: string): unknown {   
  if (typeof node === "string") return interpolateString(node, item, lang);
  if (Array.isArray(node)) return node.map((n) => deepInterpolate(n, item, lang));
  if (node && typeof node === "object") {
    // Image reference block → render to <img> and swap for an htmlblock (tunes preserved).
    if (isImageReferenceBlock(node)) {      
      // console.log("item", item);
      const alignment = (node as any).tunes?.alignment?.alignment ?? null;
      // console.log("tag", renderImageBlock((node as any).data ?? {}, item, lang, alignment));
      return {
        ...(node as Record<string, unknown>),
        type: "htmlblock",
        data: { html: renderImageBlock((node as any).data ?? {}, item, lang, alignment) },
      };
    }
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(node)) out[key] = deepInterpolate(val, item, lang);
    return out;
  }
  return node;
}

/**
 * Fill a display-template's EditorJS body with values from `item`, using the
 * current `lang` for any `{{translations.*}}` placeholders and image reference blocks.
 */
export function interpolateTemplate(
  template: EditorJsContent,
  item: unknown,
  lang: string,
): EditorJsContent {
  return deepInterpolate(template, item, lang) as EditorJsContent;
}
