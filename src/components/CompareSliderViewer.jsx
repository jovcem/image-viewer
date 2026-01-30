import { useState, useEffect, useRef } from 'react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { EmptyState } from './EmptyState';
import { ImageInfoToolbar } from './ImageInfoToolbar';
import { QuickCompareForm } from './QuickCompareForm';
import { useColorPicker, ColorPickerTooltip } from './ColorPicker';
import { useZoomPan, ZoomControls } from './ZoomPan';
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

async function findImages(folderName) {
  const extensions = ['png', 'jpg', 'jpeg', 'exr', 'hdr'];
  const images = { A: null, B: null };

  for (const ext of extensions) {
    if (!images.A) {
      const aUrl = `/images/${folderName}/A.${ext}`;
      try {
        const resp = await fetch(aUrl, { method: 'HEAD' });
        const contentType = resp.headers.get('content-type') || '';
        if (resp.ok && contentType.startsWith('image/')) {
          images.A = aUrl;
        }
      } catch {}
    }
    if (!images.B) {
      const bUrl = `/images/${folderName}/B.${ext}`;
      try {
        const resp = await fetch(bUrl, { method: 'HEAD' });
        const contentType = resp.headers.get('content-type') || '';
        if (resp.ok && contentType.startsWith('image/')) {
          images.B = bUrl;
        }
      } catch {}
    }
    if (images.A && images.B) break;
  }

  return images;
}

export function CompareSliderViewer({ currentFolder, currentComparison, bgOption = 'default', showToolbar = true, onNewComparison, colorPickerEnabled = false }) {
  const [images, setImages] = useState({ A: null, B: null });
  const [imageDims, setImageDims] = useState({ A: null, B: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef(null);

  const colorPicker = useColorPicker(images.A, images.B, colorPickerEnabled);
  const zoomPan = useZoomPan(imageDims.A, imageDims.B, containerRef);

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

  // Reset zoom when switching comparisons
  useEffect(() => {
    zoomPan.reset();
  }, [currentFolder]);

  useEffect(() => {
    if (!currentFolder || !currentComparison) {
      setImages({ A: null, B: null });
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      let found;

      if (currentComparison.isLocal) {
        found = {
          A: currentComparison.images.A.url,
          B: currentComparison.images.B.url,
        };
      } else {
        found = await findImages(currentComparison.folder);
      }

      if (cancelled) return;

      if (!found.A && !found.B) {
        setError(`No A or B images found in "${currentFolder}"`);
        setImages({ A: null, B: null });
      } else {
        setImages(found);
      }
      setLoading(false);
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

  if (loading) {
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

  const imageStyle = {
    transform: zoomPan.transform,
    transformOrigin: 'center center',
    transition: zoomPan.isPanning ? 'none' : 'transform 0.1s ease-out',
    objectFit: 'contain',
  };

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
          }}
          className={cn(
            "h-full w-full relative overflow-hidden",
            isBordered && "rounded-xl bg-white",
            colorPicker.enabled && !zoomPan.isSpaceHeld && "cursor-crosshair",
            zoomPan.isSpaceHeld && !zoomPan.isPanning && "cursor-grab",
            zoomPan.isPanning && "cursor-grabbing"
          )}
          onMouseMove={(e) => {
            colorPicker.handleMouseMove(e);
            zoomPan.handleMouseMove(e);
          }}
          onMouseLeave={colorPicker.handleMouseLeave}
          onWheel={zoomPan.handleWheel}
          onMouseDown={zoomPan.handleMouseDown}
          onAuxClick={(e) => e.preventDefault()}
          onMouseUp={zoomPan.handleMouseUp}
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
            handle={<MinimalHandle />}
            style={{
              height: '100%',
              width: '100%',
              pointerEvents: zoomPan.isSpaceHeld ? 'none' : 'auto',
            }}
          />
          {showToolbar && <ImageInfoToolbar imageA={images.A} imageB={images.B} />}
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
        </div>
      </div>
      {colorPicker.enabled && (
        <ColorPickerTooltip
          colorA={colorPicker.colorA}
          colorB={colorPicker.colorB}
          position={colorPicker.position}
          imageCoords={colorPicker.imageCoords}
        />
      )}
    </div>
  );
}
