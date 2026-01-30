import { useState, useEffect, useCallback } from 'react';

async function findImagesInFolder(folderName, baseUrl) {
  const extensions = ['png', 'jpg', 'jpeg', 'exr', 'hdr'];
  const images = [];

  for (const name of ['A', 'B']) {
    for (const ext of extensions) {
      const url = `${baseUrl}images/${folderName}/${name}.${ext}`;
      try {
        const resp = await fetch(url, { method: 'HEAD' });
        const contentType = resp.headers.get('content-type') || '';
        if (resp.ok && contentType.startsWith('image/')) {
          images.push({ name: `${name}.${ext}`, url });
          break;
        }
      } catch {}
    }
  }

  return images;
}

export function useFolders() {
  const [folders, setFolders] = useState([]);
  const [folderImages, setFolderImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFolders = useCallback(async () => {
    try {
      // Try API first (for dev), fall back to static folders.json (for production/GitHub Pages)
      let folderList = [];
      const apiResponse = await fetch('/api/folders');
      if (apiResponse.ok && apiResponse.headers.get('content-type')?.includes('application/json')) {
        const data = await apiResponse.json();
        folderList = data.folders || [];
      } else {
        const staticResponse = await fetch(import.meta.env.BASE_URL + 'folders.json');
        if (staticResponse.ok) {
          const data = await staticResponse.json();
          folderList = data.folders || [];
        }
      }
      setFolders(folderList);

      // Fetch images for each folder
      const baseUrl = import.meta.env.BASE_URL;
      const imagesMap = {};
      for (const folder of folderList) {
        imagesMap[folder] = await findImagesInFolder(folder, baseUrl);
      }
      setFolderImages(imagesMap);
    } catch (err) {
      console.warn('Could not load folders:', err.message);
      setError(err.message);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  return { folders, folderImages, loading, error, refetch: fetchFolders };
}
