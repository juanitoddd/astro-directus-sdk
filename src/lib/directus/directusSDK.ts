import { createDirectus, rest, staticToken } from '@directus/sdk';
import type {
  Block,
  BlockTranslation,
  Grid,
  GridTranslation,
  Hero,
  HeroTranslation,
  Menu,
  MenuItem,
  MenuItemTranslation,
  Page,
  PageSection,
  Slider,
  SliderSlide,
} from './types';

export type Schema = {
  pages: Page[];
  page_sections: PageSection[];
  block: Block[];
  block_translations: BlockTranslation[];
  grid: Grid[];
  grid_translations: GridTranslation[];
  hero: Hero[];
  hero_translations: HeroTranslation[];
  slider: Slider[];
  slider_slides: SliderSlide[];
  menu: Menu[];
  menu_item: MenuItem[];
  menu_item_translations: MenuItemTranslation[];
};

const raw_url = import.meta.env.DIRECTUS_URL || process.env.DIRECTUS_URL || 'http://cms.uponthe.top/';
console.log("raw_url ~~~>", raw_url)
export const directus_url = /^https?:\/\//.test(raw_url) ? raw_url : `http://${raw_url}`;
const directus_token = import.meta.env.DIRECTUS_TOKEN || process.env.DIRECTUS_TOKEN;

const getDirectusSDK = () => {
  try {
    const client = directus_token
      ? createDirectus<Schema>(directus_url).with(staticToken(directus_token)).with(rest())
      : createDirectus<Schema>(directus_url).with(rest());

    return client;
  } catch (error) {
    console.error('Error initializing Directus client:', error);
    return undefined;
  }
};

export default getDirectusSDK();
