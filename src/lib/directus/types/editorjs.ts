export type EditorJsAlignmentTune = {
  alignment: string | null;
};

export type EditorJsFlexTune = {
  direction?: string;
  justify?: string;
  align?: string;
  gap?: string;
};

export type EditorJsGridTune = {  
  alignItems?: string;
  gap?: string;
};

export type EditorJsSpacingSides = {
  top?: number | string | null;
  right?: number | string | null;
  bottom?: number | string | null;
  left?: number | string | null;
};

export type EditorJsSpacingTune = {
  padding?: EditorJsSpacingSides;
  margin?: EditorJsSpacingSides;
};

export type EditorJsBlockTunes = {
  alignment?: EditorJsAlignmentTune;
  flex?: EditorJsFlexTune;
  grid?: EditorJsGridTune;
  spacing?: EditorJsSpacingTune;
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
  grow?: boolean | null;
  content?: EditorJsContent | null;
};

export type GridBlockItem = {
  id?: string;  
  content?: EditorJsContent | null;
};
