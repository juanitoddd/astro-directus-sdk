import { createDirectus, rest, staticToken } from '@directus/sdk';
import type {
  Block,
  BlockTranslation,
  Hero,
  HeroTranslation,
  Menu,
  MenuItem,
  MenuItemsJunction,
  MenuItemTranslation,
  News,
  NewsTranslation,
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
  hero: Hero[];
  hero_translations: HeroTranslation[];
  slider: Slider[];
  slider_slides: SliderSlide[];
  news: News[];
  news_translations: NewsTranslation[];
  menus: Menu[];
  menus_items: MenuItem[];
  menus_menus_items: MenuItemsJunction[];
  menus_items_translations: MenuItemTranslation[];
};

const raw_url = import.meta.env.DIRECTUS_URL || process.env.DIRECTUS_URL || 'http://cms.uponthe.top/';
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
