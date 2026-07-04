import { readSingleton } from "@directus/sdk";
import directus from "./directusSDK";

// Loose type — adjust once the `globals` fields are known.
export type DirectusGlobals = {
  id?: number | string;
  translations?: unknown[] | null;
  [key: string]: unknown;
};

/**
 * Fetch the `globals` singleton (one record). Expands its translations; pass `lang` to filter
 * them to that language. Returns null if unreachable.
 */
export async function fetchGlobals(lang?: string): Promise<DirectusGlobals | null> {
  if (!directus) return null;

  const deep = lang
    ? { translations: { _filter: { languages_code: { _starts_with: lang } } } }
    : undefined;

  try {
    const globals = await directus.request(
      // @ts-expect-error — `globals` isn't in the typed SDK schema
      readSingleton("globals", {
        fields: [
          "*",
          "tutors.*",
          "tutors.people_id.*",
          "tutors.people_id.translations.*",
          //"translations.*"
        ],
        ...(deep ? { deep } : {}),
      }),
    );
    return (globals as DirectusGlobals) ?? null;
  } catch {
    return null;
  }
}
