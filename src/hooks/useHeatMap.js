import { useState, useEffect, useRef } from 'react';

/**
 * Heat map computation hook for pixel-by-pixel difference visualization
 * Blue = identical, Red = maximum difference
 */
export function useHeatMap(imageA, imageB, sensitivity = 128, mode = 'rgb') {
  const [heatMapUrl, setHeatMapUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const [stats, setStats] = useState(null);
  const [generationTime, setGenerationTime] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imageA || !imageB) {
      setHeatMapUrl(null);
      setDimensions(null);
      setStats(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        // Only set crossOrigin for actual cross-origin URLs
        // Skip for: data:, blob:, relative URLs (/path or ./path), same-origin
        const isAbsoluteUrl = src.startsWith('http://') || src.startsWith('https://');
        const isSameOrigin = isAbsoluteUrl && src.startsWith(window.location.origin);
        const needsCors = isAbsoluteUrl && !isSameOrigin;
        if (needsCors) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
      });
    };

    async function computeHeatMap() {
      const startTime = performance.now();
      try {
        const [imgA, imgB] = await Promise.all([
          loadImage(imageA),
          loadImage(imageB),
        ]);

        if (cancelled) return;

        // Use the larger dimensions to ensure we capture all differences
        const width = Math.max(imgA.naturalWidth, imgB.naturalWidth);
        const height = Math.max(imgA.naturalHeight, imgB.naturalHeight);

        // Create canvases for each image, scaling both to the same dimensions
        const canvasA = document.createElement('canvas');
        canvasA.width = width;
        canvasA.height = height;
        const ctxA = canvasA.getContext('2d');
        ctxA.drawImage(imgA, 0, 0, width, height);

        const canvasB = document.createElement('canvas');
        canvasB.width = width;
        canvasB.height = height;
        const ctxB = canvasB.getContext('2d');
        ctxB.drawImage(imgB, 0, 0, width, height);

        // Get pixel data
        let dataA, dataB;
        try {
          dataA = ctxA.getImageData(0, 0, width, height);
          dataB = ctxB.getImageData(0, 0, width, height);
        } catch (securityErr) {
          throw new Error('Cannot read pixel data due to CORS restrictions. Try uploading images directly.');
        }

        // Create output canvas for heat map
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = width;
        outputCanvas.height = height;
        const outputCtx = outputCanvas.getContext('2d');
        const outputData = outputCtx.createImageData(width, height);

        // Compute pixel-by-pixel differences and track stats
        let totalDiff = 0;
        let maxDiff = 0;
        let diffPixelCount = 0;
        let aboveThresholdCount = 0;
        const totalPixels = width * height;

        // Select diff function based on mode
        const getDiff = mode === 'luma' ? calculateLumaDiff
                      : mode === 'hue' ? calculateHueDiff
                      : calculateRgbDiff;

        for (let i = 0; i < dataA.data.length; i += 4) {
          const avgDiff = getDiff(dataA, dataB, i);

          // Normalize to 0-1, using sensitivity as max threshold
          const normalized = Math.min(1, avgDiff / sensitivity);

          totalDiff += avgDiff;
          maxDiff = Math.max(maxDiff, avgDiff);
          if (avgDiff > 0) diffPixelCount++;
          if (avgDiff >= sensitivity) aboveThresholdCount++;

          // Map to blue→green→yellow→red gradient
          const color = differenceToColor(normalized);

          outputData.data[i] = color.r;
          outputData.data[i + 1] = color.g;
          outputData.data[i + 2] = color.b;
          outputData.data[i + 3] = 255;
        }

        outputCtx.putImageData(outputData, 0, 0);

        if (cancelled) return;

        // Convert to data URL
        const dataUrl = outputCanvas.toDataURL('image/png');
        const endTime = performance.now();
        setHeatMapUrl(dataUrl);
        setDimensions({ width, height });
        setStats({
          totalPixels,
          diffPixelCount,
          diffPercentage: ((diffPixelCount / totalPixels) * 100).toFixed(1),
          avgDiff: (totalDiff / totalPixels).toFixed(2),
          maxDiff: maxDiff.toFixed(0),
          aboveThreshold: aboveThresholdCount,
          aboveThresholdPercentage: ((aboveThresholdCount / totalPixels) * 100).toFixed(3),
        });
        setGenerationTime(Math.round(endTime - startTime));
        canvasRef.current = outputCanvas;
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    computeHeatMap();

    return () => {
      cancelled = true;
    };
  }, [imageA, imageB, sensitivity, mode]);

  return {
    heatMapUrl,
    loading,
    error,
    dimensions,
    stats,
    generationTime,
  };
}

// Difference calculation functions for each mode

function calculateRgbDiff(dataA, dataB, i) {
  const rDiff = Math.abs(dataA.data[i] - dataB.data[i]);
  const gDiff = Math.abs(dataA.data[i + 1] - dataB.data[i + 1]);
  const bDiff = Math.abs(dataA.data[i + 2] - dataB.data[i + 2]);
  return (rDiff + gDiff + bDiff) / 3;
}

function calculateLumaDiff(dataA, dataB, i) {
  const lumaA = 0.299 * dataA.data[i] + 0.587 * dataA.data[i + 1] + 0.114 * dataA.data[i + 2];
  const lumaB = 0.299 * dataB.data[i] + 0.587 * dataB.data[i + 1] + 0.114 * dataB.data[i + 2];
  return Math.abs(lumaA - lumaB);
}

function calculateHueDiff(dataA, dataB, i) {
  const hueA = rgbToHue(dataA.data[i], dataA.data[i + 1], dataA.data[i + 2]);
  const hueB = rgbToHue(dataB.data[i], dataB.data[i + 1], dataB.data[i + 2]);
  // Circular distance (hue wraps at 360)
  const diff = Math.abs(hueA - hueB);
  return Math.min(diff, 360 - diff) * (255 / 180); // Normalize to 0-255 scale
}

function rgbToHue(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0; // Achromatic

  let h;
  const d = max - min;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return h;
}

/**
 * Convert a normalized difference (0-1) to a blue→green→yellow→red color
 * 0 = Blue (identical)
 * 0.33 = Green (slight difference)
 * 0.67 = Yellow (medium difference)
 * 1 = Red (maximum difference)
 */
function differenceToColor(normalized) {
  const t = Math.max(0, Math.min(1, normalized));

  if (t < 0.33) {
    // Blue → Green (0 to 0.33)
    const localT = t / 0.33;
    return {
      r: 0,
      g: Math.round(localT * 255),
      b: Math.round((1 - localT) * 255)
    };
  } else if (t < 0.67) {
    // Green → Yellow (0.33 to 0.67)
    const localT = (t - 0.33) / 0.34;
    return {
      r: Math.round(localT * 255),
      g: 255,
      b: 0
    };
  } else {
    // Yellow → Red (0.67 to 1)
    const localT = (t - 0.67) / 0.33;
    return {
      r: 255,
      g: Math.round((1 - localT) * 255),
      b: 0
    };
  }
}
