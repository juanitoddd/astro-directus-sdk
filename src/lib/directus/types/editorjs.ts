export type EditorJsBlock = {
  id?: string;
  type: string;
  data: Record<string, unknown>;
  tunes?: Record<string, any>;
};

export type EditorJsContent = {
  time?: number;
  version?: string;
  blocks: EditorJsBlock[];
};
