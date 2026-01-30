import { ImageIcon } from 'lucide-react';

export function EmptyState({ children, icon: Icon = ImageIcon }) {
  return (
    <div className="flex items-center justify-center h-full text-center p-8">
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <div className="rounded-full bg-muted p-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-muted-foreground text-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
