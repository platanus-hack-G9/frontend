"use client";

import { useFilters } from "@/lib/filterStore";
import { cn } from "@/lib/cn";

export function TrendingTopicsPanel({ topics }: { topics: string[] }) {
  const active = useFilters((s) => s.topic);
  const toggle = useFilters((s) => s.toggleTopic);

  return (
    <section className="rounded-xl border border-[--color-border-card] bg-[--color-bg-card]/50 p-5 md:p-6">
      <h2 className="text-sm font-semibold tracking-[0.14em] uppercase text-[--color-text-primary] mb-4">
        Trending topics
      </h2>
      <div className="flex flex-wrap gap-2.5">
        {topics.map((t) => {
          const isActive = active === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              aria-pressed={isActive}
              className={cn(
                "px-4 py-2.5 rounded-full text-base font-medium transition-all duration-200",
                "border min-h-[44px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent-green]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[--color-bg-primary]",
                isActive
                  ? "bg-[--color-accent-green]/15 border-[--color-accent-green] text-[--color-accent-green] shadow-[0_0_14px_-2px_var(--color-accent-green)]"
                  : "bg-transparent border-[--color-border-card] text-[--color-text-secondary] hover:border-[--color-text-secondary] hover:text-[--color-text-primary]",
              )}
            >
              #{t}
            </button>
          );
        })}
      </div>
    </section>
  );
}
