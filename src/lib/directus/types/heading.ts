import type { TranslationBase, WithTranslations } from "./translation";

export type HeadingTranslation = TranslationBase & {
  // WYSIWYG (TinyMCE) output — raw HTML string, not Editor.js JSON
  content?: string | null;
};

export type Heading = WithTranslations<HeadingTranslation> & {
  id: number;
};
