import { cn } from '@/lib/utils';

export function AnnotationOverlay({ annotations, zoom, pan, containerRef, showingImage = null, isSliderMode = false, isSingle = false }) {
  const { strokePaths, strokePathsA, strokePathsB, currentPath, enabled, annotatingImage } = annotations;

  // Determine which stroke paths to show:
  // - Single image mode: only A
  // - Slider mode: show both A and B (both images visible)
  // - Single view mode: show strokes for the image being shown
  const getPathsToRender = () => {
    if (isSingle) {
      return strokePathsA;
    }
    if (isSliderMode) {
      // Both images visible, show all strokes
      return [...strokePathsA, ...strokePathsB];
    }
    // Single view mode - show strokes for the viewed image
    return showingImage === 'B' ? strokePathsB : strokePathsA;
  };

  const pathsToRender = getPathsToRender();

  if (!enabled && pathsToRender.length === 0 && !currentPath) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <g
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {pathsToRender.map((stroke, i) => (
          <path
            key={i}
            d={stroke.path}
            fill={stroke.color}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {currentPath && (
          <path
            d={currentPath.path}
            fill={currentPath.color}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </g>
    </svg>
  );
}

export function AnnotationControls({ annotations, isSingle = false }) {
  const { enabled, color, colors, colorIndex, setColorIndex, clear, undo, currentImageStrokes, brushSize, setBrushSize, annotatingImage } = annotations;

  if (!enabled) return null;

  // Stop propagation to prevent annotation drawing when interacting with controls
  const stopProp = (e) => e.stopPropagation();

  return (
    <div
      className="absolute bottom-16 right-4 z-30 bg-zinc-900/90 backdrop-blur-sm rounded-lg p-2 border border-zinc-700/50 flex flex-col gap-2"
      onMouseDown={stopProp}
      onPointerDown={stopProp}
    >
      {/* Show which image is being annotated (only for comparison mode) */}
      {!isSingle && (
        <div className="flex items-center gap-2 pb-1 border-b border-zinc-700/50">
          <span className="text-[10px] text-zinc-500">Annotating:</span>
          <span className="text-[10px] font-medium text-zinc-300">{annotatingImage}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {colors.map((c, i) => (
            <button
              key={c}
              onClick={() => setColorIndex(i)}
              className={cn(
                "w-5 h-5 rounded-full border-2 transition-transform",
                colorIndex === i ? "border-white scale-110" : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="w-px h-5 bg-zinc-700" />
        <button
          onClick={undo}
          disabled={currentImageStrokes.length === 0}
          className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Undo
        </button>
        <button
          onClick={clear}
          disabled={currentImageStrokes.length === 0}
          className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-500">Size</span>
        <input
          type="range"
          min="1"
          max="20"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-400"
        />
        <span className="text-[10px] text-zinc-400 w-4 text-right">{brushSize}</span>
      </div>
    </div>
  );
}
