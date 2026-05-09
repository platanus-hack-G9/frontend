"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import { Plus, Minus, Locate } from "lucide-react";
import type { Event } from "@/lib/types";
import { useFilters } from "@/lib/filterStore";
import { filterEvents } from "@/lib/mockData";
import { colorForBand, labelForBand } from "@/lib/colors";
import { MapLegend } from "./MapLegend";

const PADDING = 48;
const RADIUS_RANGE: [number, number] = [6, 28];
const FOCUS_PULL_OPACITY = 0.4;
const HIDDEN_OPACITY = 0.15;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 6;

interface Props {
  events: Event[];
}

interface Tooltip {
  event: Event;
  x: number;
  y: number;
}

export function EmbeddingMap({ events }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [transform, setTransform] = useState<d3.ZoomTransform>(
    d3.zoomIdentity,
  );

  const search = useFilters((s) => s.search);
  const topic = useFilters((s) => s.topic);
  const media = useFilters((s) => s.media);

  const visibleEvents = useMemo(
    () => filterEvents(events, { search, topic, media }),
    [events, search, topic, media],
  );
  const visibleIds = useMemo(
    () => new Set(visibleEvents.map((e) => e.id)),
    [visibleEvents],
  );

  // Track resize
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Base node positions (independent of zoom)
  const nodes = useMemo(() => {
    if (size.width === 0 || size.height === 0) return [];
    const xScale = d3
      .scaleLinear()
      .domain([-1, 1])
      .range([PADDING, size.width - PADDING]);
    const yScale = d3
      .scaleLinear()
      .domain([-1, 1])
      .range([size.height - PADDING, PADDING]);
    const rScale = d3
      .scaleLog()
      .domain([1, 15])
      .range(RADIUS_RANGE)
      .clamp(true);

    return events.map((e) => ({
      event: e,
      cx: xScale(e.x),
      cy: yScale(e.y),
      r: rScale(Math.max(e.media_count, 1)),
      color: colorForBand(e.divergence_band),
    }));
  }, [events, size]);

  // Wire d3-zoom on the canvas element. The transform state drives redraws.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;

    const zoom = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([ZOOM_MIN, ZOOM_MAX])
      .filter((event) => {
        // Allow wheel + drag, but block right-click drag.
        if (event.type === "mousedown" && event.button !== 0) return false;
        return !event.ctrlKey;
      })
      .on("zoom", (event) => {
        setTransform(event.transform);
      });

    zoomBehaviorRef.current = zoom;
    const sel = d3.select(canvas);
    sel.call(zoom);
    // double-click to reset, override d3-zoom's default which is zoom-in.
    sel.on("dblclick.zoom", null);
    sel.on("dblclick", () => {
      sel
        .transition()
        .duration(300)
        .call(zoom.transform, d3.zoomIdentity);
    });

    return () => {
      sel.on(".zoom", null);
      sel.on("dblclick", null);
    };
  }, [size.width, size.height]);

  // Render canvas — re-runs whenever transform, nodes, hover or filters change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    // Background grid — drawn in transformed space so it pans/zooms with content.
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);
    ctx.strokeStyle = "rgba(45, 49, 72, 0.25)";
    ctx.lineWidth = 1 / transform.k;
    const grid = 40;
    // Draw a few extra grid cells outside the viewport to cover panning.
    const margin = grid * 4;
    for (
      let x = -margin;
      x < size.width / transform.k + margin;
      x += grid
    ) {
      ctx.beginPath();
      ctx.moveTo(x, -margin);
      ctx.lineTo(x, size.height / transform.k + margin);
      ctx.stroke();
    }
    for (
      let y = -margin;
      y < size.height / transform.k + margin;
      y += grid
    ) {
      ctx.beginPath();
      ctx.moveTo(-margin, y);
      ctx.lineTo(size.width / transform.k + margin, y);
      ctx.stroke();
    }
    ctx.restore();

    const hasFocus = hoverId !== null;
    const sorted = [...nodes].sort(
      (a, b) => a.event.divergence - b.event.divergence,
    );

    for (const n of sorted) {
      const isVisible = visibleIds.has(n.event.id);
      const isHovered = n.event.id === hoverId;
      let opacity = 1;
      if (!isVisible) {
        opacity = HIDDEN_OPACITY;
      } else if (hasFocus && !isHovered) {
        opacity = FOCUS_PULL_OPACITY;
      }

      // Apply transform to position; keep radius scaled by k so nodes feel native.
      const cx = transform.applyX(n.cx);
      const cy = transform.applyY(n.cy);
      const r = (isHovered ? n.r * 1.18 : n.r) * transform.k;

      ctx.save();
      ctx.globalAlpha = opacity;

      if (n.event.divergence_band === "high" && isVisible) {
        ctx.shadowColor = n.color;
        ctx.shadowBlur = isHovered ? 22 : 14;
      }

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(r * 0.45, 2), 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = opacity * 0.95;
      ctx.fill();

      ctx.restore();
    }
  }, [nodes, size, hoverId, visibleIds, transform]);

  // Hit testing — invert client coords through the zoom transform.
  const hitTest = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let best: { node: (typeof nodes)[number]; dist: number } | null = null;
    for (const n of nodes) {
      if (!visibleIds.has(n.event.id)) continue;
      const cx = transform.applyX(n.cx);
      const cy = transform.applyY(n.cy);
      const r = n.r * transform.k;
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r + 4) {
        if (!best || dist < best.dist) best = { node: n, dist };
      }
    }
    return best ? best.node : null;
  };

  // Programmatic zoom controls (used by the +/-/reset buttons).
  const zoomBy = (factor: number) => {
    const canvas = canvasRef.current;
    const zoom = zoomBehaviorRef.current;
    if (!canvas || !zoom) return;
    d3.select(canvas)
      .transition()
      .duration(180)
      .call(zoom.scaleBy, factor);
  };
  const resetZoom = () => {
    const canvas = canvasRef.current;
    const zoom = zoomBehaviorRef.current;
    if (!canvas || !zoom) return;
    d3.select(canvas)
      .transition()
      .duration(220)
      .call(zoom.transform, d3.zoomIdentity);
  };

  const isZoomed = transform.k !== 1 || transform.x !== 0 || transform.y !== 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] lg:h-auto lg:min-h-[560px] rounded-xl overflow-hidden border border-[--color-border-card] bg-[--color-bg-primary]"
    >
      <MapLegend />

      <ZoomControls
        onZoomIn={() => zoomBy(1.5)}
        onZoomOut={() => zoomBy(1 / 1.5)}
        onReset={resetZoom}
        canReset={isZoomed}
        scale={transform.k}
      />

      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
        onMouseMove={(e) => {
          const hit = hitTest(e.clientX, e.clientY);
          if (hit) {
            setHoverId(hit.event.id);
            const rect = containerRef.current!.getBoundingClientRect();
            setTooltip({
              event: hit.event,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
            (e.currentTarget as HTMLCanvasElement).style.cursor = "pointer";
          } else {
            setHoverId(null);
            setTooltip(null);
            (e.currentTarget as HTMLCanvasElement).style.cursor = "grab";
          }
        }}
        onMouseLeave={() => {
          setHoverId(null);
          setTooltip(null);
        }}
        onClick={(e) => {
          // d3-zoom may fire click after a drag; only navigate if there's no movement.
          // The simplest signal: if we have a hovered hit, navigate.
          const hit = hitTest(e.clientX, e.clientY);
          if (hit) router.push(`/event/${hit.event.id}`);
        }}
      />

      {tooltip && <NodeTooltip tooltip={tooltip} />}

      <div className="absolute bottom-3 left-4 text-xs tracking-[0.12em] uppercase text-[--color-text-muted] pointer-events-none">
        Mostrando {visibleEvents.length} de {events.length} eventos
      </div>
    </div>
  );
}

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canReset: boolean;
  scale: number;
}

