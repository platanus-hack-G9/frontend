type LayerType = "voronoi" | "hex-grid" | "radial" | "none";

interface LayerSelectorProps {
  currentLayer: LayerType;
  onLayerChange: (layer: LayerType) => void;
}

export function LayerSelector({ currentLayer, onLayerChange }: LayerSelectorProps) {
  return (
    <div className="absolute top-5 left-5 z-20 flex items-center gap-2 bg-[--color-bg-elevated] border border-[--color-border-card] rounded-lg px-3 py-2 shadow-lg">
      <span className="text-xs font-medium text-[--color-text-muted] tracking-wide uppercase">Layer:</span>
      <div className="flex gap-1">
        <button
          onClick={() => onLayerChange("none")}
          className={`px-2 py-1 text-xs rounded transition-all ${
            currentLayer === "none" 
              ? "bg-[--color-accent-green] text-white" 
              : "text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-white/10"
          }`}
        >
          None
        </button>
        <button
          onClick={() => onLayerChange("voronoi")}
          className={`px-2 py-1 text-xs rounded transition-all ${
            currentLayer === "voronoi" 
              ? "bg-[--color-accent-green] text-white" 
              : "text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-white/10"
          }`}
        >
          Voronoi
        </button>
        <button
          onClick={() => onLayerChange("hex-grid")}
          className={`px-2 py-1 text-xs rounded transition-all ${
            currentLayer === "hex-grid" 
              ? "bg-[--color-accent-green] text-white" 
              : "text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-white/10"
          }`}
        >
          Hex Grid
        </button>
        <button
          onClick={() => onLayerChange("radial")}
          className={`px-2 py-1 text-xs rounded transition-all ${
            currentLayer === "radial" 
              ? "bg-[--color-accent-green] text-white" 
              : "text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-white/10"
          }`}
        >
          Radial
        </button>
      </div>
    </div>
  );
}

export type { LayerType };
