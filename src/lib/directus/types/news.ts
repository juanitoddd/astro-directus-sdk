import type { DirectusAsset } from "@/lib/directus/assets";
import type { EditorJsContent } from "./editorjs";
import type { PageSection } from "./page";
import type { TranslationBase, WithTranslations } from "./translation";

export type NewsTranslation = TranslationBase & {
  preview?: EditorJsContent | null;
};

export type News = WithTranslations<NewsTranslation> & {
  id: number;
  slug: string;
  name?: string | null;
  status?: string | null;
  sort?: number | null;
  image?: DirectusAsset | string | null;
  // M2A sections, identical in shape to a page's sections (block | grid | hero | slider)
  sections?: PageSection[] | null;
};
