import { useState, useCallback, useRef, useEffect } from 'react';
import { ZoomInIcon, ZoomOutIcon, Maximize2Icon } from 'lucide-react';

export function useZoomPan(imageDimsA, imageDimsB, containerRef) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [zoomMode, setZoomMode] = useState('fit'); // 'fit', 'matchA', 'matchB'
  const lastPanPoint = useRef({ x: 0, y: 0 });

  // Track spacebar for pan mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsSpaceHeld(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpaceHeld(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Calculate what zoom level gives 1:1 pixels for an image
  const calculate1to1Zoom = useCallback((imageDims) => {
    if (!imageDims || !containerRef?.current) return 1;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (!containerWidth || !containerHeight) return 1;

    // Calculate how the image is currently displayed (object-fit: contain)
    const containerAspect = containerWidth / containerHeight;
    const imageAspect = imageDims.width / imageDims.height;

    let displayedWidth, displayedHeight;

    if (imageAspect > containerAspect) {
      // Image is wider - fits to width
      displayedWidth = containerWidth;
      displayedHeight = containerWidth / imageAspect;
    } else {
      // Image is taller - fits to height
      displayedHeight = containerHeight;
      displayedWidth = containerHeight * imageAspect;
    }

    // Current scale = displayedWidth / naturalWidth
    // For 1:1, we need zoom = naturalWidth / displayedWidth
    return imageDims.width / displayedWidth;
  }, [containerRef]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoomMode(null); // Clear mode when manually zooming

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(Math.max(z * delta, 0.1), 20));
  }, []);

  const handleMouseDown = useCallback((e) => {
    // Start panning when space is held and left click, or middle mouse
    if (isSpaceHeld && e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    }
  }, [isSpaceHeld]);

  const canPan = zoom > 1;

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;

    const dx = e.clientX - lastPanPoint.current.x;
    const dy = e.clientY - lastPanPoint.current.y;

    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    lastPanPoint.current = { x: e.clientX, y: e.clientY };
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle mouse move and up globally when panning
  useEffect(() => {
    if (!isPanning) return;

    const handleGlobalMouseMove = (e) => {
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    };

    const handleGlobalMouseUp = () => setIsPanning(false);

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning]);

  const reset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setZoomMode('fit');
  }, []);

  const zoomIn = useCallback(() => {
    setZoomMode(null);
    setZoom(z => Math.min(z * 1.25, 20));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomMode(null);
    setZoom(z => Math.max(z * 0.8, 0.1));
  }, []);

  const matchA = useCallback(() => {
    const z = calculate1to1Zoom(imageDimsA);
    setZoom(z);
    setPan({ x: 0, y: 0 });
    setZoomMode('matchA');
  }, [imageDimsA, calculate1to1Zoom]);

  const matchB = useCallback(() => {
    const z = calculate1to1Zoom(imageDimsB);
    setZoom(z);
    setPan({ x: 0, y: 0 });
    setZoomMode('matchB');
  }, [imageDimsB, calculate1to1Zoom]);

  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;

  // Calculate display percentage based on mode
  const getDisplayPercentage = useCallback(() => {
    if (zoomMode === 'matchA' && imageDimsA) {
      return 100; // 1:1 for A
    }
    if (zoomMode === 'matchB' && imageDimsB) {
      return 100; // 1:1 for B
    }
    // For fit mode, show zoom relative to fit
    return Math.round(zoom * 100);
  }, [zoom, zoomMode, imageDimsA, imageDimsB]);

  return {
    zoom,
    pan,
    isPanning,
    isSpaceHeld,
    canPan,
    zoomMode,
    transform,
    displayPercentage: getDisplayPercentage(),
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    reset,
    zoomIn,
    zoomOut,
    matchA,
    matchB,
  };
}

export function ZoomControls({ zoom, zoomMode, displayPercentage, onZoomIn, onZoomOut, onReset, onMatchA, onMatchB, hasImageA, hasImageB }) {
  return (
    <div className="flex items-center gap-1 bg-zinc-900/80 backdrop-blur-sm rounded-lg p-1 border border-zinc-700/50">
      <button
        onClick={onZoomOut}
        className="p-1.5 rounded hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Zoom out"
      >
        <ZoomOutIcon className="h-3.5 w-3.5" />
      </button>
      <span className="text-[11px] font-mono text-zinc-400 min-w-[3rem] text-center">
        {displayPercentage}%
      </span>
      <button
        onClick={onZoomIn}
        className="p-1.5 rounded hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Zoom in"
      >
        <ZoomInIcon className="h-3.5 w-3.5" />
      </button>
      <div className="w-px h-4 bg-zinc-700/50 mx-0.5" />
      <button
        onClick={onReset}
        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
          zoomMode === 'fit'
            ? 'bg-zinc-600 text-zinc-100'
            : 'hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200'
        }`}
        title="Fit to view"
      >
        Fit
      </button>
      {hasImageA && (
        <button
          onClick={onMatchA}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            zoomMode === 'matchA'
              ? 'bg-zinc-600 text-zinc-100'
              : 'hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200'
          }`}
          title="1:1 pixels for image A"
        >
          1:1 A
        </button>
      )}
      {hasImageB && (
        <button
          onClick={onMatchB}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
            zoomMode === 'matchB'
              ? 'bg-zinc-600 text-zinc-100'
              : 'hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200'
          }`}
          title="1:1 pixels for image B"
        >
          1:1 B
        </button>
      )}
    </div>
  );
}
