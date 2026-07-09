import { readItems } from "@directus/sdk";
import directus from "./directusSDK";

/** Return the most recent `date_created` in the `deployments` collection, or null if none. */
export async function fetchLastDate(): Promise<string | null> {
  if (!directus) return null;
  const rows = await directus.request(
    // @ts-expect-error — `deployments` isn't in the typed SDK schema
    readItems("deployments", {
      fields: ["date_created"],
      sort: ["-date_created"], // newest first
      limit: 1,
    }),
  );
  return (rows as Array<{ date_created?: string | null }>)[0]?.date_created ?? null;
}
