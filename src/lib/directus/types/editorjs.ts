export type EditorJsAlignmentTune = {
  alignment: string | null;
};

export type EditorJsFlexTune = {
  direction?: string;
  justify?: string;
  align?: string;
};

export type EditorJsBlockTunes = {
  alignment?: EditorJsAlignmentTune;
  flex?: EditorJsFlexTune;
  [key: string]: unknown;
};

export type EditorJsBlock = {
  id?: string;
  type: string;
  data: Record<string, unknown>;
  tunes?: EditorJsBlockTunes;
};

export type EditorJsContent = {
  time?: number;
  version?: string;
  blocks: EditorJsBlock[];
};

// A single cell of a `flexblock` — holds its own nested EditorJS document.
export type FlexBlockItem = {
  id?: string;
  content?: EditorJsContent | null;
};
