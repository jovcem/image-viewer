import { useState, useEffect, useRef, useMemo } from 'react';
import { useHeatMap } from '@/hooks/useHeatMap';
import { useZoomPan, ZoomControls } from './ZoomPan';
import { EmptyState } from './EmptyState';
import { isImageCached, getImageUrls, getCachedImage } from '@/hooks/useImageCache';
import { cn } from '@/lib/utils';

const bgClassMap = {
  default: 'bg-background',
  black: 'bg-black',
  white: 'bg-white',
  checked: 'bg-checked',
  grey: 'bg-neutral-500',
  bordered: 'bg-white',
};

function HeatMapLegend({ stats, sensitivity, onSensitivityChange, mode, onModeChange }) {
  const [localValue, setLocalValue] = useState(sensitivity);
  const [isDragging, setIsDragging] = useState(false);

  // Sync local value when sensitivity changes externally
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(sensitivity);
    }
  }, [sensitivity, isDragging]);

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-zinc-900/90 backdrop-blur-sm rounded-lg p-3 border border-zinc-700/50">
      <div className="text-[11px] text-zinc-400 mb-2 font-medium">Difference</div>
      <div className="flex gap-1 mb-2">
        {['rgb', 'luma', 'hue'].map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={cn(
              "px-2 py-1 text-[10px] rounded transition-colors",
              mode === m ? "bg-zinc-600 text-zinc-100" : "text-zinc-400 hover:bg-zinc-700/50"
            )}
          >
            {m === 'rgb' ? 'RGB' : m === 'luma' ? 'Luma' : 'Hue'}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-500">Same</span>
        <div
          className="h-3 w-24 rounded"
          style={{
            background: 'linear-gradient(to right, rgb(0, 0, 255), rgb(0, 255, 0), rgb(255, 255, 0), rgb(255, 0, 0))',
          }}
        />
        <span className="text-[10px] text-zinc-500">Different</span>
      </div>
      <div className="flex justify-between text-[9px] text-zinc-600 mt-1 px-6">
        <span>0%</span>
        <span>33%</span>
        <span>67%</span>
        <span>100%</span>
      </div>
      <div className="mt-2 pt-2 border-t border-zinc-700/50">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
          <span>Sensitivity</span>
          <span className="text-zinc-300">{localValue}</span>
        </div>
        <input
          type="range"
          min="1"
          max="255"
          value={localValue}
          onChange={(e) => setLocalValue(Number(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => {
            setIsDragging(false);
            onSensitivityChange(localValue);
          }}
          onMouseLeave={() => {
            if (isDragging) {
              setIsDragging(false);
              onSensitivityChange(localValue);
            }
          }}
          className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
          <span>High</span>
          <span>Low</span>
        </div>
      </div>
      {stats && (
        <div className="mt-2 pt-2 border-t border-zinc-700/50 text-[10px] text-zinc-400 space-y-0.5">
          <div>Changed pixels: <span className="text-zinc-300">{stats.diffPercentage}%</span></div>
          <div>Avg diff: <span className="text-zinc-300">{stats.avgDiff}</span> / Max: <span className="text-zinc-300">{stats.maxDiff}</span></div>
        </div>
      )}
    </div>
  );
}

export function PredatorView({ currentFolder, currentComparison, bgOption = 'default', showToolbar = true, sharedZoomPan = null }) {
  const [images, setImages] = useState({ A: null, B: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [sensitivity, setSensitivity] = useState(() => {
    const saved = localStorage.getItem('predator-sensitivity');
    return saved ? Number(saved) : 50;
  });
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('predator-mode') || 'rgb';
  });
  const containerRef = useRef(null);

  const handleSensitivityChange = (value) => {
    setSensitivity(value);
    localStorage.setItem('predator-sensitivity', String(value));
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    localStorage.setItem('predator-mode', newMode);
  };

  const { heatMapUrl, loading: heatMapLoading, error: heatMapError, dimensions, stats } = useHeatMap(images.A, images.B, sensitivity, mode);

  const zoomPan = useZoomPan(dimensions, dimensions, containerRef, sharedZoomPan);

  // Memoize image style to prevent unnecessary re-renders
  const imageStyle = useMemo(() => ({
    transform: zoomPan.transform,
    transformOrigin: 'center center',
    transition: zoomPan.isPanning ? 'none' : 'transform 0.1s ease-out',
    objectFit: 'contain',
  }), [zoomPan.transform, zoomPan.isPanning]);

  useEffect(() => {
    if (!currentFolder || !currentComparison) {
      setImages({ A: null, B: null });
      setReady(false);
      return;
    }

    let cancelled = false;
    setReady(false);

    async function load() {
      const found = await getImageUrls(
        currentComparison.folder,
        currentComparison.isLocal ? currentComparison : null
      );

      if (cancelled) return;

      const isCached = found.A && found.B && isImageCached(found.A) && isImageCached(found.B);

      if (!isCached) {
        setLoading(true);
      }
      setError('');

      if (!found.A && !found.B) {
        setError(`No A or B images found in "${currentFolder}"`);
        setImages({ A: null, B: null });
        setLoading(false);
      } else {
        setImages(found);
        if (isCached) {
          setReady(true);
          setLoading(false);
        } else {
          const imgA = new Image();
          const imgB = new Image();
          let loadedCount = 0;
          const onLoad = () => {
            loadedCount++;
            if (loadedCount === 2 && !cancelled) {
              setReady(true);
              setLoading(false);
            }
          };
          imgA.onload = onLoad;
          imgA.onerror = onLoad;
          imgB.onload = onLoad;
          imgB.onerror = onLoad;
          imgA.src = found.A;
          imgB.src = found.B;
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [currentFolder, currentComparison]);

  if (!currentFolder) {
    return (
      <div className="h-full overflow-hidden relative">
        <EmptyState>
          <p>Select a comparison to view heat map</p>
        </EmptyState>
      </div>
    );
  }

  if ((loading || heatMapLoading) && !heatMapUrl) {
    return (
      <div className="h-full overflow-hidden relative">
        <EmptyState>
          <p>Computing heat map...</p>
        </EmptyState>
      </div>
    );
  }

  if (error || heatMapError) {
    return (
      <div className="h-full overflow-hidden relative">
        <EmptyState>
          <p className="text-red-400">{error || heatMapError}</p>
        </EmptyState>
      </div>
    );
  }

  if (!images.A || !images.B) {
    return (
      <div className="h-full overflow-hidden relative">
        <EmptyState>
          <p className="text-yellow-400">Need both A and B images for heat map</p>
          <p className="my-2">Found: {images.A ? 'A' : ''} {images.B ? 'B' : ''}</p>
        </EmptyState>
      </div>
    );
  }

  const isBordered = bgOption === 'bordered';

  return (
    <div className={cn("h-full w-full overflow-hidden relative", bgClassMap[bgOption])}>
      <div className={cn(
        "h-full w-full",
        isBordered && "p-6 box-border"
      )}>
        <div
          ref={(el) => {
            containerRef.current = el;
            zoomPan.setContainerRef(el);
          }}
          className={cn(
            "h-full w-full relative overflow-hidden flex items-center justify-center",
            isBordered && "rounded-xl bg-white",
            zoomPan.isSpaceHeld && !zoomPan.isPanning && "cursor-grab",
            zoomPan.isPanning && "cursor-grabbing"
          )}
          onMouseDown={zoomPan.handleMouseDown}
          onMouseMove={zoomPan.handleMouseMove}
          onMouseUp={zoomPan.handleMouseUp}
        >
          {heatMapUrl && (
            <img
              src={heatMapUrl}
              alt="Heat map difference"
              className="max-w-full max-h-full"
              style={imageStyle}
            />
          )}
          <HeatMapLegend stats={stats} sensitivity={sensitivity} onSensitivityChange={handleSensitivityChange} mode={mode} onModeChange={handleModeChange} />
          {showToolbar && (
            <div className="absolute top-2 right-2 z-10">
              <ZoomControls
                zoom={zoomPan.zoom}
                zoomMode={zoomPan.zoomMode}
                displayPercentage={zoomPan.displayPercentage}
                onZoomIn={zoomPan.zoomIn}
                onZoomOut={zoomPan.zoomOut}
                onReset={zoomPan.reset}
                onMatchA={zoomPan.matchA}
                onMatchB={zoomPan.matchB}
                hasImageA={!!dimensions}
                hasImageB={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
