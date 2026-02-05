import { useState, useCallback, useEffect, useRef } from 'react';
import { PlayIcon, Columns2Icon, PipetteIcon, BugIcon, PencilIcon, ShareIcon, InfoIcon, LayersIcon, PanelLeftCloseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageDropZone, useImageUrlFetcher, usePasteHandler } from './ImageDropZone';

const adjectives = [
  { tr: 'tatli', en: 'sweet' },
  { tr: 'sicak', en: 'warm' },
  { tr: 'soguk', en: 'cold' },
  { tr: 'guzel', en: 'beautiful' },
  { tr: 'parlak', en: 'bright' },
  { tr: 'mutlu', en: 'happy' },
  { tr: 'taze', en: 'fresh' },
  { tr: 'serin', en: 'cool' },
];

const nouns = [
  { tr: 'kedi', en: 'cat' },
  { tr: 'kus', en: 'bird' },
  { tr: 'bulut', en: 'cloud' },
  { tr: 'yildiz', en: 'star' },
  { tr: 'deniz', en: 'sea' },
  { tr: 'cicek', en: 'flower' },
  { tr: 'gunes', en: 'sun' },
  { tr: 'dalga', en: 'wave' },
];

function generateName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj.tr}-${noun.tr}`;
}

export function QuickCompareForm({ onCompare }) {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [readyToCompare, setReadyToCompare] = useState(false);
  const timerRef = useRef(null);

  const { loading, progress, fetchImageFromUrl } = useImageUrlFetcher();

  usePasteHandler({
    fileA,
    fileB,
    setFileA,
    setFileB,
    hoveredZone,
    fetchImageFromUrl,
  });

  // Track if we have 1 or 2 files
  const hasSingleFile = fileA && !fileB;
  const hasBothFiles = fileA && fileB;

  // Start countdown when both files are added
  useEffect(() => {
    if (hasBothFiles && !readyToCompare) {
      setReadyToCompare(true);
      setCountdown(2);
    } else if (!hasBothFiles && readyToCompare) {
      setReadyToCompare(false);
      setCountdown(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [hasBothFiles, readyToCompare]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      startCompare();
      return;
    }

    timerRef.current = setTimeout(() => {
      setCountdown(c => c !== null ? c - 1 : null);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [countdown]);

  const cancelCountdown = useCallback(() => {
    setCountdown(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const startCompare = useCallback(() => {
    if (!fileA || !fileB) return;

    const comparison = {
      id: `local_${Date.now()}`,
      name: generateName(),
      isLocal: true,
      images: {
        A: { name: fileA.name, url: URL.createObjectURL(fileA) },
        B: { name: fileB.name, url: URL.createObjectURL(fileB) },
      },
    };
    onCompare?.(comparison);
    setCountdown(null);
  }, [fileA, fileB, onCompare]);

  const startSingleView = useCallback(() => {
    if (!fileA) return;

    const comparison = {
      id: `single_${Date.now()}`,
      name: generateName(),
      isLocal: true,
      isSingle: true,
      images: {
        A: { name: fileA.name, url: URL.createObjectURL(fileA) },
        B: null,
      },
    };
    onCompare?.(comparison);
  }, [fileA, onCompare]);

  return (
    <div className="flex items-center justify-center h-full overflow-auto">
      <div className="flex flex-col items-center gap-8 p-8 pt-32 my-auto">
        <div className="flex gap-8">
          <div
            onMouseEnter={() => setHoveredZone('A')}
            onMouseLeave={() => setHoveredZone(null)}
          >
            <ImageDropZone
              label="A"
              file={fileA}
              onDrop={setFileA}
              onClear={() => setFileA(null)}
              isHovered={hoveredZone === 'A'}
              isLoading={loading.A}
              loadingProgress={progress.A}
              size="large"
            />
          </div>
          <div
            onMouseEnter={() => setHoveredZone('B')}
            onMouseLeave={() => setHoveredZone(null)}
          >
            <ImageDropZone
              label="B"
              file={fileB}
              onDrop={setFileB}
              onClear={() => setFileB(null)}
              isHovered={hoveredZone === 'B'}
              isLoading={loading.B}
              loadingProgress={progress.B}
              size="large"
            />
          </div>
        </div>
        <div className="text-center">
          {readyToCompare ? (
            countdown !== null ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">Opening compare in {countdown}...</p>
                <Button variant="outline" size="sm" onClick={cancelCountdown}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">Ready to compare</p>
                <Button onClick={startCompare} className="gap-2">
                  <PlayIcon className="h-4 w-4" />
                  Start Compare
                </Button>
              </div>
            )
          ) : hasSingleFile ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">Single image ready</p>
              <Button onClick={startSingleView} className="gap-2">
                <PlayIcon className="h-4 w-4" />
                View Single
              </Button>
              <p className="text-xs text-muted-foreground">Or add a second image to compare</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Add a single image to view, or two images to compare.</p>
              <p className="text-sm text-muted-foreground">Annotate, zoom, and share your comparisons.</p>
            </>
          )}
        </div>

        {/* Controls tutorial */}
        <div className="mt-4 pt-6 border-t border-border w-full max-w-lg">
          <h3 className="text-xs font-medium text-muted-foreground mb-5 text-center uppercase tracking-wide">Controls</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Zoom</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Scroll</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pan</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Space + Drag</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Show Image A</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">1</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Show Image B</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">2</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peek other image</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Tab</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slider mode</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">/</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Predator View</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">3</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Annotations</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">4</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next comparison</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">&gt;</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prev comparison</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">&lt;</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Select comparison</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">A-Z</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Toggle sidebar</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">[ ]</kbd>
            </div>
          </div>
        </div>

        {/* Features guide */}
        <div className="mt-4 pt-6 border-t border-border w-full max-w-lg">
          <h3 className="text-xs font-medium text-muted-foreground mb-5 text-center uppercase tracking-wide">Features</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs">
            <div className="flex items-start gap-2">
              <Columns2Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Slider</span>
                <p className="text-muted-foreground">Toggle compare slider on/off</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <PipetteIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Color Picker</span>
                <p className="text-muted-foreground">Sample colors from images</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BugIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Predator View</span>
                <p className="text-muted-foreground">Heat map difference view</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <PencilIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Annotate</span>
                <p className="text-muted-foreground">Draw on images</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShareIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Share</span>
                <p className="text-muted-foreground">Share comparison via link</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <InfoIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Info Bar</span>
                <p className="text-muted-foreground">Show/hide image info toolbar</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <LayersIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Annotations</span>
                <p className="text-muted-foreground">Show/hide drawn annotations</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <PanelLeftCloseIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Sidebar</span>
                <p className="text-muted-foreground">Collapse/expand sidebar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
