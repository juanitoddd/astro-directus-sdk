import type { EditorJsContent } from "./editorjs";
import type { TranslationBase, WithTranslations } from "./translation";

export type BlockTranslation = TranslationBase & {
  content?: EditorJsContent | null;
};

export type Block = WithTranslations<BlockTranslation> & {
  id: number;
};
