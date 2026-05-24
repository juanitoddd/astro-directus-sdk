import type { Block } from "./block";
import type { Grid } from "./grid";
import type { Hero } from "./hero";

export type SlideCollection = "block" | "grid" | "hero";

export type SlideItem =
  | { collection: "block"; item: Block }
  | { collection: "grid"; item: Grid }
  | { collection: "hero"; item: Hero };

export type SliderSlide = SlideItem & {
  id: number;
  sort: number | null;
};

export type Slider = {
  id: number;
  fullwidth?: boolean | null;
  slides?: SliderSlide[] | null;
};
