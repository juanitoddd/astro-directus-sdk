import { readItems } from "@directus/sdk";
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
