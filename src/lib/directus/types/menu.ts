import type { TranslationBase, WithTranslations } from "./translation";

export type MenuItemTranslation = TranslationBase & {
  label?: string | null;
};

export type MenuItem = WithTranslations<MenuItemTranslation> & {
  id: number;
  url: string;
  // Self-referencing parent (id, or expanded object) for the tree/dropdown structure.
  parent?: number | { id?: number } | null;
  // Populated by buildMenuTree — direct children nested under this item.
  children?: MenuItem[];
};

// Junction row of the `menus` ↔ `menus_items` many-to-many (`menus_menus_items`).
export type MenuItemsJunction = {
  id?: number;
  sort?: number | null;
  menus_id?: number;
  menus_items_id?: MenuItem | null;
};

export type Menu = {
  id: number;
  name: string;
  items?: MenuItem[] | null;
};
