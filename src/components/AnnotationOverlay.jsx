import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Text input component for placing text annotations
function TextInput({ x, y, effectiveScale, pan, onConfirm, onCancel, color, fontSize }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onConfirm(text);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  // Calculate screen position from image space coordinates (relative to center)
  const screenX = x * effectiveScale + pan.x + window.innerWidth / 2;
  const screenY = y * effectiveScale + pan.y + window.innerHeight / 2;

  return (
    <div
      className="absolute z-50"
      style={{
        left: screenX,
        top: screenY,
        transform: 'translate(-4px, -50%)',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onConfirm(text)}
          className="bg-transparent border border-white/30 rounded-lg px-3 py-2 outline-none focus:border-white/50 transition-all duration-200"
          style={{
            color: color,
            fontSize: `${Math.max(14, fontSize * 0.6)}px`,
            minWidth: '140px',
          }}
        />
        <div className="absolute -bottom-5 left-0 text-[10px] text-white/40">
          Enter to confirm · Esc to cancel
        </div>
      </div>
    </div>
  );
}

export function AnnotationOverlay({ annotations, zoom, pan, baseScale = 1, containerRef, showingImage = null, isSliderMode = false, isSingle = false, sliderPosition = 50, visible = true }) {
  // Hide all strokes when visibility is off
  if (!visible) {
    return null;
  }

  const { strokePaths, strokePathsA, strokePathsB, textsA, textsB, currentPath, enabled, annotatingImage, pendingText, confirmText, cancelText, color, fontSize } = annotations;

  // Combined scale: user zoom * responsive base scale
  const effectiveScale = zoom * baseScale;

  // Determine which stroke paths to show:
  // - Single image mode: only A
  // - Slider mode: show both A and B with clip paths
  // - Single view mode: show strokes for the image being shown
  const getPathsToRender = () => {
    if (isSingle) {
      return strokePathsA;
    }
    if (isSliderMode) {
      // Will render separately with clip paths
      return null;
    }
    // Single view mode - show strokes for the viewed image
    return showingImage === 'B' ? strokePathsB : strokePathsA;
  };

  const getTextsToRender = () => {
    if (isSingle) {
      return textsA;
    }
    if (isSliderMode) {
      return null;
    }
    return showingImage === 'B' ? textsB : textsA;
  };

  const pathsToRender = getPathsToRender();
  const textsToRender = getTextsToRender();

  // In slider mode, render A and B separately with clip paths
  if (isSliderMode) {
    const hasContent = enabled || strokePathsA.length > 0 || strokePathsB.length > 0 || textsA.length > 0 || textsB.length > 0 || currentPath || pendingText;
    if (!hasContent) {
      return null;
    }

    return (
      <>
        {/* A strokes/texts - clipped to left of slider */}
        <div
          className="absolute inset-0 pointer-events-none z-[26]"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <svg style={{ width: '100%', height: '100%' }}>
            <g style={{
              transform: `translate(calc(50% + ${pan.x}px), calc(50% + ${pan.y}px)) scale(${effectiveScale})`,
              transformOrigin: '0 0',
            }}>
              {strokePathsA.map((stroke, i) => (
                <path key={`a-${i}`} d={stroke.path} fill={stroke.color}
                  strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {textsA.map((t, i) => (
                <text key={`ta-${i}`} x={t.x} y={t.y} fill={t.color}
                  fontSize={t.fontSize} fontFamily="system-ui, sans-serif" fontWeight="500"
                  style={{ userSelect: 'none' }}>
                  {t.text}
                </text>
              ))}
            </g>
          </svg>
        </div>
        {/* B strokes/texts - clipped to right of slider */}
        <div
          className="absolute inset-0 pointer-events-none z-[26]"
          style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
        >
          <svg style={{ width: '100%', height: '100%' }}>
            <g style={{
              transform: `translate(calc(50% + ${pan.x}px), calc(50% + ${pan.y}px)) scale(${effectiveScale})`,
              transformOrigin: '0 0',
            }}>
              {strokePathsB.map((stroke, i) => (
                <path key={`b-${i}`} d={stroke.path} fill={stroke.color}
                  strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {textsB.map((t, i) => (
                <text key={`tb-${i}`} x={t.x} y={t.y} fill={t.color}
                  fontSize={t.fontSize} fontFamily="system-ui, sans-serif" fontWeight="500"
                  style={{ userSelect: 'none' }}>
                  {t.text}
                </text>
              ))}
            </g>
          </svg>
        </div>
        {/* Current path being drawn - no clipping */}
        {currentPath && (
          <svg className="absolute inset-0 pointer-events-none z-[26]"
            style={{ width: '100%', height: '100%' }}>
            <g style={{
              transform: `translate(calc(50% + ${pan.x}px), calc(50% + ${pan.y}px)) scale(${effectiveScale})`,
              transformOrigin: '0 0',
            }}>
              <path d={currentPath.path} fill={currentPath.color}
                strokeLinejoin="round" strokeLinecap="round" />
            </g>
          </svg>
        )}
        {/* Text input for pending text */}
        {pendingText && (
          <TextInput
            x={pendingText.x}
            y={pendingText.y}
            effectiveScale={effectiveScale}
            pan={pan}
            onConfirm={confirmText}
            onCancel={cancelText}
            color={color}
            fontSize={fontSize}
          />
        )}
      </>
    );
  }

  const hasContent = enabled || pathsToRender.length > 0 || textsToRender.length > 0 || currentPath || pendingText;
  if (!hasContent) {
    return null;
  }

  return (
    <>
      <svg
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <g
          style={{
            transform: `translate(calc(50% + ${pan.x}px), calc(50% + ${pan.y}px)) scale(${effectiveScale})`,
            transformOrigin: '0 0',
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
          {textsToRender.map((t, i) => (
            <text
              key={`t-${i}`}
              x={t.x}
              y={t.y}
              fill={t.color}
              fontSize={t.fontSize}
              fontFamily="system-ui, sans-serif"
              fontWeight="500"
              style={{ userSelect: 'none' }}
            >
              {t.text}
            </text>
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
      {/* Text input for pending text */}
      {pendingText && (
        <TextInput
          x={pendingText.x}
          y={pendingText.y}
          effectiveScale={effectiveScale}
          pan={pan}
          onConfirm={confirmText}
          onCancel={cancelText}
          color={color}
          fontSize={fontSize}
        />
      )}
    </>
  );
}

export function AnnotationControls({ annotations, isSingle = false }) {
  const { enabled, color, colors, colorIndex, setColorIndex, clear, undo, currentImageStrokes, currentImageTexts, brushSize, setBrushSize, fontSize, setFontSize, tool, setTool, annotatingImage } = annotations;

  if (!enabled) return null;

  // Stop propagation to prevent annotation drawing when interacting with controls
  const stopProp = (e) => e.stopPropagation();

  const hasAnnotations = currentImageStrokes.length > 0 || currentImageTexts.length > 0;

  return (
    <div
      className="absolute bottom-16 right-4 z-40 bg-zinc-900/90 backdrop-blur-sm rounded-lg p-2 border border-zinc-700/50 flex flex-col gap-2"
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
      {/* Tool selection */}
      <div className="flex items-center gap-1 pb-1 border-b border-zinc-700/50">
        <button
          onClick={() => setTool('draw')}
          className={cn(
            "px-2 py-1 text-[10px] rounded transition-colors",
            tool === 'draw' ? "bg-zinc-700 text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
          )}
        >
          Draw
        </button>
        <button
          onClick={() => setTool('text')}
          className={cn(
            "px-2 py-1 text-[10px] rounded transition-colors",
            tool === 'text' ? "bg-zinc-700 text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
          )}
        >
          Text
        </button>
      </div>
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
          disabled={!hasAnnotations}
          className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Undo
        </button>
        <button
          onClick={clear}
          disabled={!hasAnnotations}
          className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>
      {/* Size controls - brush size for draw, font size for text */}
      {tool === 'draw' ? (
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
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">Font</span>
          <input
            type="range"
            min="12"
            max="72"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-400"
          />
          <span className="text-[10px] text-zinc-400 w-5 text-right">{fontSize}</span>
        </div>
      )}
    </div>
  );
}
