// TEMPORARY test route — delete when done.
// Visit: http://localhost:4321/test-events.json?tour=<TOUR_ID>
import type { APIRoute } from "astro";
import { fetchEventsByTour } from "@/lib/directus/events";

export const prerender = false; // run on request so ?tour= works

export const GET: APIRoute = async ({ url }) => {
  const tourId = url.searchParams.get("tour") ?? "";
  const events = await fetchEventsByTour(tourId);
  return new Response(JSON.stringify({ tourId, count: events.length, events }, null, 2), {
    headers: { "content-type": "application/json" },
  });
};
