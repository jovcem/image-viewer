import { useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

async function uploadWithProgress(bucket, path, blob, onProgress) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded, event.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ data: { path }, error: null });
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
    xhr.setRequestHeader('apikey', supabaseKey);
    xhr.setRequestHeader('Content-Type', blob.type);
    xhr.setRequestHeader('Cache-Control', '31536000');
    xhr.send(blob);
  });
}

async function urlToBlob(url) {
  // Handle blob URLs directly
  if (url.startsWith('blob:')) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch blob URL: ${response.status}`);
    return response.blob();
  }

  // Handle data URLs
  if (url.startsWith('data:')) {
    const response = await fetch(url);
    return response.blob();
  }

  // Handle regular URLs - fetch and convert to blob
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`URL did not return an image (got ${contentType})`);
  }
  return response.blob();
}

function getFileExtension(blob) {
  const mimeToExt = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return mimeToExt[blob.type] || 'png';
}

export function useShare() {
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const shareComparison = useCallback(async (imageAUrl, imageBUrl, metadata = {}) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    }

    setSharing(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Generate unique ID for this share
      const shareId = crypto.randomUUID();

      // Convert URLs to blobs
      const [blobA, blobB] = await Promise.all([
        urlToBlob(imageAUrl),
        urlToBlob(imageBUrl),
      ]);

      const extA = getFileExtension(blobA);
      const extB = getFileExtension(blobB);

      // Upload images to Supabase Storage with progress tracking
      const pathA = `${shareId}/A.${extA}`;
      const pathB = `${shareId}/B.${extB}`;

      const totalSize = blobA.size + blobB.size;
      let uploadedA = 0;
      let uploadedB = 0;

      const updateProgress = () => {
        const progress = Math.round(((uploadedA + uploadedB) / totalSize) * 100);
        setUploadProgress(progress);
      };

      await Promise.all([
        uploadWithProgress('comparisons', pathA, blobA, (loaded) => {
          uploadedA = loaded;
          updateProgress();
        }),
        uploadWithProgress('comparisons', pathB, blobB, (loaded) => {
          uploadedB = loaded;
          updateProgress();
        }),
      ]);

      // Insert metadata into database
      const { error: dbError } = await supabase
        .from('shared_comparisons')
        .insert({
          id: shareId,
          name: metadata.name || 'Shared Comparison',
          image_a_path: pathA,
          image_b_path: pathB,
          annotations: metadata.annotations || null,
          view_mode: metadata.viewMode || 'slider',
        });

      if (dbError) throw new Error(`Failed to save comparison: ${dbError.message}`);

      // Generate shareable URL
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;

      return { shareId, shareUrl };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSharing(false);
    }
  }, []);

  const loadSharedComparison = useCallback(async (shareId) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch comparison metadata from database
      const { data, error: dbError } = await supabase
        .from('shared_comparisons')
        .select('*')
        .eq('id', shareId)
        .single();

      if (dbError) throw new Error(`Comparison not found: ${dbError.message}`);
      if (!data) throw new Error('Comparison not found');

      // Get public URLs for the images
      const { data: urlDataA } = supabase.storage
        .from('comparisons')
        .getPublicUrl(data.image_a_path);

      const { data: urlDataB } = supabase.storage
        .from('comparisons')
        .getPublicUrl(data.image_b_path);

      return {
        id: data.id,
        name: data.name,
        imageA: urlDataA.publicUrl,
        imageB: urlDataB.publicUrl,
        annotations: data.annotations,
        viewMode: data.view_mode,
        createdAt: data.created_at,
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    shareComparison,
    loadSharedComparison,
    sharing,
    loading,
    error,
    uploadProgress,
    isConfigured: isSupabaseConfigured(),
  };
}
