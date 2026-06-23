import { readItems } from '@directus/sdk';
import directus from '@/lib/directus/directusSDK';
import type { Menu, MenuItem, MenuItemsJunction } from '@/lib/directus/types';

// `menus` ↔ `menus_items` is a M2M via the `menus_menus_items` junction. The `items` alias on
// `menus` yields junction rows; each row carries `sort` and the related item in `menus_items_id`.
const menuQueryFields = [
  'id',
  'name',
  'items.sort',
  'items.menus_items_id.id',
  'items.menus_items_id.url',
  'items.menus_items_id.parent',
  'items.menus_items_id.translations.id',
  'items.menus_items_id.translations.languages_code',
  'items.menus_items_id.translations.label',
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

type RawMenu = {
  id: number;
  name: string;
  items?: MenuItemsJunction[] | null;
};

/** Parent may come back as a bare id or an expanded object — normalize to an id. */
function parentId(parent: MenuItem["parent"]): number | null {
  if (parent == null) return null;
  if (typeof parent === "object") return parent.id ?? null;
  return parent;
}

/**
 * Turn a flat, already-sorted MenuItem[] into a one-level tree: top-level items (no parent)
 * each carrying their direct `children`. Sibling order is preserved from the input order.
 */
export function buildMenuTree(items: MenuItem[]): MenuItem[] {
  const nodes = items.map((item) => ({ ...item, children: [] as MenuItem[] }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots: MenuItem[] = [];
  for (const node of nodes) {
    const pid = parentId(node.parent);
    const parent = pid != null ? byId.get(pid) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function fetchMenuByName(name: string): Promise<Menu | null> {
  if (!directus) return null;
  const menus = await directus.request(
    readItems('menus', {
      filter: { name: { _eq: name } },
      // @ts-expect-error — nested junction/translation fields not representable in the SDK's generic field type
      fields: menuQueryFields,
      limit: 1,
    }),
  );
  const list = menus as RawMenu[];
  if (!list || list.length === 0) return null;
  const raw = list[0];

  // Top-level items come from the M2M junction (sorted by the junction `sort`).
  const topLevel = (raw.items ?? [])
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((row) => row.menus_items_id)
    .filter((item): item is MenuItem => !!item);

  // Children aren't junctioned to the menu — they live in `menus_items` linked via `parent`.
  // Fetch the direct children of the top-level items in one query.
  const topLevelIds = topLevel.map((item) => item.id);
  let children: MenuItem[] = [];
  if (topLevelIds.length > 0) {
    const childRows = await directus.request(
      readItems('menus_items', {
        filter: { parent: { _in: topLevelIds } },
        // @ts-expect-error — nested translation fields not representable in the SDK's generic field type
        fields: [
          'id',
          'url',
          'parent',
          'translations.id',
          'translations.languages_code',
          'translations.label',
        ],
        limit: -1,
      }),
    );
    children = ((childRows as MenuItem[]) ?? []).sort((a, b) => a.id - b.id);
  }

  // Nest top-level + children into a one-level tree (children attach to parents by id).
  const tree = buildMenuTree([...topLevel, ...children]);

  return { id: raw.id, name: raw.name, items: tree };
}
