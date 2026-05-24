import type { EditorJsContent } from "./editorjs";
import type { TranslationBase, WithTranslations } from "./translation";

export type GridTranslation = TranslationBase & {
  content_left?: EditorJsContent | null;
  content_right?: EditorJsContent | null;
};

export type Grid = WithTranslations<GridTranslation> & {
  id: number;
};
