export type WithTranslations<T> = {
  translations?: T[] | null;
};

export type TranslationBase = {
  id?: number;
  languages_code?: string;
};

export function pickTranslation<T extends TranslationBase>(
  translations: T[] | null | undefined,
  lang: string,
): T | undefined {
  if (!translations || translations.length === 0) return undefined;
  const match = translations.find((t) => t.languages_code?.startsWith(lang));
  return match ?? translations[0];
}
