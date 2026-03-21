import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Action = {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
};

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actions: Action[];
}

export default function AuthModal({ open, onClose, title, description, actions }: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
          <div className="flex gap-2 justify-end w-full">
            {actions.map((a, idx) => (
              <Button key={idx} variant={a.variant ?? 'default'} onClick={a.onClick}>
                {a.label}
              </Button>
            ))}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
