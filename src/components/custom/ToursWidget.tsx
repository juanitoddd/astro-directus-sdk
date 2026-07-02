import { useEffect, useState, type ReactNode } from "react";

// Client-side Tours widget: fetches the selected year's tours directly from the PUBLIC Directus
// REST API (no token — collections must be publicly readable) and re-fetches when the year
// changes. Used as an Astro island because static production has no server to render on demand.

type Translation = { languages_code?: string; [key: string]: unknown };
type TourEvent = {
  id: number | string;
  date?: string;
  title?: string;
  location_id?: { translations?: Translation[] } | null;
};
type Tour = {
  id: number | string;
  date_begin?: string;
  translations?: Translation[];
  events?: TourEvent[];
};

type Props = {
  lang?: string;
  years?: number[];
  initialYear?: number;
  directusUrl: string;
};

/** Mirror of the server pickTranslation: match by language prefix, else first. */
function pickTranslation(translations: Translation[] | null | undefined, lang: string) {
  if (!translations?.length) return undefined;
  return translations.find((t) => t.languages_code?.startsWith(lang)) ?? translations[0];
}

async function fetchToursForYear(base: string, year: number): Promise<Tour[]> {
  const toursUrl =
    `${base}/items/tours?filter[year][_eq]=${year}` +
    `&fields=id,date_begin,translations.title,translations.languages_code&sort=date_begin&limit=-1`;
  const res = await fetch(toursUrl);
  if (!res.ok) return [];
  const tours: Tour[] = (await res.json()).data ?? [];

  // Events per tour (M2O events.tour_id). N+1, but fine for a handful of tours per year.
  await Promise.all(
    tours.map(async (tour) => {
      const eventsUrl =
        `${base}/items/events?filter[tour_id][_eq]=${tour.id}` +
        `&fields=id,date,title,location_id.translations.name,location_id.translations.languages_code` +
        `&sort=date&limit=-1`;
      const evRes = await fetch(eventsUrl);
      tour.events = evRes.ok ? ((await evRes.json()).data ?? []) : [];
    }),
  );
  return tours;
}

function Accordion({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <details className="accordion border-b group">
      <summary className="flex items-center gap-2 cursor-pointer select-none py-3 font-bold list-none [&::-webkit-details-marker]:hidden">
        <svg
          className="w-3 h-3 shrink-0 transition-transform group-open:rotate-90"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <polyline points="9 6 15 12 9 18" />
        </svg>
        <span className="flex-1">
          <h2 className="text-gmjo-blue text-lg font-thin">{label}</h2>
        </span>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

function TourCard({ tour, lang }: { tour: Tour; lang: string }) {
  const title = (pickTranslation(tour.translations, lang)?.title as string) ?? "";
  const isEn = lang === "en";
  return (
    <div className="my-4 p-4 border-t border-black">
      <div className="grid grid-cols-2-3">
        <div>
          <div className="font-bold text-xl text-gmjo-blue">{title}</div>
        </div>
        <div>
          <Accordion label={isEn ? "Concerts" : "Konzerte"}>
            {(tour.events ?? []).map((event) => {
              const location = pickTranslation(event.location_id?.translations, lang);
              const [date, time] = (event.date ?? "").split("T");
              return (
                <div
                  key={event.id}
                  className="grid grid-cols-3 gap-2 py-2"
                  style={{ gridTemplateColumns: "100px auto 200px" }}
                >
                  <div>
                    <div className="font-bold">{date}</div>
                    <div>{time}</div>
                  </div>
                  <div>
                    <div className="font-bold">{event.title}</div>
                    <div>{(location?.name as string) ?? ""}</div>
                  </div>
                  <div></div>
                </div>
              );
            })}
          </Accordion>
          <Accordion label={isEn ? "Artists" : "Künstler"} />
          <Accordion label={isEn ? "Orchestra members" : "Orchestermitglieder"} />
          <Accordion label={isEn ? "Tutors" : "Dozenten"} />
        </div>
      </div>
    </div>
  );
}

export default function ToursWidget({ lang = "en", years = [], initialYear, directusUrl }: Props) {
  const base = directusUrl.replace(/\/$/, "");
  const sortedYears = [...years].sort((a, b) => a - b);
  const [year, setYear] = useState<number>(initialYear ?? sortedYears[sortedYears.length - 1]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch on mount and whenever the year changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchToursForYear(base, year).then((result) => {
      if (!cancelled) {
        setTours(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [base, year]);

  const idx = sortedYears.indexOf(year);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < sortedYears.length - 1;

  return (
    <div>
      <div className="flex justify-end">
        <div className="flex justify-center items-center gap-2 mt-3">
          {hasPrev && (
            <button type="button" className="text-3xl cursor-pointer" aria-label="Previous year"
              onClick={() => setYear(sortedYears[idx - 1])}>‹</button>
          )}
          <div><h2 className="font-thin">{year}</h2></div>
          {hasNext && (
            <button type="button" className="text-3xl cursor-pointer" aria-label="Next year"
              onClick={() => setYear(sortedYears[idx + 1])}>›</button>
          )}
        </div>
      </div>

      <div>
        {loading ? (
          <p className="opacity-70">Loading…</p>
        ) : tours.length === 0 ? (
          <p className="opacity-70">No tours in {year}.</p>
        ) : (
          tours.map((tour) => <TourCard key={tour.id} tour={tour} lang={lang} />)
        )}
      </div>
    </div>
  );
}
