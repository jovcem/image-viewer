import { useState, useCallback, useRef, useEffect } from 'react';
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

export function useAnnotations(enabled, zoom = 1, pan = { x: 0, y: 0 }) {
  const [strokes, setStrokes] = useState([]);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  const [brushSize, setBrushSize] = useState(10);
  const containerRef = useRef(null);

  const color = COLORS[colorIndex];

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
      setStrokes(prev => [...prev, { points: currentPoints, color, size: brushSize }]);
      setCurrentPoints([]);
    }
  }, [isDrawing, currentPoints, color, brushSize]);

  const clear = useCallback(() => {
    setStrokes([]);
    setCurrentPoints([]);
  }, []);

  const undo = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));
  }, []);

  const cycleColor = useCallback(() => {
    setColorIndex(prev => (prev + 1) % COLORS.length);
  }, []);

  // Generate SVG paths for all strokes
  const strokePaths = strokes.map(stroke => {
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

  return {
    enabled,
    strokes,
    strokePaths,
    currentPath,
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
    undo,
    cycleColor,
    setColorIndex,
    setBrushSize,
  };
}