function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  canReset,
  scale,
}: ZoomControlsProps) {
  return (
    <div
      className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 p-1.5 rounded-xl bg-[--color-bg-card]/80 backdrop-blur border border-[--color-border-card] shadow-lg"
      role="group"
      aria-label="Controles de zoom del mapa"
    >
      <ZoomButton onClick={onZoomIn} label="Acercar" disabled={scale >= ZOOM_MAX - 0.01}>
        <Plus className="h-5 w-5" />
      </ZoomButton>
      <ZoomButton
        onClick={onZoomOut}
        label="Alejar"
        disabled={scale <= ZOOM_MIN + 0.01}
      >
        <Minus className="h-5 w-5" />
      </ZoomButton>
      <ZoomButton
        onClick={onReset}
        label="Restablecer vista"
        disabled={!canReset}
      >
        <Locate className="h-4 w-4" />
      </ZoomButton>
      <div
        aria-live="polite"
        className="text-center text-[10px] font-mono text-[--color-text-muted] pt-1 border-t border-[--color-border-card]"
      >
        {scale.toFixed(1)}×
      </div>
    </div>
  );
}

function ZoomButton({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-9 h-9 flex items-center justify-center rounded-lg text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function NodeTooltip({ tooltip }: { tooltip: Tooltip }) {
  const { event, x, y } = tooltip;
  const color = colorForBand(event.divergence_band);
  const left = x + 14;
  const top = y + 14;
  return (
    <div
      role="tooltip"
      className="absolute z-20 pointer-events-none w-72 rounded-lg border border-[--color-border-card] bg-[--color-bg-card]/95 backdrop-blur p-3 shadow-2xl text-xs text-[--color-text-secondary] fade-in"
      style={{ left, top }}
    >
      <div className="flex items-start gap-2 mb-2">
        <span
          className="mt-1 w-2 h-2 rounded-full shrink-0"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
        <p className="text-[--color-text-primary] text-sm leading-snug font-medium">
          {event.title}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2 pl-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[--color-text-muted]">
            Medios
          </div>
          <div className="text-[--color-text-primary] font-semibold">
            {event.media_count}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[--color-text-muted]">
            Discrepancia
          </div>
          <div className="font-semibold" style={{ color }}>
            {labelForBand(event.divergence_band)}
          </div>
        </div>
      </div>
      <div className="pl-4">
        <div className="text-[10px] uppercase tracking-wider text-[--color-text-muted] mb-1">
          Cubierto por
        </div>
        <div className="leading-relaxed">
          {event.media_sources.slice(0, 5).join(", ")}
          {event.media_sources.length > 5 &&
            ` +${event.media_sources.length - 5}`}
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-[--color-border-card] text-[10px] text-[--color-text-muted]">
        Click para ver el desglose
      </div>
    </div>
  );
}
