import type { ContainerConfig } from "./types";

const DEFAULT_GAP = "0.75rem";

export type ContainerStyle = {
  className: string;
  style: string;
};

const responsiveClass = (columns: number) : string => {
  switch (columns) {
    case 1:
    case 2:
    case 3:
      return `block md:grid grid-cols-${columns}`;
    case 4:
      return `grid md:grid-cols-${columns} grid-cols-2`;      
    default:
      return `block md:grid grid-cols-${columns}`;
  }
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
    const template = config.columnTemplate
      ? config.columnTemplate
      : `repeat(${config.columns ?? 2}, minmax(0, 1fr))`;
    return {
      // className: responsiveClass(Number.parseInt(`${config.columns ?? 2}`)),
      className: 'md:grid',
      style: [
        `gap:${gap ?? DEFAULT_GAP}`,
        `align-items:${config.alignItems ?? "stretch"}`,
        `grid-template-columns: ${template}`,
      ].join(";"),
    };
  }

  // block: plain block flow; only switch to a flex column when a gap is requested.
  return {
    className: "",
    style: gap ? `display:flex;flex-direction:column;gap:${gap}` : "",
  };
}
