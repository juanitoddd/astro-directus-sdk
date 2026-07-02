import { readItems } from '@directus/sdk';
import directus from './directusSDK';
import { sectionsItemFields } from './page';
import type { News } from './types';

const newsQueryFields = [
  'id',
  'slug',
  'name',
  'status',
  'sort',
  'image.id', 'image.filename_disk', 'image.title', 'image.description', 'image.width', 'image.height',
  // news-level translations carry the `preview` block-editor content
  'translations.id',
  'translations.languages_code',
  'translations.preview',
  // M2A sections, same shape as a page's sections
  'sections.id',
  'sections.sort',
  'sections.collection',
  ...sectionsItemFields.block.map((f) => `sections.item:block.${f}`),  
  ...sectionsItemFields.hero.map((f) => `sections.item:hero.${f}`),
  ...sectionsItemFields.slider.map((f) => `sections.item:slider.${f}`),
];

// Lightweight fields for the news index — title (`name`), image, and translated `preview`.
const newsListFields = [
  'id',
  'slug',
  'name',
  'status',
  'sort',
  'image.id', 'image.filename_disk', 'image.title', 'image.description', 'image.width', 'image.height',
  'translations.id',
  'translations.languages_code',
  'translations.preview',
];

/** Fetch all news for the listing page (no sections). Pass `lang` to filter translations. */
export async function fetchAllNews(lang?: string): Promise<News[]> {
  if (!directus) return [];
  const deep = lang
    ? { translations: { _filter: { languages_code: { _starts_with: lang } } } }
    : undefined;
  const items = await directus.request(
    readItems('news', {
      // @ts-expect-error — nested translation fields aren't representable in the SDK's generic field type
      fields: newsListFields,
      sort: ['sort'],
      ...(deep ? { deep } : {}),
      limit: -1,
    }),
  );
  return (items as News[]) ?? [];
}

export async function fetchAllNewsSlugs(): Promise<string[]> {
  if (!directus) return [];
  const items = await directus.request(
    readItems('news', { fields: ['slug'], limit: -1 }),
  );
  return (items as Array<{ slug: string }>).map((n) => n.slug).filter(Boolean);
}

export async function fetchNewsBySlug(slug: string): Promise<News | null> {
  if (!directus) return null;
  const items = await directus.request(
    readItems('news', {
      filter: { slug: { _eq: slug } },
      // @ts-expect-error — deeply nested M2A field strings aren't representable in the SDK's generic field type
      fields: newsQueryFields,
      limit: 1,
    }),
  );
  const list = items as News[];
  if (!list || list.length === 0) return null;
  const news = list[0];
  if (news.sections) {
    news.sections = [...news.sections].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    for (const section of news.sections) {
      if (section.collection === 'slider' && section.item?.slides) {
        section.item.slides = [...section.item.slides].sort(
          (a, b) => (a.sort ?? 0) - (b.sort ?? 0),
        );
      }
    }
  }
  return news;
}
