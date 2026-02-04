import { useState, useEffect, useRef, useCallback } from 'react';
import { PipetteIcon } from 'lucide-react';

export function useColorPicker(imageA, imageB, enabled = false, zoom = 1, pan = { x: 0, y: 0 }) {
  const [colorA, setColorA] = useState(null);
  const [colorB, setColorB] = useState(null);
  const [gridA, setGridA] = useState(null);
  const [gridB, setGridB] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageCoords, setImageCoords] = useState({ x: 0, y: 0 });

  const canvasARef = useRef(null);
  const canvasBRef = useRef(null);
  const imgARef = useRef(null);
  const imgBRef = useRef(null);
  const containerRef = useRef(null);

  // Load images into canvases
  useEffect(() => {
    if (!imageA || !imageB) return;

    const loadImage = (src, canvasRef, imgRef) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvasRef.current = canvas;
          imgRef.current = img;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
      });
    };

    Promise.all([
      loadImage(imageA, canvasARef, imgARef),
      loadImage(imageB, canvasBRef, imgBRef),
    ]);

    return () => {
      canvasARef.current = null;
      canvasBRef.current = null;
      imgARef.current = null;
      imgBRef.current = null;
    };
  }, [imageA, imageB]);

  const getColorAtPixel = useCallback((canvas, img, imgX, imgY) => {
    if (!canvas || !img) return null;

    if (imgX < 0 || imgX >= img.naturalWidth || imgY < 0 || imgY >= img.naturalHeight) {
      return null;
    }

    try {
      const ctx = canvas.getContext('2d');
      const pixel = ctx.getImageData(imgX, imgY, 1, 1).data;
      return {
        r: pixel[0],
        g: pixel[1],
        b: pixel[2],
        a: pixel[3],
      };
    } catch {
      return null;
    }
  }, []);

  // Get color at relative position (0-1), mapping to the image's own dimensions
  const getColorAt = useCallback((canvas, img, relX, relY) => {
    if (!canvas || !img) return null;
    const imgX = Math.floor(relX * img.naturalWidth);
    const imgY = Math.floor(relY * img.naturalHeight);
    return getColorAtPixel(canvas, img, imgX, imgY);
  }, [getColorAtPixel]);

  // Get a 3x3 grid of pixels centered on relative position (0-1)
  const getPixelGrid = useCallback((canvas, img, relX, relY) => {
    if (!canvas || !img) return null;

    const centerX = Math.floor(relX * img.naturalWidth);
    const centerY = Math.floor(relY * img.naturalHeight);

    const grid = [];
    for (let dy = -1; dy <= 1; dy++) {
      const row = [];
      for (let dx = -1; dx <= 1; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        row.push(getColorAtPixel(canvas, img, x, y));
      }
      grid.push(row);
    }
    return grid;
  }, [getColorAtPixel]);

  const handleMouseMove = useCallback((e) => {
    if (!enabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const img = imgARef.current;
    if (!img) return;

    // Calculate how the image is displayed (object-fit: contain behavior)
    const containerAspect = rect.width / rect.height;
    const imageAspect = img.naturalWidth / img.naturalHeight;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (imageAspect > containerAspect) {
      // Image is wider - letterbox top/bottom
      displayWidth = rect.width;
      displayHeight = rect.width / imageAspect;
      offsetX = 0;
      offsetY = (rect.height - displayHeight) / 2;
    } else {
      // Image is taller - letterbox left/right
      displayHeight = rect.height;
      displayWidth = rect.height * imageAspect;
      offsetX = (rect.width - displayWidth) / 2;
      offsetY = 0;
    }

    // Account for zoom/pan transform (origin is center of container)
    // Transform is: translate(pan) scale(zoom) with origin at center
    // To invert: subtract center, subtract pan, divide by zoom, add center
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const untransformedX = (x - centerX - pan.x) / zoom + centerX;
    const untransformedY = (y - centerY - pan.y) / zoom + centerY;

    // Calculate position relative to the actual image (not container)
    const imgX = untransformedX - offsetX;
    const imgY = untransformedY - offsetY;

    // Check if cursor is within the image bounds
    if (imgX < 0 || imgX > displayWidth || imgY < 0 || imgY > displayHeight) {
      setColorA(null);
      setColorB(null);
      setGridA(null);
      setGridB(null);
      return;
    }

    // Calculate relative position (0-1) within the image
    const relX = imgX / displayWidth;
    const relY = imgY / displayHeight;

    // Calculate pixel coordinates (for display, using image A as reference)
    const pixelX = Math.floor(relX * img.naturalWidth);
    const pixelY = Math.floor(relY * img.naturalHeight);

    setPosition({ x: e.clientX, y: e.clientY });
    setImageCoords({ x: pixelX, y: pixelY });

    // Use relative coords so each image maps to its own pixel dimensions
    const cA = getColorAt(canvasARef.current, imgARef.current, relX, relY);
    const cB = getColorAt(canvasBRef.current, imgBRef.current, relX, relY);

    setColorA(cA);
    setColorB(cB);

    // Get 3x3 pixel grids for magnifier
    setGridA(getPixelGrid(canvasARef.current, imgARef.current, relX, relY));
    setGridB(getPixelGrid(canvasBRef.current, imgBRef.current, relX, relY));
  }, [enabled, getColorAt, getPixelGrid, zoom, pan]);

  const handleMouseLeave = useCallback(() => {
    setColorA(null);
    setColorB(null);
    setGridA(null);
    setGridB(null);
  }, []);

  return {
    enabled,
    colorA,
    colorB,
    gridA,
    gridB,
    position,
    imageCoords,
    containerRef,
    handleMouseMove,
    handleMouseLeave,
  };
}

