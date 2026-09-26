import type { APIRoute } from "astro";
import { languagePrefixes } from "@/constants/languages";
import { fetchAllPageSlugs } from "@/lib/directus/page";
import { fetchAllNewsSlugs } from "@/lib/directus/news";
import { fetchAllPeopleIds } from "@/lib/directus/person";
import { fetchAllEventIds } from "@/lib/directus/events";

export const prerender = true;

const SITE = "https://gmjo.at";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

export const GET: APIRoute = async () => {
  const [pageSlugs, newsSlugs, peopleIds, eventIds] = await Promise.all([
    fetchAllPageSlugs(),
    fetchAllNewsSlugs(),
    fetchAllPeopleIds(),
    fetchAllEventIds(),
  ]);

  const paths = languagePrefixes.flatMap((lang) => [
    `/${lang}`,
    `/${lang}/news`,
    `/${lang}/archive`,
    ...pageSlugs
      .filter((slug) => !["home", "news", "archive"].includes(slug))
      .map((slug) => `/${lang}/${slug}`),
    ...newsSlugs.map((slug) => `/${lang}/news/${slug}`),
    ...peopleIds.map((id) => `/${lang}/biography/${id}`),
    ...eventIds.map((id) => `/${lang}/events/${id}`),
  ]);

  const urls = [...new Set(paths)]
    .map((path) => `  <url><loc>${escapeXml(new URL(path, SITE).href)}</loc></url>`)
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    },
  );
};
