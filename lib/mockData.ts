import type { Event, EventDetail, EventsPayload, Filters } from "./types";

/**
 * Loads the events index. In production, replace this with a fetch to your
 * backend (e.g. `/api/events`) — keep the return type the same and the rest
 * of the app does not need to change.
 */
export async function loadEvents(): Promise<EventsPayload> {
  const data = (await import("@/public/data/events.json")).default;
  return data as EventsPayload;
}

/**
 * Loads the per-event detail. Replace with `fetch(\`/api/events/${id}\`)` when
 * the backend lands. If a detail doesn't exist yet, returns a placeholder so
 * the UI doesn't crash.
 */
export async function loadEventDetail(id: string): Promise<EventDetail> {
  try {
    const mod = await import(`@/public/data/event-${id}.json`);
    return mod.default as EventDetail;
  } catch {
    return {
      verdad_consensuada: [
        "Aún no hay un análisis detallado disponible para este evento.",
      ],
      datos_aislados: [],
      contradicciones: [],
    };
  }
}

/** Fuzzy match of a query against title + keywords (case-insensitive). */
function matchesSearch(event: Event, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  if (event.title.toLowerCase().includes(q)) return true;
  return event.keywords.some((k) => k.toLowerCase().includes(q));
}

export interface MediaWithCount {
  name: string;
  count: number;
}

/**
 * Returns the list of media outlets with how many events each one covered,
 * sorted by participation desc (ties broken alphabetically).
 */
export function mediaWithCounts(
  allMedia: string[],
  events: Event[],
): MediaWithCount[] {
  const counts = new Map<string, number>();
  for (const m of allMedia) counts.set(m, 0);
  for (const e of events) {
    for (const m of e.media_sources) {
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** AND-combination of all active filters. */
export function filterEvents(events: Event[], filters: Filters): Event[] {
  return events.filter((e) => {
    if (!matchesSearch(e, filters.search)) return false;
    if (filters.topic && !e.trending_topics.includes(filters.topic)) {
      return false;
    }
    if (filters.media.length > 0) {
      const intersects = e.media_sources.some((m) => filters.media.includes(m));
      if (!intersects) return false;
    }
    return true;
  });
}
