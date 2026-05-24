import { readItems } from '@directus/sdk';
import directus from './directusSDK';
import type { Page } from './types';

const translationsFields = [
  'translations.id',
  'translations.languages_code',
  'translations.content',
] as const;

const gridTranslationsFields = [
  'translations.id',
  'translations.languages_code',
  'translations.content_left',
  'translations.content_right',
] as const;

const sectionsItemFields = {
  block: ['id', ...translationsFields],
  grid: ['id', ...gridTranslationsFields],
  hero: [
    'id',
    'image.id', 'image.filename_disk', 'image.title', 'image.description', 'image.width', 'image.height',
    'background.id', 'background.filename_disk', 'background.title', 'background.description', 'background.width', 'background.height',
    ...translationsFields,
  ],
  slider: [
    'id',
    'fullwidth',
    'slides.id',
    'slides.sort',
    'slides.collection',
    'slides.item:block.id',
    'slides.item:block.translations.id',
    'slides.item:block.translations.languages_code',
    'slides.item:block.translations.content',
    'slides.item:grid.id',
    'slides.item:grid.translations.id',
    'slides.item:grid.translations.languages_code',
    'slides.item:grid.translations.content_left',
    'slides.item:grid.translations.content_right',
    'slides.item:hero.id',
    'slides.item:hero.image.id',
    'slides.item:hero.image.filename_disk',
    'slides.item:hero.image.title',
    'slides.item:hero.image.description',
    'slides.item:hero.image.width',
    'slides.item:hero.image.height',
    'slides.item:hero.background.id',
    'slides.item:hero.background.filename_disk',
    'slides.item:hero.background.title',
    'slides.item:hero.background.description',
    'slides.item:hero.background.width',
    'slides.item:hero.background.height',
    'slides.item:hero.translations.id',
    'slides.item:hero.translations.languages_code',
    'slides.item:hero.translations.content',
  ],
} as const;

const pageQueryFields = [
  'id',
  'slug',
  'sections.id',
  'sections.sort',
  'sections.collection',
  ...sectionsItemFields.block.map((f) => `sections.item:block.${f}`),
  ...sectionsItemFields.grid.map((f) => `sections.item:grid.${f}`),
  ...sectionsItemFields.hero.map((f) => `sections.item:hero.${f}`),
  ...sectionsItemFields.slider.map((f) => `sections.item:slider.${f}`),
];

export async function fetchAllPageSlugs(): Promise<string[]> {
  if (!directus) return [];
  const pages = await directus.request(
    readItems('pages', { fields: ['slug'], limit: -1 }),
  );
  return (pages as Array<{ slug: string }>).map((p) => p.slug).filter(Boolean);
}

export async function fetchPageBySlug(slug: string): Promise<Page | null> {
  if (!directus) return null;
  const pages = await directus.request(
    readItems('pages', {
      filter: { slug: { _eq: slug } },
      // @ts-expect-error — deeply nested M2A field strings aren't representable in the SDK's generic field type
      fields: pageQueryFields,
      limit: 1,
    }),
  );
  const list = pages as Page[];
  if (!list || list.length === 0) return null;
  const page = list[0];
  if (page.sections) {
    page.sections = [...page.sections].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    for (const section of page.sections) {
      if (section.collection === 'slider' && section.item?.slides) {
        section.item.slides = [...section.item.slides].sort(
          (a, b) => (a.sort ?? 0) - (b.sort ?? 0),
        );
      }
    }
  }
  return page;
}
