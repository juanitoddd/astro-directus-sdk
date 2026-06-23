import { readItems } from '@directus/sdk';
import directus from '@/lib/directus/directusSDK';
import type { Menu } from '@/lib/directus/types';

const menuQueryFields = [
  'id',
  'slug',
  'items.id',
  'items.url',
  'items.sort',
  'items.translations.id',
  'items.translations.languages_code',
  'items.translations.label',
];

/** Resolve a menu item URL into a language-prefixed href. */
export function resolveMenuUrl(url: string | null | undefined, lang: string): string {
  if (!url) return "#";
  // External, protocol-prefixed, or hash-only URLs: leave untouched
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) return url;
  // Absolute path
  if (url.startsWith("/")) {
    if (url === "/") return `/${lang}`;
    if (url === `/${lang}` || url.startsWith(`/${lang}/`)) return url;
    return `/${lang}${url}`;
  }
  // Relative path ("about", "projects/details", etc.) — prepend lang root
  return `/${lang}/${url.replace(/^\.?\//, "")}`;
}

export async function fetchMenuBySlug(slug: string): Promise<Menu | null> {
  if (!directus) return null;
  const menus = await directus.request(
    readItems('menu', {
      filter: { slug: { _eq: slug } },
      // @ts-expect-error — nested translation fields not representable in the SDK's generic field type
      fields: menuQueryFields,
      limit: 1,
    }),
  );
  const list = menus as Menu[];
  if (!list || list.length === 0) return null;
  const menu = list[0];
  if (menu.items) {
    menu.items = [...menu.items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }
  return menu;
}
