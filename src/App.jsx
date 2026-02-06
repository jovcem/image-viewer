import { useState, useEffect, useCallback, useRef } from 'react';
import { useFolders } from '@/hooks/useFolders';
import { useTheme } from '@/hooks/useTheme';
import { useImageCache } from '@/hooks/useImageCache';
import { useShare } from '@/hooks/useShare';
import { AppSidebar } from '@/components/AppSidebar';
import { CompareSliderViewer } from '@/components/CompareSliderViewer';
import { PredatorView } from '@/components/PredatorView';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export function App() {
  const { folders, folderImages, loading, refetch } = useFolders();
  const { theme, toggleTheme } = useTheme();
  const { shareComparison, loadSharedComparison, sharing, uploadProgress, isConfigured: shareConfigured } = useShare();
  const [currentFolder, setCurrentFolder] = useState(null);
  const [viewMode, setViewMode] = useState('slider');
  const [localComparisons, setLocalComparisons] = useState([]);
  const [sharedLoadError, setSharedLoadError] = useState(null);
  const annotationsRef = useRef(null);
  const shareLoadedRef = useRef(null);
  const prevFolderRef = useRef(null);
  const [comparisonAnnotations, setComparisonAnnotations] = useState({}); // { [compId]: { strokes: { A: [], B: [] }, texts: { A: [], B: [] } } }
  const [bgOption, setBgOption] = useState(() => {
    return localStorage.getItem('viewer-bg-option') || 'default';
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar-open');
    return saved !== null ? saved === 'true' : true;
  });
  const [showToolbar, setShowToolbar] = useState(() => {
    const saved = localStorage.getItem('show-toolbar');
    return saved !== null ? saved === 'true' : true;
  });
  const [colorPickerEnabled, setColorPickerEnabled] = useState(() => {
    const saved = localStorage.getItem('color-picker-enabled');
    return saved === 'true';
  });
  const [sliderVisible, setSliderVisible] = useState(() => {
    const saved = localStorage.getItem('slider-visible');
    return saved !== null ? saved === 'true' : true;
  });
  const [annotationsEnabled, setAnnotationsEnabled] = useState(false);
  const [annotationsVisible, setAnnotationsVisible] = useState(() => {
    const saved = localStorage.getItem('annotations-visible');
    return saved !== null ? saved === 'true' : true;
  });

  // Shared zoom/pan state across all viewers
  const [sharedZoom, setSharedZoom] = useState(1);
  const [sharedPan, setSharedPan] = useState({ x: 0, y: 0 });
  const [sharedZoomMode, setSharedZoomMode] = useState('fit');

  const sharedZoomPan = {
    zoom: sharedZoom,
    setZoom: setSharedZoom,
    pan: sharedPan,
    setPan: setSharedPan,
    zoomMode: sharedZoomMode,
    setZoomMode: setSharedZoomMode,
  };

  // Preload images for smoother navigation
  useImageCache(folders, localComparisons, currentFolder);

  // Save annotations when switching comparisons
  useEffect(() => {
    const prevFolder = prevFolderRef.current;

    // Save annotations from previous comparison
    if (prevFolder && annotationsRef.current) {
      const strokes = annotationsRef.current.strokes;
      const texts = annotationsRef.current.texts;
      // Only save if there are actual annotations
      const hasStrokes = strokes?.A?.length > 0 || strokes?.B?.length > 0;
      const hasTexts = texts?.A?.length > 0 || texts?.B?.length > 0;
      if (hasStrokes || hasTexts) {
        setComparisonAnnotations(prev => ({
          ...prev,
          [prevFolder]: { strokes, texts },
        }));
      }
    }

    prevFolderRef.current = currentFolder;
  }, [currentFolder]);

  const handleColorPickerToggle = () => {
    const newValue = !colorPickerEnabled;
    setColorPickerEnabled(newValue);
    localStorage.setItem('color-picker-enabled', String(newValue));
  };

  const handleSliderVisibleToggle = useCallback(() => {
    setSliderVisible(prev => {
      const newValue = !prev;
      localStorage.setItem('slider-visible', String(newValue));
      // When enabling slider, disable annotations
      if (newValue) {
        setAnnotationsEnabled(false);
      }
      return newValue;
    });
  }, []);

  const handleSliderVisibleChange = useCallback((visible) => {
    setSliderVisible(visible);
    localStorage.setItem('slider-visible', String(visible));
  }, []);

  const handleAnnotationsToggle = useCallback(() => {
    setAnnotationsEnabled(prev => {
      const newValue = !prev;
      // When enabling annotations, disable slider for better annotation experience
      if (newValue && sliderVisible) {
        setSliderVisible(false);
        localStorage.setItem('slider-visible', 'false');
      }
      // When enabling annotations, also make them visible
      if (newValue && !annotationsVisible) {
        setAnnotationsVisible(true);
        localStorage.setItem('annotations-visible', 'true');
      }
      return newValue;
    });
  }, [sliderVisible, annotationsVisible]);

  const handleAnnotationsVisibleToggle = useCallback(() => {
    setAnnotationsVisible(prev => {
      const newValue = !prev;
      localStorage.setItem('annotations-visible', String(newValue));
      return newValue;
    });
  }, []);

  const handleSidebarOpenChange = (open) => {
    setSidebarOpen(open);
    localStorage.setItem('sidebar-open', String(open));
  };

  const handleShowToolbarChange = (show) => {
    setShowToolbar(show);
    localStorage.setItem('show-toolbar', String(show));
  };

  const handleBgOptionChange = (option) => {
    setBgOption(option);
    localStorage.setItem('viewer-bg-option', option);
  };

  const resetZoom = useCallback(() => {
    setSharedZoom(1);
    setSharedPan({ x: 0, y: 0 });
    setSharedZoomMode('fit');
  }, []);

  const handleNewComparison = useCallback((comparison) => {
    setLocalComparisons(prev => [...prev, comparison]);
    setCurrentFolder(comparison.id);
    resetZoom();
  }, [resetZoom]);

  // Load a parent share (previous version)
  const handleLoadParent = useCallback(async (parentId, depth = 1) => {
    // Check if already loaded
    const existingId = `shared-${parentId}`;
    const existing = localComparisons.find(c => c.id === existingId);
    if (existing) {
      setCurrentFolder(existingId);
      resetZoom();
      return;
    }

    try {
      const shared = await loadSharedComparison(parentId);
      // Strip any existing depth prefix from the name before adding new one
      const baseName = (shared.name || (shared.isSingle ? 'Shared Image' : 'Shared Comparison')).replace(/^-\d+ /, '');
      const comparison = {
        id: `shared-${shared.id}`,
        name: `-${depth} ${baseName}`,
        isLocal: true,
        isSingle: shared.isSingle,
        images: {
          A: { name: 'A', url: shared.imageA },
          B: shared.isSingle ? null : { name: 'B', url: shared.imageB },
        },
        isShared: true,
        annotations: shared.annotations,
        sourceShareId: shared.id,
        parentId: shared.parentId,
      };
      setLocalComparisons(prev => [comparison, ...prev]);
      setCurrentFolder(comparison.id);
      resetZoom();
    } catch (err) {
      console.error('Failed to load parent comparison:', err);
    }
  }, [localComparisons, loadSharedComparison, resetZoom]);

  // Sidebar click resets zoom, keyboard navigation preserves it
  const handleFolderSelect = useCallback((folder) => {
    setCurrentFolder(folder);
    resetZoom();
  }, [resetZoom]);

  // Get current comparison data (either from server folders or local)
  const getCurrentComparison = () => {
    if (!currentFolder) return null;

    // Get stored annotations for this comparison (user edits take precedence)
    const storedAnnotations = comparisonAnnotations[currentFolder] || null;

    const localComp = localComparisons.find(c => c.id === currentFolder);
    if (localComp) {
      return {
        isLocal: true,
        isSingle: localComp.isSingle || false,
        images: localComp.images,
        // Use stored annotations, fall back to shared comparison annotations
        annotations: storedAnnotations || localComp.annotations || null,
      };
    }

    return {
      isLocal: false,
      isSingle: false,
      folder: currentFolder,
      annotations: storedAnnotations,
    };
  };

  const currentComparison = getCurrentComparison();

  // Load shared comparison from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');

    // Skip if no share ID, not configured, or already loaded this share
    if (!shareId || !shareConfigured || shareLoadedRef.current === shareId) {
      return;
    }

    // Mark as loading to prevent duplicate loads (React StrictMode)
    shareLoadedRef.current = shareId;

    loadSharedComparison(shareId)
      .then((shared) => {
        // Create a local comparison from the shared data
        const comparison = {
          id: `shared-${shared.id}`,
          name: shared.name || (shared.isSingle ? 'Shared Image' : 'Shared Comparison'),
          isLocal: true,
          isSingle: shared.isSingle,
          images: {
            A: { name: 'A', url: shared.imageA },
            B: shared.isSingle ? null : { name: 'B', url: shared.imageB },
          },
          isShared: true,
          annotations: shared.annotations,
          sourceShareId: shared.id,
          parentId: shared.parentId,
        };
        setLocalComparisons(prev => {
          // Don't add if already exists
          if (prev.some(c => c.id === comparison.id)) {
            return prev;
          }
          return [...prev, comparison];
        });
        setCurrentFolder(comparison.id);

        // Set view mode if specified (but not for single images)
        if (shared.viewMode && !shared.isSingle) {
          setViewMode(shared.viewMode);
        }
      })
      .catch((err) => {
        setSharedLoadError(err.message);
        console.error('Failed to load shared comparison:', err);
        // Reset so user can retry
        shareLoadedRef.current = null;
      });
  }, [shareConfigured]); // Only run once on mount when share is configured

  // Handle sharing current comparison
  const handleShare = useCallback(async () => {
    if (!currentComparison) {
      throw new Error('No comparison selected');
    }

    const isSingle = currentComparison.isSingle;
    let imageAUrl, imageBUrl;

    if (currentComparison.isLocal) {
      imageAUrl = currentComparison.images.A.url;
      imageBUrl = isSingle ? null : currentComparison.images.B?.url;
    } else {
      // For server-based comparisons, use the URLs from folderImages
      const folderImgs = folderImages[currentComparison.folder];
      if (folderImgs && folderImgs.length >= 1) {
        const imgA = folderImgs.find(i => i.name.toLowerCase().startsWith('a'));
        const imgB = folderImgs.find(i => i.name.toLowerCase().startsWith('b'));
        if (imgA?.url) {
          imageAUrl = imgA.url;
          imageBUrl = isSingle ? null : imgB?.url;
        } else {
          throw new Error('Could not find image URLs for this comparison');
        }
      } else {
        throw new Error('No images found for this comparison');
      }
    }

    const localComp = localComparisons.find(c => c.id === currentFolder);
    const name = localComp?.name || currentFolder || (isSingle ? 'Image' : 'Comparison');

    // Get annotations if available (now in { A: [], B: [] } format)
    const strokes = annotationsRef.current?.strokes || null;
    const texts = annotationsRef.current?.texts || null;
    const annotations = (strokes || texts) ? { strokes, texts } : null;

    // If re-sharing a shared comparison, link to the original as parent
    const parentId = localComp?.sourceShareId || null;

    return shareComparison(imageAUrl, imageBUrl, {
      name,
      annotations,
      viewMode,
      isSingle,
      parentId,
    });
  }, [currentComparison, currentFolder, localComparisons, folderImages, viewMode, shareComparison]);

  // Keyboard shortcuts: A-Z to select comparisons, < > to navigate
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      // Ignore if modifier keys are pressed (allow Cmd+C, Ctrl+V, etc.)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const allComparisons = [...folders, ...localComparisons.map(c => c.id)];

      // < or , for previous
      if (e.key === '<' || e.key === ',') {
        if (allComparisons.length === 0) return;
        const currentIndex = currentFolder ? allComparisons.indexOf(currentFolder) : -1;
        const newIndex = currentIndex <= 0 ? allComparisons.length - 1 : currentIndex - 1;
        setCurrentFolder(allComparisons[newIndex]);
        return;
      }

      // > or . for next
      if (e.key === '>' || e.key === '.') {
        if (allComparisons.length === 0) return;
        const currentIndex = currentFolder ? allComparisons.indexOf(currentFolder) : -1;
        const newIndex = currentIndex >= allComparisons.length - 1 ? 0 : currentIndex + 1;
        setCurrentFolder(allComparisons[newIndex]);
        return;
      }

      // / to return to slider mode (enable slider visibility, disable annotations)
      if (e.key === '/') {
        e.preventDefault();
        setSliderVisible(true);
        localStorage.setItem('slider-visible', 'true');
        setAnnotationsEnabled(false);
        return;
      }

      // 3 to toggle predator view (disabled for single images)
      if (e.key === '3') {
        if (currentComparison?.isSingle) return; // Disable for single images
        setViewMode(prev => prev === 'predator' ? 'slider' : 'predator');
        return;
      }

      // 4 to toggle annotations
      if (e.key === '4') {
        handleAnnotationsToggle();
        return;
      }

      const key = e.key.toUpperCase();
      if (key.length === 1 && key >= 'A' && key <= 'Z') {
        const index = key.charCodeAt(0) - 65; // A=0, B=1, etc.
        if (index < allComparisons.length) {
          setCurrentFolder(allComparisons[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [folders, localComparisons, currentFolder, handleSliderVisibleToggle, handleAnnotationsToggle]);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarOpenChange}>
      <AppSidebar
        folders={folders}
        folderImages={folderImages}
        localComparisons={localComparisons}
        currentFolder={currentFolder}
        onFolderSelect={handleFolderSelect}
        loading={loading}
        theme={theme}
        onThemeToggle={toggleTheme}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefetch={refetch}
        onNewComparison={handleNewComparison}
        bgOption={bgOption}
        onBgOptionChange={handleBgOptionChange}
        showToolbar={showToolbar}
        onShowToolbarChange={handleShowToolbarChange}
        colorPickerEnabled={colorPickerEnabled}
        onColorPickerToggle={handleColorPickerToggle}
        sliderVisible={sliderVisible}
        onSliderVisibleToggle={handleSliderVisibleToggle}
        annotationsEnabled={annotationsEnabled}
        onAnnotationsToggle={handleAnnotationsToggle}
        annotationsVisible={annotationsVisible}
        onAnnotationsVisibleToggle={handleAnnotationsVisibleToggle}
        onShare={handleShare}
        shareEnabled={shareConfigured && !!currentFolder}
        sharing={sharing}
        uploadProgress={uploadProgress}
        onLoadParent={handleLoadParent}
      />
      <SidebarInset className="h-screen relative">
        <div className={viewMode === 'slider' ? 'h-full' : 'hidden'}>
          <CompareSliderViewer
            currentFolder={currentFolder}
            currentComparison={currentComparison}
            bgOption={bgOption}
            showToolbar={showToolbar}
            onNewComparison={handleNewComparison}
            colorPickerEnabled={colorPickerEnabled}
            sliderVisible={sliderVisible}
            onSliderVisibleChange={handleSliderVisibleChange}
            sharedZoomPan={sharedZoomPan}
            annotationsEnabled={annotationsEnabled}
            annotationsRef={annotationsRef}
            annotationsVisible={annotationsVisible}
          />
        </div>
        <div className={viewMode === 'predator' ? 'h-full' : 'hidden'}>
          <PredatorView
            currentFolder={currentFolder}
            currentComparison={currentComparison}
            bgOption={bgOption}
            showToolbar={showToolbar}
            sharedZoomPan={sharedZoomPan}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
