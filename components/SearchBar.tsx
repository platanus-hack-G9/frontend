"use client";

import { Search, X } from "lucide-react";
import { useFilters } from "@/lib/filterStore";
import { cn } from "@/lib/cn";

export function SearchBar({ className }: { className?: string }) {
  const search = useFilters((s) => s.search);
  const setSearch = useFilters((s) => s.setSearch);

  return (
    <div
      className={cn(
        "relative w-full max-w-[640px] mx-auto",
        className,
      )}
    >
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[--color-text-muted] pointer-events-none"
        aria-hidden
      />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        type="text"
        placeholder="Buscar tema, palabra clave…"
        aria-label="Buscar"
        className={cn(
          "w-full pl-11 pr-10 py-3 rounded-full",
          "bg-[--color-bg-card]/70 backdrop-blur",
          "border border-[--color-border-card]",
          "text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted]",
          "focus:outline-none focus:ring-2 focus:ring-[--color-accent-green]/40 focus:border-[--color-accent-green]/40",
          "transition-colors",
        )}
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[--color-text-muted] hover:text-[--color-text-primary] hover:bg-white/5 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
