import { readItem, readItems } from "@directus/sdk";
import directus from "./directusSDK";
import { pickTranslation } from "./types";

export type ArchiveFilters = Record<"tour" | "year" | "author" | "repertoire" | "location", string>;
export type ArchiveResult = {
  id: string | number;
  title: string;
  date: string;
  city: string;
  country: string;
};

const eventFields = ["*", "location_id.*", "location_id.translations.*", "translations.*"];

function intersection(groups: any[][]): any[] {
  if (!groups.length || groups.some((group) => !group.length)) return [];
  const otherIds = groups.slice(1).map((group) => new Set(group.map(({ id }) => id)));
  const seen = new Set<PropertyKey>();
  return groups[0].filter(({ id }) => {
    if (seen.has(id) || !otherIds.every((ids) => ids.has(id))) return false;
    seen.add(id);
    return true;
  });
}

async function eventsByIds(ids: Array<string | number>): Promise<any[]> {
  if (!ids.length) return [];
  return directus!.request(
    // @ts-expect-error -- archive collections are not in the typed SDK schema
    readItems("events", { filter: { id: { _in: ids } }, fields: eventFields, limit: -1 }),
  );
}

export async function searchArchive(filters: ArchiveFilters, lang: string): Promise<ArchiveResult[]> {
  if (!directus) throw new Error("Directus is not configured");
  const groups: any[][] = [];

  if (filters.author) {
    const people: any[] = await directus.request(
      // @ts-expect-error -- archive collections are not in the typed SDK schema
      readItems("people", {
        filter: { _or: [
          { first_name: { _icontains: filters.author } },
          { last_name: { _icontains: filters.author } },
        ] },
        fields: ["id"],
        limit: -1,
      }),
    );
    const personIds = people.map(({ id }) => id);
    const interpreters: any[] = personIds.length ? await directus.request(
      // @ts-expect-error -- archive collections are not in the typed SDK schema
      readItems("interpreters", {
        filter: { _and: [{ person_id: { _in: personIds } }, { role_id: { _eq: 19 } }] },
        fields: ["event_id"],
        limit: -1,
      }),
    ) : [];
    groups.push(await eventsByIds(interpreters.map(({ event_id }) => event_id)));
  }

  if (filters.repertoire) {
    const translations: any[] = await directus.request(
      // @ts-expect-error -- archive collections are not in the typed SDK schema
      readItems("repertoires_translations", {
        // filter: { title_search: { _icontains: filters.repertoire } },
        filter: { title: { _icontains: filters.repertoire } },
        fields: ["repertoires_id"],
        limit: -1,
      }),
    );
    const repertoireIds = translations.map(({ repertoires_id }) => repertoires_id);
    const junctions: any[] = repertoireIds.length ? await directus.request(
      // @ts-expect-error -- archive collections are not in the typed SDK schema
      readItems("events_repertoires", {
        filter: { repertoires_id: { _in: repertoireIds } },
        fields: ["events_id"],
        limit: -1,
      }),
    ) : [];
    const events = await Promise.all(junctions.map(({ events_id }) => directus!.request(
      // @ts-expect-error -- archive collections are not in the typed SDK schema
      readItem("events", events_id, { fields: eventFields }),
    )));
    groups.push(events);
  }

  if (filters.location) {
    const translations: any[] = await directus.request(
      // @ts-expect-error -- archive collections are not in the typed SDK schema
      readItems("locations_translations", {
        filter: { _or: [
          { city: { _icontains: filters.location } },
          { country: { _icontains: filters.location } },
          { name: { _icontains: filters.location } },
        ] },
        fields: ["locations_id"],
        limit: -1,
      }),
    );
    const locationIds = translations.map(({ locations_id }) => locations_id);
    groups.push(locationIds.length ? await directus.request(
      // @ts-expect-error -- archive collections are not in the typed SDK schema
      readItems("events", {
        filter: { location_id: { _in: locationIds } }, fields: eventFields, limit: -1,
      }),
    ) : []);
  }

  if (filters.tour) {
    const tours: any[] = await directus.request(
      // @ts-expect-error -- archive collections are not in the typed SDK schema
      readItems("tours_translations", {
        filter: { title: { _icontains: filters.tour } }, fields: ["tours_id"], limit: -1,
      }),
    );
    // Preserve the relationship used by the original archive implementation.
    groups.push(await eventsByIds(tours.map(({ tours_id }) => tours_id)));
  }

  if (filters.year) {
    const year = Number(filters.year);
    if (!Number.isInteger(year)) return [];
    groups.push(await directus.request(
      // @ts-expect-error -- archive collections are not in the typed SDK schema
      readItems("events", {
        filter: { date: { _gte: `${year}-01-01T00:00:00`, _lt: `${year + 1}-01-01T00:00:00` } },
        fields: eventFields,
        limit: -1,
      }),
    ));
  }

  return intersection(groups)
    .sort((a, b) => new Date(a.date ?? "").getTime() - new Date(b.date ?? "").getTime())
    .map((event) => {
      const eventText = pickTranslation(event.translations, lang);
      const locationText = event.location_id
        ? pickTranslation(event.location_id.translations, lang)
        : null;
      return {
        id: event.id,
        title: eventText?.title ?? "",
        date: event.date ?? "",
        city: locationText?.city ?? "",
        country: locationText?.country ?? "",
      };
    });
}
