import type { Event, EventsPayload, GigaCentroid, CentroidEvent, DivergenceBand } from "./types";

// ─── Feature-space k-means ────────────────────────────────────────────────────
//
// Each event is represented as a combined vector:
//   [ x * W_POS,  y * W_POS,
//     topic_0 ? W_TOPIC : 0,  topic_1 ? W_TOPIC : 0,  ...
//     kw_0 ? W_KW : 0,        kw_1 ? W_KW : 0,        ... ]
//
// W_TOPIC dominates: two events with *different* trending_topics have a
// topic-space distance of √2 * W_TOPIC ≈ 5.7, dwarfing any spatial or keyword
// contribution.  Events that share a topic are pulled tightly together.
// Events with no topic at all cluster by keyword overlap + position.

const W_POS   = 0.4;
const W_TOPIC = 4.0;
const W_KW    = 0.6;

function buildVectors(events: Event[]): number[][] {
  const topics   = [...new Set(events.flatMap(e => e.trending_topics))];
  const keywords = [...new Set(events.flatMap(e => e.keywords))];
  return events.map(e => [
    e.x * W_POS,
    e.y * W_POS,
    ...topics.map(t   => e.trending_topics.includes(t) ? W_TOPIC : 0),
    ...keywords.map(k => e.keywords.includes(k)        ? W_KW    : 0),
  ]);
}

function vecDist(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

function assign(vecs: number[][], cents: number[][]): number[] {
  return vecs.map(v => {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < cents.length; i++) {
      const d = vecDist(v, cents[i]);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  });
}

// Farthest-first seeding + 15 k-means iterations in combined feature space.
function kMeans(vecs: number[][], k: number): number[] {
  const n = Math.min(k, vecs.length);

  // Farthest-first init: guarantees diverse starting centroids.
  const seedIdx: number[] = [0];
  while (seedIdx.length < n) {
    let best = 0, bestD = -Infinity;
    for (let i = 0; i < vecs.length; i++) {
      const d = Math.min(...seedIdx.map(si => vecDist(vecs[i], vecs[si])));
      if (d > bestD) { bestD = d; best = i; }
    }
    seedIdx.push(best);
  }

  let cents = seedIdx.map(i => vecs[i].slice());

  for (let iter = 0; iter < 15; iter++) {
    const labels = assign(vecs, cents);
    const dim = vecs[0].length;
    const sums  = Array.from({ length: n }, () => new Array(dim).fill(0));
    const counts = new Array(n).fill(0);
    for (let i = 0; i < vecs.length; i++) {
      const c = labels[i];
      counts[c]++;
      for (let d = 0; d < dim; d++) sums[c][d] += vecs[i][d];
    }
    cents = sums.map((s, i) =>
      counts[i] > 0 ? s.map(v => v / counts[i]) : cents[i],
    );
  }

  return assign(vecs, cents);
}

function clusterEvents(
  events: Event[],
  k: number,
): { id: string; events: Event[]; cx: number; cy: number }[] {
  if (events.length === 0) return [];
  const vecs   = buildVectors(events);
  const labels = kMeans(vecs, k);

  const n = Math.min(k, events.length);
  const buckets: Event[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < events.length; i++) buckets[labels[i]].push(events[i]);

  return buckets
    .map((evts, i) => {
      if (!evts.length) return null;
      return {
        id: `cluster_${i}`,
        events: evts,
        cx: evts.reduce((s, e) => s + e.x, 0) / evts.length,
        cy: evts.reduce((s, e) => s + e.y, 0) / evts.length,
      };
    })
    .filter(Boolean) as { id: string; events: Event[]; cx: number; cy: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avgDivergence(events: Event[]): number {
  if (!events.length) return 0;
  return events.reduce((s, e) => s + e.divergence, 0) / events.length;
}

function bandFromAvg(avg: number): DivergenceBand {
  if (avg >= 0.6) return "high";
  if (avg >= 0.35) return "medium";
  return "low";
}

// Most-frequent trending_topic in the cluster, falling back to most-frequent keyword.
function deriveLabel(events: Event[]): string {
  const topicCounts = new Map<string, number>();
  for (const e of events) {
    for (const t of e.trending_topics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  }
  if (topicCounts.size > 0) {
    return [...topicCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  const kwCounts = new Map<string, number>();
  for (const e of events) {
    for (const k of e.keywords) kwCounts.set(k, (kwCounts.get(k) ?? 0) + 1);
  }
  const sorted = [...kwCounts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "Noticias";
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getAllEvents(): Promise<EventsPayload> {
  const data = (await import("@/public/data/events.json")).default;
  return data as EventsPayload;
}

export async function loadAllCentroidsWithEvents(): Promise<{
  centroids: GigaCentroid[];
  eventsByCentroid: Map<string, CentroidEvent[]>;
}> {
  const payload  = await getAllEvents();
  const clusters = clusterEvents(payload.events, 5);

  const centroids: GigaCentroid[] = clusters.map(cl => {
    const avg = avgDivergence(cl.events);
    return {
      id:             cl.id,
      label:          deriveLabel(cl.events),
      x:              cl.cx,
      y:              cl.cy,
      volume:         cl.events.length,
      avg_divergence: avg,
      color_band:     bandFromAvg(avg),
    };
  });

  const eventsByCentroid = new Map<string, CentroidEvent[]>();
  for (const cl of clusters) {
    eventsByCentroid.set(
      cl.id,
      cl.events.map(e => ({
        id:             e.id,
        slug:           e.slug,
        title:          e.title,
        x:              e.x,
        y:              e.y,
        media_count:    e.media_count,
        divergence:     e.divergence,
        divergence_band: e.divergence_band,
        summary:        e.summary,
        keywords:       e.keywords,
      })),
    );
  }

  return { centroids, eventsByCentroid };
}
