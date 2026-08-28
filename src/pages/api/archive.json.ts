import type { APIRoute } from "astro";
import { languagePrefixes } from "@/constants/languages";
import { searchArchive, type ArchiveFilters } from "@/lib/directus/archive";

export const prerender = false;

const names = ["tour", "year", "author", "repertoire", "location"] as const;

export const GET: APIRoute = async ({ url }) => {
  const lang = url.searchParams.get("lang")?.trim() || "en";
  if (!languagePrefixes.includes(lang)) {
    return Response.json({ error: "Unsupported language" }, { status: 400 });
  }

  const filters = Object.fromEntries(names.map((name) => [
    name,
    url.searchParams.get(name)?.trim() ?? "",
  ])) as ArchiveFilters;
  if (Object.values(filters).some((value) => value.length > 100)) {
    return Response.json({ error: "A search filter is too long" }, { status: 400 });
  }
  if (!Object.values(filters).some(Boolean)) return Response.json({ results: [] });

  try {
    const results = await searchArchive(filters, lang);
    return Response.json({ results }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("[archive API] search failed", error);
    return Response.json({ error: "The archive could not be searched" }, { status: 500 });
  }
};
