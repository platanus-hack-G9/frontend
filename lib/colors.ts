import type { DivergenceBand } from "./types";

export const COLORS = {
  green: "#10b981",
  yellow: "#eab308",
  red: "#ef4444",
  bgPrimary: "#0a0c12",
  bgCard: "#1a1d2e",
  borderCard: "#2d3148",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
} as const;

export function bandFromDivergence(divergence: number): DivergenceBand {
  if (divergence <= 0.33) return "low";
  if (divergence <= 0.66) return "medium";
  return "high";
}

export function colorForBand(band: DivergenceBand): string {
  switch (band) {
    case "low":
      return COLORS.green;
    case "medium":
      return COLORS.yellow;
    case "high":
      return COLORS.red;
  }
}

export function labelForBand(band: DivergenceBand): string {
  switch (band) {
    case "low":
      return "Baja";
    case "medium":
      return "Media";
    case "high":
      return "Alta";
  }
}
