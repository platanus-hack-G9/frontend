"use client";

import { useMemo, useState } from "react";
import { Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useFilters } from "@/lib/filterStore";
import type { MediaWithCount } from "@/lib/mockData";
import { cn } from "@/lib/cn";

const DEFAULT_VISIBLE = 8;

export function MediaFilterPanel({ media }: { media: MediaWithCount[] }) {
  const selected = useFilters((s) => s.media);
  const toggle = useFilters((s) => s.toggleMedia);
  const clear = useFilters((s) => s.clearMedia);

  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const isSearching = query.trim().length > 0;

  const filtered = useMemo(() => {
    if (!isSearching) return media;
    const q = query.toLowerCase();
    return media.filter((m) => m.name.toLowerCase().includes(q));
  }, [media, query, isSearching]);

  // When NOT searching: show top N + any selected ones not in the top.
  // When searching: show every match.
  // When showAll: show every media in the (possibly filtered) list.
  const visible = useMemo(() => {
    if (isSearching || showAll) return filtered;
    const top = filtered.slice(0, DEFAULT_VISIBLE);
    const inTop = new Set(top.map((m) => m.name));
    const selectedMissing = filtered.filter(
      (m) => selected.includes(m.name) && !inTop.has(m.name),
    );
    return [...top, ...selectedMissing];
  }, [filtered, selected, isSearching, showAll]);

  const hiddenCount = filtered.length - visible.length;

  return (
    <section className="rounded-xl border border-[--color-border-card] bg-[--color-bg-card]/50 p-5 md:p-6">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-[0.14em] uppercase text-[--color-text-primary]">
          Medios
        </h2>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent-green]/40"
          >
            limpiar ({selected.length})
          </button>
        )}
      </header>

      {/* Mini search */}
      <div className="relative mb-3">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--color-text-muted] pointer-events-none"
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar medio…"
          aria-label="Buscar medio"
          className={cn(
            "w-full pl-9 pr-9 py-2.5 text-sm rounded-lg",
            "bg-[--color-bg-elevated] border border-[--color-border-card]",
            "text-[--color-text-primary] placeholder:text-[--color-text-muted]",
            "focus:outline-none focus:ring-2 focus:ring-[--color-accent-green]/40 focus:border-[--color-accent-green]/40",
            "transition-colors",
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpiar búsqueda de medios"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[--color-text-muted] hover:text-[--color-text-primary] hover:bg-white/5 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="text-[11px] text-[--color-text-muted] mb-2 px-1">
        {isSearching
          ? `${filtered.length} resultado${filtered.length === 1 ? "" : "s"}`
          : showAll
            ? `${media.length} medios — ordenados por participación`
            : `Top ${Math.min(DEFAULT_VISIBLE, media.length)} por participación`}
      </p>

      {/* List */}
      {visible.length === 0 ? (
        <div className="h-[368px] flex items-center justify-center text-center text-sm text-[--color-text-muted] px-4">
          Sin resultados para <span className="italic ml-1">"{query}"</span>
        </div>
      ) : (
        <ul className="space-y-1 h-[368px] overflow-y-auto pr-1 -mr-1">
          {visible.map((m) => {
            const id = `media-${m.name.replace(/[^a-z0-9]/gi, "-")}`;
            const isSelected = selected.includes(m.name);
            return (
              <li key={m.name}>
                <label
                  htmlFor={id}
                  className={cn(
                    "flex items-center gap-3 cursor-pointer select-none px-2 py-2.5 -mx-2 rounded-md",
                    "text-base transition-colors min-h-[44px]",
                    isSelected
                      ? "text-[--color-text-primary] bg-white/[0.03]"
                      : "text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-white/[0.02]",
                  )}
                >
                  <Checkbox
                    id={id}
                    checked={isSelected}
                    onCheckedChange={() => toggle(m.name)}
                  />
                  <span className="flex-1 truncate">{m.name}</span>
                  <span
                    className={cn(
                      "text-xs font-mono tabular-nums shrink-0",
                      isSelected
                        ? "text-[--color-text-secondary]"
                        : "text-[--color-text-muted]",
                    )}
                    aria-label={`${m.count} eventos`}
                    title={`Aparece en ${m.count} eventos`}
                  >
                    {m.count}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {/* Toggle ver todos / ver menos — only when not searching and there's hidden content */}
      {!isSearching && (hiddenCount > 0 || showAll) && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-[--color-text-secondary] hover:text-[--color-text-primary] py-2 rounded-md hover:bg-white/[0.02] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent-green]/40"
        >
          {showAll ? (
            <>
              Ver menos <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Ver todos ({media.length}) <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </section>
  );
}
