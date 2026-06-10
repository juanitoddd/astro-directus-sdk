import type { Block } from "./block";
import type { Grid } from "./grid";
import type { Hero } from "./hero";
import type { Slider } from "./slider";

export type SectionCollection = "block" | "grid" | "hero" | "slider";

export type PageSectionItem =
  | { collection: "block"; item: Block }
  | { collection: "grid"; item: Grid }
  | { collection: "hero"; item: Hero }
  | { collection: "slider"; item: Slider };

export type PageSection = PageSectionItem & {
  id: number;
  sort: number | null;
};

export type Page = {
  id: number;
  slug: string;
  sections?: PageSection[] | null;
};
