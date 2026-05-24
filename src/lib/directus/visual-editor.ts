import { setAttr } from "@directus/visual-editing";

export type DirectusVisualEditingMeta = {
  collection: string;
  item?: number | string | null;
  translationCollection: string;
  translationItem?: number | string | null;
};

export type DirectusVisualEditable = {
  __directus?: DirectusVisualEditingMeta;
};

type EditOptions = {
  translated?: boolean;
  mode?: "modal" | "popover" | "drawer";
};

export function getDirectusEditAttr(
  content: DirectusVisualEditable,
  fields: string | string[],
  options: EditOptions = {},
) {
  const meta = content.__directus;
  if (!meta) return undefined;

  const translated = options.translated ?? true;
  const collection = translated ? meta.translationCollection : meta.collection;
  const item = translated ? meta.translationItem : meta.item;

  if (!item) return undefined;

  return setAttr({
    collection,
    item,
    fields,
    mode: options.mode ?? "popover",
  });
}
