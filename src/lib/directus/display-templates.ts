import { readItems } from "@directus/sdk";
import directus from "./directusSDK";
import type { DisplayTemplate, EditorJsContent } from "./types";

/**
 * Fetch a display template's EditorJS body, matched by `collection` + `name`.
 * Shared by the `reference` and `collection` blocks.
 */
export async function fetchDisplayTemplateBody(
  collection: string,
  name: string,
): Promise<EditorJsContent | null> {
  if (!directus || !collection || !name) return null;
  const rows = await directus.request(
    // @ts-expect-error — `display_templates` isn't in the typed SDK schema
    readItems("display_templates", {
      filter: { collection: { _eq: collection }, name: { _eq: name } },
      fields: ["template"],
      limit: 1,
    }),
  );
  return (rows as DisplayTemplate[])[0]?.template ?? null;
}
