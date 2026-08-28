import { readItem, readItems } from "@directus/sdk";
import directus from "./directusSDK";
import { pickTranslation } from './types';

// Loose type — adjust once the `tours` fields are known.
export type DirectusTour = {
  id: number | string;
  [key: string]: unknown;
};

/** Fetch a single `tours` item by its primary key. Returns null if missing/unreachable. */
export async function fetchTourById(
  id: number | string | null | undefined,
  lang?: string,
): Promise<DirectusTour | null> {
  if (!directus || id == null || id === "") return null;

  // When a language is given, filter translations to it in the query (`_starts_with` mirrors
  // pickTranslation: app "en" matches code "en-US"). Otherwise all translations are returned.
  const deep = lang
    ? { 
      translations: { _filter: { languages_code: { _starts_with: lang } } }, 
      people: {_limit: -1, _sort: ["person_id.last_name"], } }
    : undefined;

  try {
    const tour = await directus.request(
      // @ts-expect-error — `tours` isn't in the typed SDK schema
      readItem("tours", id, {
        fields: [
          "*",
          "translations.*",          
          "people.role_id.id",
          "people.role_id.name",
          "people.role_id.sort",
          "people.role_id.translations.*",
          "people.is_master",
          "people.person_id.id",
          "people.person_id.first_name",
          "people.person_id.last_name",
          "people.person_id.image",
          "artists.people_id.*",
          "tutors.people_id.*"
        ],
        ...(deep ? { deep } : {}),
      }),
    );        

    return (tour as DirectusTour) ?? null;
  } catch {
    // readItem throws on 403/404 — treat a missing tour as null rather than a hard error.
    return null;
  }
}

function compare( a:any, b:any ) {
  if ( a.sort < b.sort) return -1;  
  if ( a.sort > b.sort ) return 1;  
  return 0;
}

function compareSimple( a:number, b:number ) {
  if ( a < b) return -1;  
  if ( a > b ) return 1;  
  return 0;
}

export function aggregateByRole (people: any[], lang: string | undefined): Record<string, any[]> {  
  const result: Record<string, any[]> = {};
  const roles: Record<string, any[]> = {};
  // const order: Record<string, number> = {};
  const order: any[] = [];
  const masters: Record<string, any> = {}
  for(const person of people) {
    const roleName = pickTranslation(person.role_id.translations, lang ?? 'en-US')
    const name = roleName?.name ?? person.role_id.name
    if(!roles[name]) roles[name] = [];
    if(person.is_master) {
      masters[name] = person.person_id;
    } else {
      roles[name].push(person.person_id)
    }
    if(!order.find((item) => item.name === name)) order.push({name, sort: person.role_id.sort});
  }  
  
  // Re-order with concert master
  order.sort( compare );  
  for(const role of Object.keys(roles)) if(masters[role]) roles[role].unshift(masters[role]); 
  for(const item of order) result[item.name] = roles[item.name];      

  return result;  
}

/**
 * Fetch the ids of all `tours` whose `date` falls within the given calendar year,
 * ordered by date.
 */
export async function fetchToursByYear(
  year: number | string,
): Promise<Array<number | string>> {
  const y = Number(year);
  if (!directus || !Number.isFinite(y)) return [];  
  const tours = await directus.request(
    // @ts-expect-error — `tours` isn't in the typed SDK schema
    readItems("tours", {
      // Tours that BEGIN within the year: date_begin in [YYYY-01-01, (YYYY+1)-01-01).
      filter: { year: { _eq: `${y}` } },
      fields: ["id"],
      sort: ["year"],
      limit: -1,
    }),
  );  
  return (tours as Array<{ id: number | string }>)
    .map((t) => t.id)
    .filter((id) => id != null);
}

/** Distinct years that have at least one tour, ascending. */
export async function fetchTourYears(): Promise<number[]> {
  if (!directus) return [];
  const rows = await directus.request(
    // @ts-expect-error — `tours` isn't in the typed SDK schema
    readItems("tours", { fields: ["year"], sort: ["year"], limit: -1 }),
  );
  const years = new Set<number>();
  for (const r of rows as Array<{ year?: number | string }>) {
    const y = Number(r.year);
    if (Number.isFinite(y)) years.add(y);
  }
  return [...years].sort((a, b) => a - b).filter((y) => y < 2026);
}

export async function fetchAllTourYears(): Promise<number[]> {
  if (!directus) return [];
  const rows = await directus.request(
    // @ts-expect-error — `tours` isn't in the typed SDK schema
    readItems("tours", { fields: ["year"], sort: ["year"], limit: -1 }),
  );
  const years = new Set<number>();
  for (const r of rows as Array<{ year?: number | string }>) {
    const y = Number(r.year);
    if (Number.isFinite(y)) years.add(y);
  }
  return [...years].sort((a, b) => a - b);
}
