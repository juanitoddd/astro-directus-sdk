// TEMPORARY test route — delete when done.
// Visit: http://localhost:4322/test-events.json?role=<ROLE_ID>
import type { APIRoute } from "astro";
import { fetchEventsByTour } from "@/lib/directus/events";
import { fetchByRole } from '@/lib/directus/person';

export const prerender = false; // run on request so ?role=1

export const GET: APIRoute = async ({ url }) => {
  const roleId = url.searchParams.get("role") ?? "";
  const query = await fetchByRole(roleId);
  return new Response(JSON.stringify({ roleId, count: query.length, query }, null, 2), {
    headers: { "content-type": "application/json" },
  });
};
