import { useState } from 'react';
import { ShareIcon, CheckIcon, CopyIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function ShareButton({ onShare, disabled, sharing, uploadProgress = 0 }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleShare = async () => {
    setError('');
    setUploading(true);
    setDialogOpen(true);
    try {
      const result = await onShare();
      setShareUrl(result.shareUrl);
      setUploading(false);
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (uploading) return; // Don't close during upload
    setDialogOpen(false);
    setShareUrl('');
    setError('');
    setCopied(false);
    setUploading(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleShare}
        disabled={disabled || sharing}
        className={cn("h-8 w-8 cursor-pointer", disabled && "opacity-50")}
        title="Share comparison"
      >
        {sharing ? (
          <Loader2Icon className="h-4 w-4 animate-spin" />
        ) : (
          <ShareIcon className="h-4 w-4" />
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {error ? 'Share Failed' : uploading ? 'Uploading...' : 'Share Comparison'}
            </DialogTitle>
          </DialogHeader>

          {uploading ? (
            <div className="flex flex-col gap-3 py-4">
              <p className="text-sm text-muted-foreground">
                Uploading images to server...
              </p>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-200 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {uploadProgress}%
              </p>
            </div>
          ) : error ? (
            <div className="py-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                Your comparison has been uploaded. Share this link:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-muted border border-border rounded-md font-mono"
                  onClick={(e) => e.target.select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {copied && (
                <p className="text-sm text-green-500">Copied to clipboard!</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
