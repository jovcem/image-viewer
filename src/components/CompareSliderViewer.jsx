import { useState, useEffect, useRef, useMemo } from 'react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { EmptyState } from './EmptyState';
import { ImageInfoToolbar } from './ImageInfoToolbar';
import { QuickCompareForm } from './QuickCompareForm';
import { useColorPicker, ColorPickerTooltip } from './ColorPicker';
import { useZoomPan, ZoomControls } from './ZoomPan';
import { useAnnotations } from '@/hooks/useAnnotations';
import { AnnotationOverlay, AnnotationControls } from './AnnotationOverlay';
import { isImageCached, getImageUrls, getCachedImage } from '@/hooks/useImageCache';
import { cn } from '@/lib/utils';

function MinimalHandle() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-px h-full bg-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
      <div className="absolute w-3 h-8 bg-white/90 rounded-full shadow-sm ring-1 ring-black/25 cursor-ew-resize" />
    </div>
  );
}

const bgClassMap = {
  default: 'bg-background',
  black: 'bg-black',
  white: 'bg-white',
  checked: 'bg-checked',
  grey: 'bg-neutral-500',
  bordered: 'bg-white',
};

export function CompareSliderViewer({ currentFolder, currentComparison, bgOption = 'default', showToolbar = true, onNewComparison, colorPickerEnabled = false, sliderVisible = true, sharedZoomPan = null, annotationsEnabled = false }) {
  const [images, setImages] = useState({ A: null, B: null });
  const [imageDims, setImageDims] = useState({ A: null, B: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false); // For fade-in transition
  const containerRef = useRef(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [activeImage, setActiveImage] = useState(null); // Local state for instant response

  const zoomPan = useZoomPan(imageDims.A, imageDims.B, containerRef, sharedZoomPan);
  const colorPicker = useColorPicker(images.A, images.B, colorPickerEnabled, zoomPan.zoom, zoomPan.pan);
  const annotations = useAnnotations(annotationsEnabled, zoomPan.zoom, zoomPan.pan);

  // Load image dimensions when images change
  useEffect(() => {
    if (!images.A && !images.B) {
      setImageDims({ A: null, B: null });
      return;
    }

    const loadDims = (src) => {
      return new Promise((resolve) => {
        if (!src) {
          resolve(null);
          return;
        }
        // Use cached image if available
        const cached = getCachedImage(src);
        if (cached) {
          resolve({ width: cached.naturalWidth, height: cached.naturalHeight });
          return;
        }
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    Promise.all([loadDims(images.A), loadDims(images.B)]).then(([dimsA, dimsB]) => {
      setImageDims({ A: dimsA, B: dimsB });
    });
  }, [images.A, images.B]);

  // Keyboard shortcuts: 1 = show A, 2 = show B
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '1') {
        setActiveImage('A');
      } else if (e.key === '2') {
        setActiveImage('B');
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === '1' || e.key === '2') {
        setActiveImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Determine which image to show when slider is hidden (single image mode)
  const showingImage = !sliderVisible ? (activeImage === 'B' ? 'B' : 'A') : null;

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
      // Use shared URL cache - avoids duplicate HEAD requests
      const found = await getImageUrls(
        currentComparison.folder,
        currentComparison.isLocal ? currentComparison : null
      );

      if (cancelled) return;

      // Check if images are already cached
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
        // Small delay for fade-in effect, skip if cached
        if (isCached) {
          setReady(true);
          setLoading(false);
        } else {
          // Wait for images to actually load in DOM
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
        <QuickCompareForm onCompare={onNewComparison} />
      </div>
    );
  }

  if (loading && !images.A && !images.B) {
    return (
      <div className="h-full overflow-hidden relative">
        <EmptyState>
          <p>Loading images...</p>
        </EmptyState>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-hidden relative">
        <EmptyState>
          <p className="text-red-400">{error}</p>
          <p className="my-2">Expected: A.png/jpg and B.png/jpg</p>
        </EmptyState>
      </div>
    );
  }

  if (!images.A || !images.B) {
    return (
      <div className="h-full overflow-hidden relative">
        <EmptyState>
          <p className="text-yellow-400">Need both A and B images for comparison</p>
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
            colorPicker.containerRef.current = el;
            annotations.containerRef.current = el;
            zoomPan.setContainerRef(el);
          }}
          className={cn(
            "h-full w-full relative overflow-hidden",
            isBordered && "rounded-xl bg-white",
            annotations.enabled && !zoomPan.isSpaceHeld && "cursor-crosshair",
            colorPicker.enabled && !annotations.enabled && !zoomPan.isSpaceHeld && "cursor-crosshair",
            zoomPan.isSpaceHeld && !zoomPan.isPanning && "cursor-grab",
            zoomPan.isPanning && "cursor-grabbing"
          )}
          onMouseMove={(e) => {
            colorPicker.handleMouseMove(e);
            zoomPan.handleMouseMove(e);
            annotations.handlePointerMove(e);
          }}
          onMouseLeave={colorPicker.handleMouseLeave}
          onMouseDown={(e) => {
            if (annotations.enabled && !zoomPan.isSpaceHeld) {
              annotations.handlePointerDown(e);
            } else {
              zoomPan.handleMouseDown(e);
            }
          }}
          onAuxClick={(e) => e.preventDefault()}
          onMouseUp={(e) => {
            zoomPan.handleMouseUp(e);
            annotations.handlePointerUp(e);
          }}
        >
          {/* Slider mode */}
          <div
            className="absolute inset-0"
            style={{
              visibility: sliderVisible ? 'visible' : 'hidden',
              zIndex: sliderVisible ? 1 : 0,
            }}
          >
            <ReactCompareSlider
              itemOne={
                <ReactCompareSliderImage
                  src={images.A}
                  alt="Image A"
                  style={imageStyle}
                />
              }
              itemTwo={
                <ReactCompareSliderImage
                  src={images.B}
                  alt="Image B"
                  style={imageStyle}
                />
              }
              handle={!activeImage ? <MinimalHandle /> : <div />}
              position={activeImage === 'A' ? 100 : activeImage === 'B' ? 0 : sliderPosition}
              onPositionChange={(pos) => {
                if (!activeImage) setSliderPosition(pos);
              }}
              style={{
                height: '100%',
                width: '100%',
                pointerEvents: zoomPan.isSpaceHeld || activeImage ? 'none' : 'auto',
              }}
            />
          </div>
          {/* Single image mode */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              visibility: !sliderVisible ? 'visible' : 'hidden',
              zIndex: !sliderVisible ? 1 : 0,
            }}
          >
            <img
              src={images.A}
              alt="Image A"
              className="absolute max-w-full max-h-full"
              style={{
                ...imageStyle,
                opacity: showingImage === 'A' ? 1 : 0,
                pointerEvents: 'none',
              }}
            />
            <img
              src={images.B}
              alt="Image B"
              className="absolute max-w-full max-h-full"
              style={{
                ...imageStyle,
                opacity: showingImage === 'B' ? 1 : 0,
                pointerEvents: 'none',
              }}
            />
          </div>
          {showToolbar && <ImageInfoToolbar imageA={images.A} imageB={images.B} activeImage={!sliderVisible ? showingImage : null} />}
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
              hasImageA={!!imageDims.A}
              hasImageB={!!imageDims.B}
            />
          </div>
          <AnnotationOverlay
            annotations={annotations}
            zoom={zoomPan.zoom}
            pan={zoomPan.pan}
          />
          <AnnotationControls annotations={annotations} />
        </div>
      </div>
      {colorPicker.enabled && (
        <ColorPickerTooltip
          colorA={colorPicker.colorA}
          colorB={colorPicker.colorB}
          gridA={colorPicker.gridA}
          gridB={colorPicker.gridB}
          position={colorPicker.position}
          imageCoords={colorPicker.imageCoords}
        />
      )}
    </div>
  );
}
