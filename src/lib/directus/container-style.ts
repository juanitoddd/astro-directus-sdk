import type { ContainerConfig } from "./types";

const DEFAULT_GAP = "0.75rem";

/**
 * Build the inline CSS for a layout container shared by the flex/grid blocks and the
 * collection block. The tune values ("row", "space-around", "center"…) are already valid
 * CSS keywords, so they pass straight through.
 *
 * - `flex`  → display:flex with direction/justify/align (align-items from `align`)
 * - `grid`  → display:grid with columns/alignItems
 * - `block` → plain stacked; `gap` honored via a flex column (CSS `gap` needs flex/grid)
 */
export function buildContainerStyle(config: ContainerConfig = {}): string {
  const type = config.type ?? "block";
  const gap = config.gap && config.gap !== "" ? config.gap : null;

  if (type === "flex") {
    return [
      "display:flex",
      "flex-wrap:wrap",
      `gap:${gap ?? DEFAULT_GAP}`,
      `flex-direction:${config.direction ?? "row"}`,
      `justify-content:${config.justify ?? "flex-start"}`,
      `align-items:${config.align ?? "stretch"}`,
    ].join(";");
  }

  if (type === "grid") {
    const template = config.columnTemplate
      ? config.columnTemplate
      : `repeat(${config.columns ?? 2}, minmax(0, 1fr))`;
    return [
      "display:grid",
      `gap:${gap ?? DEFAULT_GAP}`,
      `align-items:${config.alignItems ?? "stretch"}`,
      `grid-template-columns: ${template}`,
    ].join(";");
  }

  // block: plain block flow; only switch to a flex column when a gap is requested.
  return gap ? `display:flex;flex-direction:column;gap:${gap}` : "";
}
