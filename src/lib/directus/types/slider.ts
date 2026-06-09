import type { Block } from "./block";
import type { Grid } from "./grid";
import type { Hero } from "./hero";
import type { News } from "./news";

export type SlideCollection = "block" | "grid" | "hero" | "news";

export type SlideItem =
  | { collection: "block"; item: Block }
  | { collection: "grid"; item: Grid }
  | { collection: "hero"; item: Hero }
  | { collection: "news"; item: News };

export type SliderSlide = SlideItem & {
  id: number;
  sort: number | null;
};

export type Slider = {
  id: number;
  fullwidth?: boolean | null;
  autoplay?: boolean | null;
  slides?: SliderSlide[] | null;
};
