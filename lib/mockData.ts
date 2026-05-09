import type {
  CentroidEventsResponse,
  Event,
  EventDetail,
  EventsPayload,
  Filters,
  GigaCentroidsResponse,
} from "./types";

/**
 * Adapter: derives the legacy `EventsPayload` shape from the new contract
 * (giga-centroids + centroid-events). Used by the event detail page to look up
 * an event by id and surface metadata. The home page no longer uses this.
 */
export async function loadEvents(): Promise<EventsPayload> {
  const centroidsRes = (await import("@/public/data/giga-centroids.json"))
    .default as GigaCentroidsResponse;
  const grouped = (await import("@/public/data/centroid-events.json"))
    .default as Record<string, CentroidEventsResponse>;

  const labelByCentroid = new Map(
    centroidsRes.centroids.map((c) => [c.id, c.label]),
  );

  const events: Event[] = [];
  for (const [centroidId, payload] of Object.entries(grouped)) {
    const topicLabel = labelByCentroid.get(centroidId) ?? centroidId;
    for (const e of payload.events) {
      events.push({
        id: e.id,
        slug: e.slug,
        title: e.title,
        x: e.x,
        y: e.y,
        media_count: e.media_count,
        divergence: e.divergence,
        divergence_band: e.divergence_band,
        trending_topics: [topicLabel],
        media_sources: [],
        keywords: e.keywords,
        summary: e.summary,
      });
    }
  }

  return {
    generated_at: centroidsRes.generated_at,
    events,
    trending_topics: centroidsRes.centroids.map((c) => c.label),
    media_sources: [],
  };
}

/**
 * Loads the per-event detail. If a detail JSON doesn't exist for this event,
 * returns a placeholder so the UI doesn't crash.
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

/** Fuzzy match against title + keywords (case-insensitive). Used by legacy filters. */
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

export function filterEvents(events: Event[], filters: Filters): Event[] {
  return events.filter((e) => {
    if (!matchesSearch(e, filters.search)) return false;
    if (filters.topic && !e.trending_topics.includes(filters.topic)) {
      return false;
    }
    if (filters.media.length > 0) {
      const intersects = e.media_sources.some((m) =>
        filters.media.includes(m),
      );
      if (!intersects) return false;
    }
    return true;
  });
}
