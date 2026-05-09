import type {
  GigaCentroid,
  GigaCentroidsResponse,
  CentroidEventsResponse,
  CentroidEvent,
} from "./types";

/**
 * Fetches the list of giga-centroids (topics) for the initial map render.
 *
 * Production wiring (Supabase RPC):
 *
 *   const { data, error } = await supabase.rpc('get_giga_centroids');
 *   if (error) throw error;
 *   return data as GigaCentroidsResponse;
 *
 * The response shape is identical to the mock — see contrato-bdd/contract.md.
 */
export async function getGigaCentroids(): Promise<GigaCentroidsResponse> {
  const data = (await import("@/public/data/giga-centroids.json")).default;
  return data as GigaCentroidsResponse;
}

/**
 * Fetches the events for a given giga-centroid (topic). Called on-demand when
 * the user zooms into a topic in the map.
 *
 * Production wiring (Supabase RPC):
 *
 *   const { data, error } = await supabase.rpc('get_centroid_events', {
 *     p_centroid_id: centroidId,
 *   });
 *   if (error) throw error;
 *   return { centroid_id: centroidId, events: data ?? [] };
 *
 * @returns The events list, or an empty array if the centroid is not known.
 */
export async function getCentroidEvents(
  centroidId: string,
): Promise<CentroidEventsResponse> {
  const all = (await import("@/public/data/centroid-events.json")).default as Record<
    string,
    CentroidEventsResponse
  >;
  const found = all[centroidId];
  if (found) return found;
  return { centroid_id: centroidId, events: [] };
}

/**
 * Convenience: load every centroid + every event up-front. Used by the search
 * feature, which must be able to jump across topics. In production with
 * Supabase, expose a dedicated `search_events` RPC instead of pre-fetching.
 */
export async function loadAllCentroidsWithEvents(): Promise<{
  centroids: GigaCentroid[];
  eventsByCentroid: Map<string, CentroidEvent[]>;
}> {
  const [centroidsRes, allEvents] = await Promise.all([
    getGigaCentroids(),
    import("@/public/data/centroid-events.json").then((m) => m.default),
  ]);
  const grouped = new Map<string, CentroidEvent[]>();
  for (const c of centroidsRes.centroids) {
    const entry = (allEvents as Record<string, CentroidEventsResponse>)[c.id];
    grouped.set(c.id, entry?.events ?? []);
  }
  return { centroids: centroidsRes.centroids, eventsByCentroid: grouped };
}
