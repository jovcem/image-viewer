import { useState, useEffect } from 'react';
import { AlertTriangleIcon } from 'lucide-react';

function formatFileSize(bytes) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFormatFromUrl(url) {
  if (!url) return null;
  if (url.startsWith('blob:')) {
    return null;
  }
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (match) {
    return match[1].toUpperCase();
  }
  return null;
}

function ImageInfo({ label, url, onInfoLoaded }) {
  const [info, setInfo] = useState({ width: null, height: null, size: null, format: null, loading: true });

  useEffect(() => {
    if (!url) {
      setInfo({ width: null, height: null, size: null, format: null, loading: false });
      onInfoLoaded?.({ width: null, height: null, format: null });
      return;
    }

    setInfo(prev => ({ ...prev, loading: true }));

    const format = getFormatFromUrl(url);

    const img = new Image();
    img.onload = () => {
      setInfo(prev => ({
        ...prev,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format,
        loading: false,
      }));
      onInfoLoaded?.({ width: img.naturalWidth, height: img.naturalHeight, format });
    };
    img.onerror = () => {
      setInfo(prev => ({ ...prev, format, loading: false }));
      onInfoLoaded?.({ width: null, height: null, format: null });
    };
    img.src = url;

    if (!url.startsWith('blob:')) {
      fetch(url, { method: 'HEAD' })
        .then(res => {
          const size = res.headers.get('content-length');
          const contentType = res.headers.get('content-type');
          let detectedFormat = format;
          if (!detectedFormat && contentType) {
            const typeMatch = contentType.match(/image\/(\w+)/);
            if (typeMatch) {
              detectedFormat = typeMatch[1].toUpperCase();
            }
          }
          setInfo(prev => ({
            ...prev,
            size: size ? parseInt(size, 10) : prev.size,
            format: detectedFormat || prev.format,
          }));
        })
        .catch(() => {});
    }
  }, [url, onInfoLoaded]);

  if (!url) return null;

  const parts = [];
  if (info.format) parts.push(info.format);
  if (info.width && info.height) parts.push(`${info.width} × ${info.height} px`);
  const sizeStr = formatFileSize(info.size);
  if (sizeStr) parts.push(sizeStr);

  return (
    <div className="flex items-center gap-2 px-2 py-0.5 bg-muted/50 rounded text-xs">
      <span className="font-medium text-foreground">{label}</span>
      {info.loading ? (
        <span className="text-muted-foreground">Loading...</span>
      ) : (
        <span className="text-muted-foreground">
          {parts.join(' | ')}
        </span>
      )}
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-500">
      <AlertTriangleIcon className="h-3 w-3" />
      <span>{children}</span>
    </div>
  );
}

export function ImageInfoToolbar({ imageA, imageB }) {
  const [infoA, setInfoA] = useState({ width: null, height: null, format: null });
  const [infoB, setInfoB] = useState({ width: null, height: null, format: null });

  if (!imageA && !imageB) return null;

  const hasResA = infoA.width && infoA.height;
  const hasResB = infoB.width && infoB.height;

  let resolutionMismatch = false;
  let ratioMismatch = false;
  let formatMismatch = false;

  if (hasResA && hasResB) {
    resolutionMismatch = infoA.width !== infoB.width || infoA.height !== infoB.height;

    const ratioA = infoA.width / infoA.height;
    const ratioB = infoB.width / infoB.height;
    ratioMismatch = Math.abs(ratioA - ratioB) > 0.01;
  }

  if (infoA.format && infoB.format) {
    formatMismatch = infoA.format !== infoB.format;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-start gap-3 px-2 py-1 bg-background/80 backdrop-blur-sm border-t border-border">
      <ImageInfo label="A" url={imageA} onInfoLoaded={setInfoA} />
      <ImageInfo label="B" url={imageB} onInfoLoaded={setInfoB} />
      {formatMismatch && <Warning>Format mismatch</Warning>}
      {ratioMismatch && <Warning>Aspect ratio mismatch</Warning>}
      {resolutionMismatch && <Warning>Resolution mismatch</Warning>}
    </div>
  );
}
