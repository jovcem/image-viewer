import { useState, useEffect } from 'react';
import { PlusIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ImageDropZone, useImageUrlFetcher, usePasteHandler } from './ImageDropZone';

const adjectives = [
  { tr: 'tatli', en: 'sweet' },
  { tr: 'sicak', en: 'warm' },
  { tr: 'soguk', en: 'cold' },
  { tr: 'hizli', en: 'fast' },
  { tr: 'yavas', en: 'slow' },
  { tr: 'buyuk', en: 'big' },
  { tr: 'kucuk', en: 'small' },
  { tr: 'guzel', en: 'beautiful' },
  { tr: 'parlak', en: 'bright' },
  { tr: 'sessiz', en: 'quiet' },
  { tr: 'mutlu', en: 'happy' },
  { tr: 'nazik', en: 'gentle' },
  { tr: 'cesur', en: 'brave' },
  { tr: 'akilli', en: 'smart' },
  { tr: 'taze', en: 'fresh' },
  { tr: 'yumusak', en: 'soft' },
  { tr: 'serin', en: 'cool' },
  { tr: 'derin', en: 'deep' },
  { tr: 'yuksek', en: 'high' },
  { tr: 'gizli', en: 'secret' },
  { tr: 'eski', en: 'old' },
  { tr: 'yeni', en: 'new' },
  { tr: 'beyaz', en: 'white' },
  { tr: 'mavi', en: 'blue' },
  { tr: 'yesil', en: 'green' },
  { tr: 'altin', en: 'golden' },
  { tr: 'gumus', en: 'silver' },
  { tr: 'pembe', en: 'pink' },
];

const nouns = [
  { tr: 'kedi', en: 'cat' },
  { tr: 'kopek', en: 'dog' },
  { tr: 'kus', en: 'bird' },
  { tr: 'balik', en: 'fish' },
  { tr: 'tavsan', en: 'rabbit' },
  { tr: 'ayi', en: 'bear' },
  { tr: 'kurt', en: 'wolf' },
  { tr: 'tilki', en: 'fox' },
  { tr: 'aslan', en: 'lion' },
  { tr: 'kaplan', en: 'tiger' },
  { tr: 'penguen', en: 'penguin' },
  { tr: 'yunus', en: 'dolphin' },
  { tr: 'kartal', en: 'eagle' },
  { tr: 'baykus', en: 'owl' },
  { tr: 'kelebek', en: 'butterfly' },
  { tr: 'bulut', en: 'cloud' },
  { tr: 'yildiz', en: 'star' },
  { tr: 'deniz', en: 'sea' },
  { tr: 'dag', en: 'mountain' },
  { tr: 'orman', en: 'forest' },
  { tr: 'cicek', en: 'flower' },
  { tr: 'gunes', en: 'sun' },
  { tr: 'ay', en: 'moon' },
  { tr: 'ruzgar', en: 'wind' },
  { tr: 'dalga', en: 'wave' },
  { tr: 'nehir', en: 'river' },
  { tr: 'ada', en: 'island' },
  { tr: 'kaya', en: 'rock' },
];

function generateName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return {
    name: `${adj.tr}-${noun.tr}`,
    translation: `${adj.en} ${noun.en}`,
  };
}

export function NewComparisonDialog({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [translation, setTranslation] = useState('');
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [error, setError] = useState('');
  const [hoveredZone, setHoveredZone] = useState(null);

  const { loading, progress, fetchImageFromUrl } = useImageUrlFetcher();

  // Only enable paste handling when dialog is open
  usePasteHandler(open ? {
    fileA,
    fileB,
    setFileA,
    setFileB,
    hoveredZone,
    fetchImageFromUrl,
  } : {
    fileA: null,
    fileB: null,
    setFileA: () => {},
    setFileB: () => {},
    hoveredZone: null,
    fetchImageFromUrl: () => {},
  });

  const regenerateName = () => {
    const generated = generateName();
    setName(generated.name);
    setTranslation(generated.translation);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    if (!fileA || !fileB) {
      setError('Please add both images');
      return;
    }

    const comparison = {
      id: `local_${Date.now()}`,
      name: name.trim(),
      isLocal: true,
      images: {
        A: { name: fileA.name, url: URL.createObjectURL(fileA) },
        B: { name: fileB.name, url: URL.createObjectURL(fileB) },
      },
    };

    setOpen(false);
    setName('');
    setFileA(null);
    setFileB(null);
    setError('');
    onCreated?.(comparison);
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (isOpen) {
      const generated = generateName();
      setName(generated.name);
      setTranslation(generated.translation);
    } else {
      setName('');
      setTranslation('');
      setFileA(null);
      setFileB(null);
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="w-full justify-start gap-2 h-8 px-2 bg-cyan-500/10 text-zinc-800 dark:text-zinc-300 border border-cyan-500/50 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-[0_0_6px_rgba(6,182,212,0.2)] hover:shadow-[0_0_8px_rgba(6,182,212,0.3)] transition-all cursor-pointer group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <PlusIcon className="h-4 w-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">New Comparison</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Comparison</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Name</label>
              {translation && (
                <span className="text-xs text-orange-400 px-2 py-0.5 border border-orange-500/50 rounded bg-orange-500/10">
                  {translation}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="my-comparison"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setTranslation('');
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={regenerateName}
                type="button"
              >
                <RefreshCwIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div
              onMouseEnter={() => setHoveredZone('A')}
              onMouseLeave={() => setHoveredZone(null)}
            >
              <label className="text-sm font-medium mb-2 block">Image A</label>
              <ImageDropZone
                label="A"
                file={fileA}
                onDrop={setFileA}
                onClear={() => setFileA(null)}
                isHovered={hoveredZone === 'A'}
                isLoading={loading.A}
                loadingProgress={progress.A}
                size="small"
              />
            </div>
            <div
              onMouseEnter={() => setHoveredZone('B')}
              onMouseLeave={() => setHoveredZone(null)}
            >
              <label className="text-sm font-medium mb-2 block">Image B</label>
              <ImageDropZone
                label="B"
                file={fileB}
                onDrop={setFileB}
                onClear={() => setFileB(null)}
                isHovered={hoveredZone === 'B'}
                isLoading={loading.B}
                loadingProgress={progress.B}
                size="small"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
