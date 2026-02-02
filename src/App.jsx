import { useState, useEffect, useCallback } from 'react';
import { useFolders } from '@/hooks/useFolders';
import { useTheme } from '@/hooks/useTheme';
import { useImageCache } from '@/hooks/useImageCache';
import { AppSidebar } from '@/components/AppSidebar';
import { ViewerContainer } from '@/components/ViewerContainer';
import { CompareSliderViewer } from '@/components/CompareSliderViewer';
import { PredatorView } from '@/components/PredatorView';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export function App() {
  const { folders, folderImages, loading, refetch } = useFolders();
  const { theme, toggleTheme } = useTheme();
  const [currentFolder, setCurrentFolder] = useState(null);
  const [viewMode, setViewMode] = useState('slider');
  const [localComparisons, setLocalComparisons] = useState([]);
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

  const handleColorPickerToggle = () => {
    const newValue = !colorPickerEnabled;
    setColorPickerEnabled(newValue);
    localStorage.setItem('color-picker-enabled', String(newValue));
  };

  const handleSliderVisibleToggle = useCallback(() => {
    setSliderVisible(prev => {
      const newValue = !prev;
      localStorage.setItem('slider-visible', String(newValue));
      return newValue;
    });
  }, []);

  const handleAnnotationsToggle = useCallback(() => {
    setAnnotationsEnabled(prev => !prev);
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

  // Sidebar click resets zoom, keyboard navigation preserves it
  const handleFolderSelect = useCallback((folder) => {
    setCurrentFolder(folder);
    resetZoom();
  }, [resetZoom]);

  // Get current comparison data (either from server folders or local)
  const getCurrentComparison = () => {
    if (!currentFolder) return null;

    const localComp = localComparisons.find(c => c.id === currentFolder);
    if (localComp) {
      return {
        isLocal: true,
        images: localComp.images,
      };
    }

    return {
      isLocal: false,
      folder: currentFolder,
    };
  };

  const currentComparison = getCurrentComparison();

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

      // / to toggle slider visibility
      if (e.key === '/') {
        e.preventDefault();
        handleSliderVisibleToggle();
        return;
      }

      // 3 to toggle predator view
      if (e.key === '3') {
        setViewMode(prev => prev === 'predator' ? 'slider' : 'predator');
        return;
      }

      // 4 to toggle annotations
      if (e.key === '4') {
        handleAnnotationsToggle();
        return;
      }

      const key = e.key.toUpperCase();
      if (key >= 'A' && key <= 'Z') {
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
      />
      <SidebarInset className="h-screen relative">
        {viewMode === 'jeri' && (
          <div className="h-full">
            <ViewerContainer
              currentFolder={currentFolder}
              currentComparison={currentComparison}
              theme={theme}
              showToolbar={showToolbar}
            />
          </div>
        )}
        <div className={viewMode === 'slider' ? 'h-full' : 'hidden'}>
          <CompareSliderViewer
            currentFolder={currentFolder}
            currentComparison={currentComparison}
            bgOption={bgOption}
            showToolbar={showToolbar}
            onNewComparison={handleNewComparison}
            colorPickerEnabled={colorPickerEnabled}
            sliderVisible={sliderVisible}
            sharedZoomPan={sharedZoomPan}
            annotationsEnabled={annotationsEnabled}
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
