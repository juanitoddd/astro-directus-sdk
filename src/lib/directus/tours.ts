import { readItem } from "@directus/sdk";
import directus from "./directusSDK";

// Loose type — adjust once the `tours` fields are known.
export type DirectusTour = {
  id: number | string;
  [key: string]: unknown;
};

/** Fetch a single `tours` item by its primary key. Returns null if missing/unreachable. */
export async function fetchTourById(
  id: number | string,
  lang?: string,
): Promise<DirectusTour | null> {
  if (!directus || id == null || id === "") return null;

  // When a language is given, filter translations to it in the query (`_starts_with` mirrors
  // pickTranslation: app "en" matches code "en-US"). Otherwise all translations are returned.
  const deep = lang
    ? { translations: { _filter: { languages_code: { _starts_with: lang } } } }
    : undefined;

  try {
    const tour = await directus.request(
      // @ts-expect-error — `tours` isn't in the typed SDK schema
      readItem("tours", id, {
        fields: ["*", "translations.*"],
        ...(deep ? { deep } : {}),
      }),
    );
    return (tour as DirectusTour) ?? null;
  } catch {
    // readItem throws on 403/404 — treat a missing tour as null rather than a hard error.
    return null;
  }
}
