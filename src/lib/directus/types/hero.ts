import type { DirectusAsset } from "@/lib/directus/assets";
import type { EditorJsContent } from "./editorjs";
import type { TranslationBase, WithTranslations } from "./translation";

export type HeroTranslation = TranslationBase & {
  content?: EditorJsContent | null;
};

export type Hero = WithTranslations<HeroTranslation> & {
  id: number;
  image?: DirectusAsset | string | null;
  background?: DirectusAsset | string | null;
};
