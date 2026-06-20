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

// `reference` block — points at an item of `collection`, rendered through a
// `display_templates` row whose `name` matches `template`.
export type ReferenceData = {
  collection?: string;
  template?: string;
  itemId?: number | string;
};

// A row of the `display_templates` collection. `template` holds the EditorJS body
// (with `{{path}}` placeholders); matched by `collection` + `name`.
export type DisplayTemplate = {
  id?: number | string;
  collection?: string;
  name?: string;
  template?: EditorJsContent | null;
};