function PixelGrid({ grid, label }) {
  if (!grid) return null;

  const pixelSize = 16;

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[10px] font-medium text-zinc-400 w-3">{label}</span>}
      <div
        className="grid gap-0.5 bg-zinc-800 p-0.5 rounded"
        style={{ gridTemplateColumns: `repeat(3, ${pixelSize}px)` }}
      >
        {grid.flat().map((color, i) => (
          <div
            key={i}
            style={{
              width: pixelSize,
              height: pixelSize,
              backgroundColor: color
                ? `rgb(${color.r}, ${color.g}, ${color.b})`
                : '#27272a',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ColorSwatch({ color, label }) {
  if (!color) return null;

  const bgColor = `rgb(${color.r}, ${color.g}, ${color.b})`;

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[10px] font-medium text-zinc-400 w-3">{label}</span>}
      <div
        className="w-4 h-4 rounded border border-white/20"
        style={{ backgroundColor: bgColor }}
      />
      <div className="flex gap-1 text-[10px] font-mono">
        <span className="text-red-400">{color.r}</span>
        <span className="text-green-400">{color.g}</span>
        <span className="text-blue-400">{color.b}</span>
      </div>
    </div>
  );
}

export function ColorPickerTooltip({ colorA, colorB, gridA, gridB, position, imageCoords }) {
  if (!colorA && !colorB) return null;

  const hasB = colorB || gridB;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x + 16,
        top: position.y + 16,
      }}
    >
      <div className="bg-zinc-900/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-xl border border-zinc-700/50">
        <div className="text-[10px] text-zinc-500 mb-2 font-mono">
          {imageCoords.x}, {imageCoords.y}
        </div>
        {/* Magnifier grids */}
        <div className="flex gap-3 mb-2">
          <PixelGrid grid={gridA} label={hasB ? "A" : null} />
          {hasB && <PixelGrid grid={gridB} label="B" />}
        </div>
        {/* Color values */}
        <div className="flex flex-col gap-1 pt-2 border-t border-zinc-700/50">
          <ColorSwatch color={colorA} label={hasB ? "A" : null} />
          {hasB && <ColorSwatch color={colorB} label="B" />}
        </div>
        {colorA && colorB && (
          <div className="mt-1 pt-1 border-t border-zinc-700/50">
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-zinc-500">Δ</span>
              <span className="font-mono text-zinc-400">
                {Math.abs(colorA.r - colorB.r)}, {Math.abs(colorA.g - colorB.g)}, {Math.abs(colorA.b - colorB.b)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ColorPickerToggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`p-1.5 rounded transition-colors ${
        enabled
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
          : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/80'
      }`}
      title="Color picker (hold to sample)"
    >
      <PipetteIcon className="h-3.5 w-3.5" />
    </button>
  );
}
