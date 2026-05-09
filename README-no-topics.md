# Branch: no-topics

## What changed

The backend topics feature was not going to be implemented in time, so this branch removes the dependency on the two-topic endpoints and replaces them with a single flat events endpoint.

### Before

The app called two separate endpoints:

1. **`getGigaCentroids()`** — fetched topic cluster metadata (label, position, volume, divergence)
2. **`getCentroidEvents(centroidId)`** — fetched events belonging to a specific topic

These were combined in `loadAllCentroidsWithEvents()` to feed the map.

### After

A single endpoint returns all events at once (`events.json` / `EventsPayload` shape). The clustering that was previously provided by the backend is now computed client-side using **text-aware k-means** (k=5, farthest-first seeding, 15 iterations).

Each event is embedded into a combined feature vector before clustering:

```
[ x × 0.4,  y × 0.4,
  topic_0_present × 4.0,  topic_1_present × 4.0,  ...
  keyword_0_present × 0.6, keyword_1_present × 0.6, ... ]
```

The high `trending_topic` weight (4.0) means two events with different topics are ~5.7 units apart in feature space — far larger than any spatial or keyword contribution. This ensures events about DNU will never land in the same cluster as events about $LIBRA, regardless of their x/y positions. Events with no `trending_topics` cluster by keyword overlap with position as tiebreaker.

The resulting pseudo-centroids are mapped to the same `GigaCentroid[]` + `Map<string, CentroidEvent[]>` shapes the map component already expects, so no changes were needed to the map, store, or any other component.

## Files modified

| File | What changed |
|------|-------------|
| `lib/api.ts` | Removed `getGigaCentroids` and `getCentroidEvents`. Added `getAllEvents()`. Rewrote `loadAllCentroidsWithEvents()` with k-means clustering. |
| `lib/mockData.ts` | Simplified `loadEvents()` — was adapting from the two-endpoint system, now loads `events.json` directly. |

## Trade-offs

- **Cluster labels** are derived from the most frequent `trending_topic` across events in each cluster, falling back to the most frequent keyword. This is less precise than named backend topics.
- **Cluster boundaries** are spatial (proximity-based) rather than semantic. Events that are topically related but positioned far apart in the embedding may end up in different clusters.
- The visual result still shows distinct Voronoi territories and zoomed-in event dots, just with weaker thematic coherence between clusters.

## How to restore topic support

Re-implement `getGigaCentroids()` and `getCentroidEvents()` in `lib/api.ts`, restore `loadAllCentroidsWithEvents()` to call them, and delete the k-means helpers. The rest of the app does not need to change.
