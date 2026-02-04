import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import getStroke from 'perfect-freehand';

const COLORS = ['#ff0000', '#00ff00', '#0088ff', '#ffff00', '#ff00ff', '#ffffff', '#000000'];
const TOOLS = ['draw', 'text'];

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

export function useAnnotations(enabled, zoom = 1, pan = { x: 0, y: 0 }, activeImage = 'A', isSingle = false, isSliderMode = false, baseScale = 1) {
  // Store strokes per image: { A: [], B: [] }
  const [strokesPerImage, setStrokesPerImage] = useState({ A: [], B: [] });
  // Store texts per image: { A: [], B: [] }
  const [textsPerImage, setTextsPerImage] = useState({ A: [], B: [] });
  const [currentPoints, setCurrentPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  const [brushSize, setBrushSize] = useState(10);
  const [tool, setTool] = useState('draw'); // 'draw' or 'text'
  const [fontSize, setFontSize] = useState(24);
  const [pendingText, setPendingText] = useState(null); // { x, y } when placing text
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

    // Convert to image space (reverse the zoom, pan, and baseScale transforms)
    // Store relative to image center (0,0) so annotations stay aligned on resize
    // effectiveScale = zoom * baseScale, so divide by both
    const imageX = (mouseX - pan.x) / zoom / baseScale;
    const imageY = (mouseY - pan.y) / zoom / baseScale;

    return [imageX, imageY, e.pressure || 0.5];
  }, [zoom, pan, baseScale]);

  const handlePointerDown = useCallback((e) => {
    if (!enabled) return;
    e.preventDefault();

    if (tool === 'text') {
      // In text mode, clicking opens text input at that position
      const point = getPointInImageSpace(e);
      if (point) {
        setPendingText({ x: point[0], y: point[1] });
      }
      return;
    }

    // Draw mode
    setIsDrawing(true);
    const point = getPointInImageSpace(e);
    if (point) {
      setCurrentPoints([point]);
    }
  }, [enabled, tool, getPointInImageSpace]);

  const handlePointerMove = useCallback((e) => {
    if (!enabled || !isDrawing || tool === 'text') return;
    const point = getPointInImageSpace(e);
    if (point) {
      setCurrentPoints(prev => [...prev, point]);
    }
  }, [enabled, isDrawing, tool, getPointInImageSpace]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length > 0) {
      // Add stroke to the currently annotating image
      // Compensate brush size by baseScale so visual size is independent of image scaling
      setStrokesPerImage(prev => ({
        ...prev,
        [annotatingImage]: [...prev[annotatingImage], { points: currentPoints, color, size: brushSize / baseScale }],
      }));
      setCurrentPoints([]);
    }
  }, [isDrawing, currentPoints, color, brushSize, annotatingImage, baseScale]);

  const clear = useCallback(() => {
    // Clear strokes and texts for current image only
    setStrokesPerImage(prev => ({
      ...prev,
      [annotatingImage]: [],
    }));
    setTextsPerImage(prev => ({
      ...prev,
      [annotatingImage]: [],
    }));
    setCurrentPoints([]);
    setPendingText(null);
  }, [annotatingImage]);

  const clearAll = useCallback(() => {
    // Clear all strokes and texts
    setStrokesPerImage({ A: [], B: [] });
    setTextsPerImage({ A: [], B: [] });
    setCurrentPoints([]);
    setPendingText(null);
  }, []);

  const undo = useCallback(() => {
    // Undo last annotation (stroke or text) on current image
    const strokes = strokesPerImage[annotatingImage];
    const texts = textsPerImage[annotatingImage];

    // Remove whichever was added last (we track by array length for simplicity)
    // For a more accurate approach, we'd need timestamps, but this works for basic undo
    if (tool === 'text' && texts.length > 0) {
      setTextsPerImage(prev => ({
        ...prev,
        [annotatingImage]: prev[annotatingImage].slice(0, -1),
      }));
    } else if (strokes.length > 0) {
      setStrokesPerImage(prev => ({
        ...prev,
        [annotatingImage]: prev[annotatingImage].slice(0, -1),
      }));
    }
  }, [annotatingImage, tool, strokesPerImage, textsPerImage]);

  const cycleColor = useCallback(() => {
    setColorIndex(prev => (prev + 1) % COLORS.length);
  }, []);

  const confirmText = useCallback((text) => {
    if (!pendingText || !text.trim()) {
      setPendingText(null);
      return;
    }
    // Compensate font size by baseScale so visual size is independent of image scaling
    setTextsPerImage(prev => ({
      ...prev,
      [annotatingImage]: [...prev[annotatingImage], {
        x: pendingText.x,
        y: pendingText.y,
        text: text.trim(),
        color,
        fontSize: fontSize / baseScale,
      }],
    }));
    setPendingText(null);
  }, [pendingText, annotatingImage, color, fontSize, baseScale]);

  const cancelText = useCallback(() => {
    setPendingText(null);
  }, []);

  // Get strokes for current annotating image
  const currentImageStrokes = strokesPerImage[annotatingImage] || [];
  const currentImageTexts = textsPerImage[annotatingImage] || [];

  // Generate SVG paths for the currently annotating image's strokes
  const strokePaths = useMemo(() => strokesToPaths(currentImageStrokes), [currentImageStrokes]);

  // Generate paths for both images (for slider mode where both are visible)
  const strokePathsA = useMemo(() => strokesToPaths(strokesPerImage.A), [strokesPerImage.A]);
  const strokePathsB = useMemo(() => strokesToPaths(strokesPerImage.B), [strokesPerImage.B]);

  // Get texts for both images
  const textsA = textsPerImage.A || [];
  const textsB = textsPerImage.B || [];

  // Current stroke being drawn
  // Compensate brush size by baseScale so visual size is independent of image scaling
  let currentPath = null;
  if (currentPoints.length > 0) {
    const outlinePoints = getStroke(currentPoints, {
      size: brushSize / baseScale,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });
    currentPath = {
      path: getSvgPathFromStroke(outlinePoints),
      color,
    };
  }

  // Allow setting strokes/texts from outside (e.g., loading shared annotations)
  const setStrokes = useCallback((strokes, texts) => {
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
    // Handle texts
    if (texts && typeof texts === 'object' && ('A' in texts || 'B' in texts)) {
      setTextsPerImage({
        A: texts.A || [],
        B: texts.B || [],
      });
    } else if (Array.isArray(texts)) {
      setTextsPerImage({ A: texts, B: [] });
    } else if (!texts) {
      // No texts provided, reset
      setTextsPerImage({ A: [], B: [] });
    }
  }, []);

  return {
    enabled,
    strokes: strokesPerImage, // Full { A: [], B: [] } object
    texts: textsPerImage, // Full { A: [], B: [] } object for texts
    strokePaths, // Paths for current image
    strokePathsA, // Paths for A
    strokePathsB, // Paths for B
    textsA, // Texts for A
    textsB, // Texts for B
    currentPath,
    currentImageStrokes, // Raw strokes for current image
    currentImageTexts, // Texts for current image
    annotatingImage, // Which image we're currently annotating
    tool,
    tools: TOOLS,
    color,
    colors: COLORS,
    colorIndex,
    brushSize,
    fontSize,
    pendingText,
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
    setTool,
    setFontSize,
    confirmText,
    cancelText,
    setStrokes,
  };
}
