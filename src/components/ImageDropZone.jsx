import { useState, useCallback, useEffect } from 'react';
import { ImagePlusIcon, XIcon, LoaderIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export function ImageDropZone({
  label,
  file,
  onDrop,
  onClear,
  isHovered,
  isLoading,
  loadingProgress,
  size = 'large' // 'small' or 'large'
}) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);

  const isSmall = size === 'small';
  const containerSize = isSmall ? 'w-32 h-32' : 'w-64 h-64';
  const iconSize = isSmall ? 'h-8 w-8' : 'h-16 w-16';
  const titleSize = isSmall ? 'text-sm' : 'text-xl';
  const spinnerSize = isSmall ? 'h-8 w-8' : 'h-12 w-12';
  const progressWidth = isSmall ? 'w-24' : 'w-48';

  // Update preview when file changes (e.g., from paste)
  useEffect(() => {
    if (file && !preview) {
      setPreview(URL.createObjectURL(file));
    } else if (!file && preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
  }, [file, preview]);

  const handleFile = useCallback((imageFile) => {
    onDrop(imageFile);
    setPreview(URL.createObjectURL(imageFile));
  }, [onDrop]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      handleFile(droppedFile);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  }, [handleFile]);

  const handleClear = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    onClear();
  }, [preview, onClear]);

  return (
    <div
      className={`relative border-4 border-dashed rounded-lg p-4 text-center transition-colors ${
        dragOver || isHovered ? 'border-primary' : 'border-muted-foreground/25'
      } ${dragOver ? 'bg-primary/10' : ''} ${file ? 'bg-muted/50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isLoading ? (
        <div className={`flex flex-col items-center justify-center gap-4 ${containerSize} mx-auto`}>
          <LoaderIcon className={`${spinnerSize} text-muted-foreground animate-spin`} />
          <span className="text-sm text-muted-foreground">Loading...</span>
          <Progress value={loadingProgress} className={progressWidth} />
        </div>
      ) : file ? (
        <div className="flex flex-col items-center gap-3">
          <div className={`${containerSize} flex items-center justify-center`}>
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className={`${isSmall ? 'max-w-32 max-h-32' : 'max-w-64 max-h-64'} object-contain rounded`}
              />
            )}
          </div>
          <div className="flex items-center gap-2 w-full">
            <span className={`${isSmall ? 'text-xs' : 'text-sm'} truncate flex-1 text-muted-foreground`}>{file.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleClear}
            >
              <XIcon className={`${isSmall ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </Button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer">
          <div className={`flex flex-col items-center justify-center gap-${isSmall ? '2' : '3'} ${containerSize} mx-auto`}>
            <ImagePlusIcon className={`${iconSize} text-muted-foreground`} />
            <span className={`${titleSize} font-medium text-muted-foreground`}>Image {label}</span>
            <span className={`${isSmall ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
              {label === 'B' && <span className="block">Optional - for comparison</span>}
              Drag, click, or paste url/image
            </span>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      )}
    </div>
  );
}

// Hook for handling URL fetching with progress
export function useImageUrlFetcher() {
  const [loading, setLoading] = useState({ A: false, B: false });
  const [progress, setProgress] = useState({ A: 0, B: 0 });

  const fetchImageFromUrl = useCallback(async (url, targetLabel, setFile) => {
    setLoading(prev => ({ ...prev, [targetLabel]: true }));
    setProgress(prev => ({ ...prev, [targetLabel]: 0 }));

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (total && response.body) {
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          setProgress(prev => ({ ...prev, [targetLabel]: Math.round((received / total) * 100) }));
        }

        const blob = new Blob(chunks);
        const filename = url.split('/').pop()?.split('?')[0] || `url-${targetLabel}.png`;
        const file = new File([blob], filename, { type: blob.type || 'image/png' });
        setFile(file);
      } else {
        setProgress(prev => ({ ...prev, [targetLabel]: 50 }));
        const blob = await response.blob();
        setProgress(prev => ({ ...prev, [targetLabel]: 90 }));

        const filename = url.split('/').pop()?.split('?')[0] || `url-${targetLabel}.png`;
        const file = new File([blob], filename, { type: blob.type || 'image/png' });
        setFile(file);
      }
    } catch (err) {
      console.error('Failed to fetch image from URL:', err);
    } finally {
      setLoading(prev => ({ ...prev, [targetLabel]: false }));
      setProgress(prev => ({ ...prev, [targetLabel]: 100 }));
    }
  }, []);

  return { loading, progress, fetchImageFromUrl };
}

// Hook for handling paste events (image or URL)
export function usePasteHandler({ fileA, fileB, setFileA, setFileB, hoveredZone, fetchImageFromUrl }) {
  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const isInInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

      // Check if clipboard has image or URL content
      let hasImage = false;
      let hasUrl = false;
      let urlText = '';

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          hasImage = true;
          break;
        }
      }

      if (!hasImage) {
        const text = e.clipboardData?.getData('text');
        if (text) {
          try {
            const url = new URL(text);
            if (url.protocol === 'http:' || url.protocol === 'https:') {
              hasUrl = true;
              urlText = text;
            }
          } catch {
            // Not a valid URL
          }
        }
      }

      // If in input and no zone is hovered, let default behavior happen
      if (isInInput && !hoveredZone) return;

      // If no image/URL content, let default behavior happen
      if (!hasImage && !hasUrl) return;

      // Determine target zone
      let targetLabel = 'A';
      if (hoveredZone === 'A') {
        targetLabel = 'A';
      } else if (hoveredZone === 'B') {
        targetLabel = 'B';
      } else if (!fileA) {
        targetLabel = 'A';
      } else if (!fileB) {
        targetLabel = 'B';
      }

      const setFile = targetLabel === 'A' ? setFileA : setFileB;

      // Handle image paste
      if (hasImage) {
        e.preventDefault();
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const pastedFile = item.getAsFile();
            if (pastedFile) {
              const namedFile = new File([pastedFile], `pasted-${targetLabel}.png`, { type: pastedFile.type });
              setFile(namedFile);
            }
            return;
          }
        }
      }

      // Handle URL paste
      if (hasUrl) {
        e.preventDefault();
        fetchImageFromUrl(urlText, targetLabel, setFile);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [hoveredZone, fileA, fileB, setFileA, setFileB, fetchImageFromUrl]);
}
