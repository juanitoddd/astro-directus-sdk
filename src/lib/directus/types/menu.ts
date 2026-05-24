import type { TranslationBase, WithTranslations } from "./translation";

export type MenuItemTranslation = TranslationBase & {
  label?: string | null;
};

export type MenuItem = WithTranslations<MenuItemTranslation> & {
  id: number;
  url: string;
  sort?: number | null;
};

export type Menu = {
  id: number;
  slug: string;
  items?: MenuItem[] | null;
};
