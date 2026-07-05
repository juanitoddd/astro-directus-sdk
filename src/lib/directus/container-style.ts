import type { ContainerConfig } from "./types";

const DEFAULT_GAP = "0.75rem";

export type ContainerStyle = {
  className: string;
  style: string;
};

/**
 * Build the class + inline CSS for a layout container shared by the flex/grid blocks and the
 * collection block.
 *
 * `display` is expressed as a Tailwind class (`md:flex` / `md:grid`) rather than inline, so the
 * container is `display:block` (stacked) on mobile and only becomes flex/grid from the `md`
 * breakpoint up. The remaining declarations stay inline — they're inert while `display:block`
 * and activate automatically once the class flips at `md`. The tune values ("row", "center"…)
 * are valid CSS keywords, so they pass straight through.
 *
 * NOTE: `gap` only applies once `display` is flex/grid, so on mobile (block) stacked items sit
 * flush; spacing there is left to the items / spacing tune.
 */
export function buildContainerStyle(config: ContainerConfig = {}): ContainerStyle {
  const type = config.type ?? "block";
  const gap = config.gap && config.gap !== "" ? config.gap : null;

  if (type === "flex") {
    return {
      className: "md:flex flex-wrap",
      style: [
        `gap:${gap ?? DEFAULT_GAP}`,
        `flex-direction:${config.direction ?? "row"}`,
        `justify-content:${config.justify ?? "flex-start"}`,
        `align-items:${config.align ?? "stretch"}`,
      ].join(";"),
    };
  }

  if (type === "grid") {
    const gapDecl = `gap:${gap ?? DEFAULT_GAP}`;
    const alignDecl = `align-items:${config.alignItems ?? "stretch"}`;

    // A custom template string can't be "halved" — emit it inline as before (grid from md up).
    if (config.columnTemplate) {
      return {
        className: "md:grid",
        style: [gapDecl, alignDecl, `grid-template-columns: ${config.columnTemplate}`].join(";"),
      };
    }

    // Column count → responsive grid via CSS vars. `.editorjs-grid` (global.css) reads them:
    // stacked < 640px, halved 640–767px (--grid-cols-r), full ≥768px (--grid-cols).
    const cols = Number(config.columns ?? 2) || 2;
    const colsResponsive = Math.max(1, Math.ceil(cols / 2));
    return {
      className: "editorjs-grid",
      style: [
        `--grid-cols:${cols}`,
        `--grid-cols-r:${colsResponsive}`,
        gapDecl,
        alignDecl,
      ].join(";"),
    };
  }

  // block: plain block flow; only switch to a flex column when a gap is requested.
  return {
    className: "",
    style: gap ? `display:flex;flex-direction:column;gap:${gap}` : "",
  };
}
