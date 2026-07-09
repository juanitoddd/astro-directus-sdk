import { readItem, readItems } from "@directus/sdk";
import directus from "./directusSDK";

// Loose type — adjust once the `people` fields are known.
export type DirectusPerson = {
  id: number | string;
  first_name?: string | null;
  last_name?: string | null;
  translations?: unknown[] | null;
  [key: string]: unknown;
};

/**
 * People ids — used to prebuild the per-artist detail routes. When `modifiedSince` is given,
 * returns only people whose `modified` date is after it (e.g. the last deployment), so a build
 * can skip unchanged bios. Without it, returns every id.
 */
export async function fetchAllPeopleIds(
  modifiedSince?: string | null,
): Promise<Array<number | string>> {
  if (!directus) return [];
  const query: Record<string, unknown> = { fields: ["id", "modified"], limit: 100 };
  if (modifiedSince) query.filter = { modified: { _gt: modifiedSince } };
  console.log("query ~~>", query)
  const rows = await directus.request(
    // @ts-expect-error — `people` isn't in the typed SDK schema
    readItems("people", query),
  );
  return (rows as Array<{ id: number | string }>).map((r) => r.id).filter((id) => id != null);
}

/**
 * Fetch a single `person` by id, fully expanded — own fields, translations, and one level of
 * relations. Returns null if missing/unreachable. Pass `lang` to filter translations.
 */
export async function getPersonById(
  id: number | string | null | undefined,
  lang?: string,
): Promise<DirectusPerson | null> {
  if (!directus || id == null || id === "") return null;

  const translationFilter = { _filter: { languages_code: { _starts_with: lang } } };
  const deep = lang ? { translations: translationFilter } : undefined;

  try {
    const person = await directus.request(
      // @ts-expect-error — `people` (and nested relation fields) aren't in the typed SDK schema
      readItem("people", id, {
        // `*.*` expands own fields + one level of every relation; translations pulled explicitly.
        fields: ["*", "*.*", "translations.*"],
        ...(deep ? { deep } : {}),
      }),
    );
    return (person as DirectusPerson) ?? null;
  } catch {
    // readItem throws on 403/404 — treat a missing person as null rather than a hard error.
    return null;
  }
}

/**
 * Fetch every person that holds a given role. Walks the `interpreters` collection filtered by
 * `role_id`, resolves each row's `person_id` (M2O to `people`), and returns the de-duplicated
 * people (one entry per person, even if they appear in several interpreter rows).
 */
export async function fetchByRole(
  roleId: number | string,
  lang?: string,
): Promise<DirectusPerson[] | string[]> {
  if (!directus || roleId == null || roleId === "") return [];

  // When a language is given, filter the person's translations to it in the query.
  const deep = lang
    ? { person_id: { translations: { _filter: { languages_code: { _starts_with: lang } } } } }
    : undefined;

  const rows = await directus.request(
    // @ts-expect-error — `interpreters` isn't in the typed SDK schema
    readItems("interpreters", {
      filter: { role_id: { _eq: roleId } },
      fields: [
        "id",
        "person_id.id",
        "person_id.first_name",
        "person_id.last_name",
        "person_id.translations.*",
      ],
      ...(deep ? { deep } : {}),
      limit: -1,
    }),
  );

  // Extract each row's related person, de-duplicated by person id.
  const seen = new Set<string>();
  const people: DirectusPerson[] = [];
  const ids: string[] = [];
  for (const row of (rows as any[]) ?? []) {
    const person = row?.person_id as DirectusPerson | undefined;
    if (!person) continue;
    const key = String(person.id ?? "");
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    people.push(person);
    ids.push(key);  
  }
  // return people;
  return ids;
}
