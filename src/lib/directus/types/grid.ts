import type { EditorJsContent } from "./editorjs";
import type { TranslationBase, WithTranslations } from "./translation";

export type GridTranslation = TranslationBase & {
  content?: EditorJsContent | null;
};

export type Grid = WithTranslations<GridTranslation> & {
  id: number;
};
