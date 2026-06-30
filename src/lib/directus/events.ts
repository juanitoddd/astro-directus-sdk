import { readItems } from "@directus/sdk";
import directus from "./directusSDK";

// Loose type — adjust once the `events` fields are known.
export type DirectusEvent = {
  id: number | string;
  [key: string]: unknown;
};

export type Interpreter = {
  interpret_id?: number | string;
  id?: number | string;
  [key: string]: unknown;
};

/**
 * Flatten every event's `interpreters` into a single de-duplicated list, so a person
 * appearing across multiple events is included only once.
 *
 * Dedupes by the person id (`person_id.id`). Pass `keyOf` to dedupe by something else —
 * e.g. `(i) => i.interpret_id` for one entry per interpreter row.
 */
export function aggregateInterpreters(
  events: DirectusEvent[],
  keyOf: (interpreter: any) => unknown = (i) => i?.person_id?.id,
): Interpreter[] {
  const seen = new Set<string>();
  const result: Interpreter[] = [];
  for (const event of events ?? []) {
    for (const interpreter of (event?.interpreters as Interpreter[]) ?? []) {
      const key = keyOf(interpreter);
      if (key != null && key !== "") {
        const k = String(key);
        if (seen.has(k)) continue;
        seen.add(k);
      }
      result.push(interpreter);
    }
  }
  return result;
}

/**
 * Fetch all `events` belonging to a given tour. `events` has a M2O to `tours`, so we filter
 * the FK field (`tour`) by the tour id.
 */
export async function fetchEventsByTour(
  tourId: number | string,
  lang?: string,
): Promise<DirectusEvent[]> {
  if (!directus || tourId == null || tourId === "") return [];

  // When a language is given, filter the nested translations to that language in the query via
  // Directus `deep`. `_starts_with` mirrors pickTranslation (app "en" matches code "en-US").
  const translationFilter = { _filter: { languages_code: { _starts_with: lang } } };
  const deep = lang
    ? {
        interpreters: {
          person_id: { translations: translationFilter },
          role_id: { translations: translationFilter },
        },
      }
    : undefined;

  const events = await directus.request(
    // @ts-expect-error — `events` (and nested relation fields) aren't in the typed SDK schema
    readItems("events", {
      filter: { tour_id: { _eq: tourId } },
      // Expand each interpreter row's `person_id` (People) and `role_id` (roles) M2O relations
      // inline, with their translations so the component can render by language.
      fields: [
        "*",
        "interpreters.*",
        "interpreters.person_id.id",
        "interpreters.person_id.first_name",
        "interpreters.person_id.last_name",
        "interpreters.person_id.translations.*",
        "interpreters.role_id.id",
        "interpreters.role_id.translations.*",
      ],
      ...(deep ? { deep } : {}),
      limit: -1,
    }),
  );
  return (events as DirectusEvent[]) ?? [];
}
