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

export function CompareSliderViewer({ currentFolder, currentComparison, bgOption = 'default', showToolbar = true, onNewComparison, colorPickerEnabled = false, sliderVisible = true, onSliderVisibleChange, sharedZoomPan = null, annotationsEnabled = false, annotationsRef = null, annotationsVisible = true }) {
  const [images, setImages] = useState({ A: null, B: null });
  const [imageDims, setImageDims] = useState({ A: null, B: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false); // For fade-in transition
  const containerRef = useRef(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [activeImage, setActiveImage] = useState(null); // 'A' | 'B' | null (null = slider mode)
  const [peekingOther, setPeekingOther] = useState(false); // Tab held to peek other image
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 }); // For baseScale calculation

  // Ref to track activeImage for keyboard handlers (avoids stale closure)
  const activeImageRef = useRef(activeImage);
  activeImageRef.current = activeImage;

  // Reset activeImage when returning to slider mode
  useEffect(() => {
    if (sliderVisible) {
      setActiveImage(null);
    }
  }, [sliderVisible]);

  // Detect if this is a single image mode (from comparison data or missing image B)
  const isSingle = currentComparison?.isSingle || false;

  // When annotations are enabled, ensure we're viewing a specific image (default to A)
  useEffect(() => {
    if (annotationsEnabled && !isSingle && !activeImage) {
      setActiveImage('A');
    }
  }, [annotationsEnabled, isSingle, activeImage]);

  // Determine which image is being viewed/annotated
  // When peeking, we view the other image but still annotate the selected one
  const viewingImage = peekingOther ? (activeImage === 'A' ? 'B' : 'A') : (activeImage || 'A');

  // Track container size with ResizeObserver for baseScale calculation
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate base scale (how much image is scaled by object-fit: contain)
  const baseScale = useMemo(() => {
    if (!containerSize.width || !containerSize.height || !imageDims.A) return 1;
    const containerWidth = containerSize.width;
    const containerHeight = containerSize.height;
    const imageAspect = imageDims.A.width / imageDims.A.height;
    const containerAspect = containerWidth / containerHeight;

    if (imageAspect > containerAspect) {
      // Image is wider than container - width-constrained
      return containerWidth / imageDims.A.width;
    } else {
      // Image is taller than container - height-constrained
      return containerHeight / imageDims.A.height;
    }
  }, [imageDims.A, containerSize]);

  const zoomPan = useZoomPan(imageDims.A, imageDims.B, containerRef, sharedZoomPan);
  const colorPicker = useColorPicker(images.A, images.B, colorPickerEnabled, zoomPan.zoom, zoomPan.pan);
  // Pass activeImage to annotations so it knows which image to annotate
  // Note: annotate the activeImage (not viewingImage) - peeking doesn't change what we're annotating
  const annotations = useAnnotations(annotationsEnabled, zoomPan.zoom, zoomPan.pan, activeImage || 'A', isSingle, sliderVisible, baseScale);

  // Expose annotations to parent via ref for sharing
  useEffect(() => {
    if (annotationsRef) {
      annotationsRef.current = annotations;
    }
  }, [annotationsRef, annotations]);

  // Load/clear annotations when comparison changes
  const prevFolderRef = useRef(null);
  useEffect(() => {
    // Only act when folder actually changes
    if (currentFolder === prevFolderRef.current) return;
    prevFolderRef.current = currentFolder;

    if (currentComparison?.annotations) {
      // Load annotations for this comparison
      // Support both new format { strokes, texts } and old format (strokes directly)
      const ann = currentComparison.annotations;
      if (ann.strokes !== undefined || ann.texts !== undefined) {
        // New format with strokes and texts
        annotations.setStrokes(ann.strokes, ann.texts);
      } else {
        // Old format - strokes directly
        annotations.setStrokes(ann);
      }
    } else {
      // Clear annotations when switching to comparison without annotations
      annotations.clearAll();
    }
  }, [currentFolder, currentComparison?.annotations, annotations.setStrokes, annotations.clearAll]);

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

  // Keyboard shortcuts: 1 = permanently show A, 2 = permanently show B, Tab = peek other, / = slider
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Single image mode: disable 1/2/Tab keys
      if (isSingle) return;

      if (e.key === '1') {
        e.preventDefault();
        setActiveImage('A');
        // Turn off slider when selecting an image
        if (sliderVisible && onSliderVisibleChange) {
          onSliderVisibleChange(false);
        }
      } else if (e.key === '2') {
        e.preventDefault();
        setActiveImage('B');
        // Turn off slider when selecting an image
        if (sliderVisible && onSliderVisibleChange) {
          onSliderVisibleChange(false);
        }
      } else if (e.key === 'Tab') {
        // Always prevent Tab's default focus behavior in comparison mode
        e.preventDefault();
        // Only activate peek if an image is selected and not repeating
        if (activeImageRef.current && !e.repeat) {
          setPeekingOther(true);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setPeekingOther(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSingle, sliderVisible, onSliderVisibleChange]);

  // Handle clicking on image info in toolbar
  const handleImageSelect = (image) => {
    if (isSingle) return;
    setActiveImage(image);
    if (sliderVisible && onSliderVisibleChange) {
      onSliderVisibleChange(false);
    }
  };

  // Determine which image to show when slider is hidden (single image or comparison mode)
  // When peeking (Tab held), show the opposite image
  const getShowingImage = () => {
    if (sliderVisible) return null;
    if (isSingle) return 'A'; // Single image always shows A

    const baseImage = activeImage === 'B' ? 'B' : 'A';
    if (peekingOther) {
      return baseImage === 'A' ? 'B' : 'A';
    }
    return baseImage;
  };
  const showingImage = getShowingImage();

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

      // Check if images are already cached (handle single image mode)
      const isSingleMode = currentComparison.isSingle;
      const isCached = isSingleMode
        ? found.A && isImageCached(found.A)
        : found.A && found.B && isImageCached(found.A) && isImageCached(found.B);

      if (!isCached) {
        setLoading(true);
      }
      setError('');

      // For single image mode, only check for A
      if (isSingleMode && !found.A) {
        setError(`No image found`);
        setImages({ A: null, B: null });
        setLoading(false);
      } else if (!isSingleMode && !found.A && !found.B) {
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
          const imgB = isSingleMode ? null : new Image();
          let loadedCount = 0;
          const expectedCount = isSingleMode ? 1 : 2;
          const onLoad = () => {
            loadedCount++;
            if (loadedCount === expectedCount && !cancelled) {
              setReady(true);
              setLoading(false);
            }
          };
          imgA.onload = onLoad;
          imgA.onerror = onLoad;
          if (imgB) {
            imgB.onload = onLoad;
            imgB.onerror = onLoad;
            imgB.src = found.B;
          }
          imgA.src = found.A;
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

  // For non-single mode, require both images
  if (!isSingle && (!images.A || !images.B)) {
    return (
      <div className="h-full overflow-hidden relative">
        <EmptyState>
          <p className="text-yellow-400">Need both A and B images for comparison</p>
          <p className="my-2">Found: {images.A ? 'A' : ''} {images.B ? 'B' : ''}</p>
        </EmptyState>
      </div>
    );
  }

  // For single image mode, just need image A
  if (isSingle && !images.A) {
    return (
      <div className="h-full overflow-hidden relative">
        <EmptyState>
          <p className="text-yellow-400">No image found</p>
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
          {/* Slider mode (not for single images) */}
          {!isSingle && (
            <div
              className="absolute inset-0"
              style={{
                visibility: sliderVisible ? 'visible' : 'hidden',
                zIndex: sliderVisible ? 10 : 0,
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
          )}
          {/* Single view mode (one image selected, or single image mode) */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              visibility: (isSingle || !sliderVisible) ? 'visible' : 'hidden',
              zIndex: (isSingle || !sliderVisible) ? 1 : 0,
            }}
          >
            <img
              src={images.A}
              alt="Image A"
              className="w-full h-full object-contain"
              style={{
                ...imageStyle,
                opacity: showingImage === 'A' || isSingle ? 1 : 0,
                pointerEvents: 'none',
                position: 'absolute',
              }}
            />
            {!isSingle && images.B && (
              <img
                src={images.B}
                alt="Image B"
                className="w-full h-full object-contain"
                style={{
                  ...imageStyle,
                  opacity: showingImage === 'B' ? 1 : 0,
                  pointerEvents: 'none',
                  position: 'absolute',
                }}
              />
            )}
          </div>
          {showToolbar && <div className="z-40"><ImageInfoToolbar imageA={images.A} imageB={isSingle ? null : images.B} activeImage={(isSingle || !sliderVisible) ? showingImage : null} onImageSelect={!isSingle ? handleImageSelect : undefined} /></div>}
          <div className="absolute top-2 right-2 z-40">
            <ZoomControls
              zoom={zoomPan.zoom}
              zoomMode={zoomPan.zoomMode}
              displayPercentage={zoomPan.displayPercentage}
              onZoomIn={zoomPan.zoomIn}
              onZoomOut={zoomPan.zoomOut}
              onReset={zoomPan.reset}
              onMatchA={zoomPan.matchA}
              onMatchB={isSingle ? null : zoomPan.matchB}
              hasImageA={!!imageDims.A}
              hasImageB={!isSingle && !!imageDims.B}
            />
          </div>
          {/* Slider handle overlay - visual only, sits above annotations */}
          {sliderVisible && !isSingle && !activeImage && (
            <div
              className="absolute inset-0 pointer-events-none z-[27]"
              style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)', width: 0 }}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-px h-full bg-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
                <div className="absolute w-3 h-8 bg-white/90 rounded-full shadow-sm ring-1 ring-black/25" />
              </div>
            </div>
          )}
          <AnnotationOverlay
            annotations={annotations}
            zoom={zoomPan.zoom}
            pan={zoomPan.pan}
            baseScale={baseScale}
            showingImage={showingImage}
            isSliderMode={sliderVisible && !isSingle}
            isSingle={isSingle}
            sliderPosition={sliderPosition}
            visible={annotationsVisible}
          />
          <AnnotationControls annotations={annotations} isSingle={isSingle} />
        </div>
      </div>
      {colorPicker.enabled && (
        <ColorPickerTooltip
          colorA={colorPicker.colorA}
          colorB={isSingle ? null : colorPicker.colorB}
          gridA={colorPicker.gridA}
          gridB={isSingle ? null : colorPicker.gridB}
          position={colorPicker.position}
          imageCoords={colorPicker.imageCoords}
        />
      )}
    </div>
  );
}
