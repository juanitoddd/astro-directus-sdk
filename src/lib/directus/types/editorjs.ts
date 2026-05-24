export type EditorJsBlock = {
  id?: string;
  type: string;
  data: Record<string, unknown>;
};

export type EditorJsContent = {
  time?: number;
  version?: string;
  blocks: EditorJsBlock[];
};
