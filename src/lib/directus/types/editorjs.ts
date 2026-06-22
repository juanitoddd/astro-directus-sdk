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

export type EditorJsStyleTune = {
  background?: string | null;
  border?: string | null;
  borderRadius?: number | string | null;
};

export type EditorJsBlockTunes = {
  alignment?: EditorJsAlignmentTune;
  flex?: EditorJsFlexTune;
  grid?: EditorJsGridTune;
  spacing?: EditorJsSpacingTune;
  style?: EditorJsStyleTune;
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

// `collection` block — like `reference` but renders many items through a display template,
// laid out by a container (block / flex / grid).
export type CollectionFilter = {
  field: string;
  operator: string; // e.g. "eq", "gt", "contains" (mapped to Directus "_eq", "_gt", …)
  value: unknown;
};

export type CollectionSort = {
  field: string;
  desc?: boolean;
};

export type ContainerConfig = {
  type?: "block" | "flex" | "grid";
  direction?: string;
  justify?: string;
  align?: string; // flex align-items
  alignItems?: string; // grid align-items
  columns?: number | string;
  columnTemplate?: string;
  gap?: string;
};

export type CollectionData = {
  collection?: string;
  template?: string;
  limit?: number;
  sort?: CollectionSort | null;
  filters?: CollectionFilter[];
  container?: ContainerConfig;
};
