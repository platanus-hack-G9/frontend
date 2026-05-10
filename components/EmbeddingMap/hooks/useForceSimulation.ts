import { useMemo } from "react";
import * as d3 from "d3";
import type { CentroidEvent, GigaCentroid } from "@/lib/types";
import { colorForDivergence } from "@/lib/colors";

interface CentroidNode {
  centroid: GigaCentroid;
  cx: number;
  cy: number;
  r: number;
  color: string;
}

interface EventNode {
  event: CentroidEvent;
  centroidId: string;
  cx: number;
  cy: number;
  r: number;
  color: string;
}

interface Size {
  width: number;
  height: number;
}

export function useForceSimulation(
  centroids: GigaCentroid[],
  eventsByCentroid: Map<string, CentroidEvent[]>,
  size: Size
): { centroidNodes: CentroidNode[]; eventNodes: EventNode[] } {
  return useMemo(() => {
    if (size.width === 0 || size.height === 0) return { centroidNodes: [], eventNodes: [] };

    const eventRScale = d3
      .scaleSqrt()
      .domain([1, 15])
      .range([7, 18])
      .clamp(true);
    const centroidRScale = d3
      .scaleSqrt()
      .domain([1, 20])
      .range([26, 64])
      .clamp(true);

    // Anchors: un punto por topic, distribuidos en círculo alrededor del centro.
    const cx = size.width / 2;
    const cy = size.height / 2;
    const ringRadius = Math.min(size.width, size.height) * 0.32;
    const N = centroids.length;
    const anchorByTopic = new Map<string, { x: number; y: number }>();
    centroids.forEach((c, i) => {
      const angle = (i / Math.max(N, 1)) * 2 * Math.PI - Math.PI / 2;
      anchorByTopic.set(c.id, {
        x: cx + ringRadius * Math.cos(angle),
        y: cy + ringRadius * Math.sin(angle),
      });
    });

    type SimEvent = d3.SimulationNodeDatum & {
      event: CentroidEvent;
      topicId: string;
      r: number;
      color: string;
    };

    const eventsSim: SimEvent[] = [];
    for (const [centroidId, events] of eventsByCentroid.entries()) {
      const anchor = anchorByTopic.get(centroidId);
      if (!anchor) continue;
      for (const e of events) {
        eventsSim.push({
          event: e,
          topicId: centroidId,
          r: eventRScale(Math.max(e.media_count, 1)),
          color: colorForDivergence(e.divergence ?? 0),
          // Empezamos cerca del anchor con jitter para que la sim no diverja.
          x: anchor.x + (Math.random() - 0.5) * 30,
          y: anchor.y + (Math.random() - 0.5) * 30,
        });
      }
    }

    if (!eventsSim.length) return { centroidNodes: [], eventNodes: [] };

    const sim = d3
      .forceSimulation<SimEvent>(eventsSim)
      .force(
        "x",
        d3.forceX<SimEvent>((d) => anchorByTopic.get(d.topicId)?.x ?? cx).strength(0.35),
      )
      .force(
        "y",
        d3.forceY<SimEvent>((d) => anchorByTopic.get(d.topicId)?.y ?? cy).strength(0.35),
      )
      .force("charge", d3.forceManyBody<SimEvent>().strength(-25))
      .force(
        "collide",
        d3.forceCollide<SimEvent>((d) => d.r + 3).strength(1).iterations(3),
      )
      .stop();

    // ~300 ticks alcanzan para que se acomoden los clusters sin oscilar.
    for (let i = 0; i < 300; i++) sim.tick();

    const eventNodesOut: EventNode[] = eventsSim.map((s) => ({
      event: s.event,
      centroidId: s.topicId,
      cx: s.x ?? 0,
      cy: s.y ?? 0,
      r: s.r,
      color: s.color,
    }));

    // Centroid de cada topic = mean(x, y) de sus events tras la simulación.
    const centroidNodesOut: CentroidNode[] = centroids.map((c) => {
      const myEvents = eventNodesOut.filter((e) => e.centroidId === c.id);
      const anchor = anchorByTopic.get(c.id) ?? { x: cx, y: cy };
      const meanX = myEvents.length
        ? myEvents.reduce((s, e) => s + e.cx, 0) / myEvents.length
        : anchor.x;
      const meanY = myEvents.length
        ? myEvents.reduce((s, e) => s + e.cy, 0) / myEvents.length
        : anchor.y;
      return {
        centroid: c,
        cx: meanX,
        cy: meanY,
        r: centroidRScale(c.volume),
        color: colorForDivergence(c.avg_divergence ?? 0),
      };
    });

    return { centroidNodes: centroidNodesOut, eventNodes: eventNodesOut };
  }, [centroids, eventsByCentroid, size]);
}
