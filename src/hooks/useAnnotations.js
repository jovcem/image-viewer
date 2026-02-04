import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import getStroke from 'perfect-freehand';

const COLORS = ['#ff0000', '#00ff00', '#0088ff', '#ffff00', '#ff00ff', '#ffffff', '#000000'];

function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return '';

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );

  d.push('Z');
  return d.join(' ');
}

// Convert strokes array to SVG paths
function strokesToPaths(strokes) {
  return strokes.map(stroke => {
    const outlinePoints = getStroke(stroke.points, {
      size: stroke.size || 10,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });
    return {
      path: getSvgPathFromStroke(outlinePoints),
      color: stroke.color,
    };
  });
}

export function useAnnotations(enabled, zoom = 1, pan = { x: 0, y: 0 }, activeImage = 'A', isSingle = false, isSliderMode = false) {
  // Store strokes per image: { A: [], B: [] }
  const [strokesPerImage, setStrokesPerImage] = useState({ A: [], B: [] });
  const [currentPoints, setCurrentPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  const [brushSize, setBrushSize] = useState(10);
  const containerRef = useRef(null);

  const color = COLORS[colorIndex];

  // Determine which image we're annotating
  // In single image mode: always A
  // In slider mode: could be either, default to A
  // In single view mode: the active image
  const annotatingImage = isSingle ? 'A' : (activeImage || 'A');

  const getPointInImageSpace = useCallback((e) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Mouse position relative to container center
    const mouseX = e.clientX - rect.left - centerX;
    const mouseY = e.clientY - rect.top - centerY;

    // Convert to image space (reverse the zoom and pan transforms)
    const imageX = (mouseX - pan.x) / zoom + centerX;
    const imageY = (mouseY - pan.y) / zoom + centerY;

    return [imageX, imageY, e.pressure || 0.5];
  }, [zoom, pan]);

  const handlePointerDown = useCallback((e) => {
    if (!enabled) return;
    e.preventDefault();
    setIsDrawing(true);
    const point = getPointInImageSpace(e);
    if (point) {
      setCurrentPoints([point]);
    }
  }, [enabled, getPointInImageSpace]);

  const handlePointerMove = useCallback((e) => {
    if (!enabled || !isDrawing) return;
    const point = getPointInImageSpace(e);
    if (point) {
      setCurrentPoints(prev => [...prev, point]);
    }
  }, [enabled, isDrawing, getPointInImageSpace]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length > 0) {
      // Add stroke to the currently annotating image
      setStrokesPerImage(prev => ({
        ...prev,
        [annotatingImage]: [...prev[annotatingImage], { points: currentPoints, color, size: brushSize }],
      }));
      setCurrentPoints([]);
    }
  }, [isDrawing, currentPoints, color, brushSize, annotatingImage]);

  const clear = useCallback(() => {
    // Clear strokes for current image only
    setStrokesPerImage(prev => ({
      ...prev,
      [annotatingImage]: [],
    }));
    setCurrentPoints([]);
  }, [annotatingImage]);

  const clearAll = useCallback(() => {
    // Clear all strokes
    setStrokesPerImage({ A: [], B: [] });
    setCurrentPoints([]);
  }, []);

  const undo = useCallback(() => {
    // Undo last stroke on current image only
    setStrokesPerImage(prev => ({
      ...prev,
      [annotatingImage]: prev[annotatingImage].slice(0, -1),
    }));
  }, [annotatingImage]);

  const cycleColor = useCallback(() => {
    setColorIndex(prev => (prev + 1) % COLORS.length);
  }, []);

  // Get strokes for current annotating image
  const currentImageStrokes = strokesPerImage[annotatingImage] || [];

  // Generate SVG paths for the currently annotating image's strokes
  const strokePaths = useMemo(() => strokesToPaths(currentImageStrokes), [currentImageStrokes]);

  // Generate paths for both images (for slider mode where both are visible)
  const strokePathsA = useMemo(() => strokesToPaths(strokesPerImage.A), [strokesPerImage.A]);
  const strokePathsB = useMemo(() => strokesToPaths(strokesPerImage.B), [strokesPerImage.B]);

  // Current stroke being drawn
  let currentPath = null;
  if (currentPoints.length > 0) {
    const outlinePoints = getStroke(currentPoints, {
      size: brushSize,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });
    currentPath = {
      path: getSvgPathFromStroke(outlinePoints),
      color,
    };
  }

  // Allow setting strokes from outside (e.g., loading shared annotations)
  const setStrokes = useCallback((strokes) => {
    // If strokes is in new format { A: [], B: [] }, use directly
    // If strokes is in old format [], put all in A for backward compat
    if (strokes && typeof strokes === 'object' && ('A' in strokes || 'B' in strokes)) {
      setStrokesPerImage({
        A: strokes.A || [],
        B: strokes.B || [],
      });
    } else if (Array.isArray(strokes)) {
      // Old format - put all in A
      setStrokesPerImage({ A: strokes, B: [] });
    }
  }, []);

  return {
    enabled,
    strokes: strokesPerImage, // Full { A: [], B: [] } object
    strokePaths, // Paths for current image
    strokePathsA, // Paths for A
    strokePathsB, // Paths for B
    currentPath,
    currentImageStrokes, // Raw strokes for current image
    annotatingImage, // Which image we're currently annotating
    color,
    colors: COLORS,
    colorIndex,
    brushSize,
    isDrawing,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    clear,
    clearAll,
    undo,
    cycleColor,
    setColorIndex,
    setBrushSize,
    setStrokes,
  };
}
