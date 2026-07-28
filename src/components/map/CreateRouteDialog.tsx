import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onFromGps: () => void;
  onPickOnMap: () => void;
  language: 'no' | 'en';
}

export default function CreateRouteDialog({ open, onClose, onFromGps, onPickOnMap, language }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{language === 'no' ? 'Lag rute' : 'Create route'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <Button
            className="w-full justify-start bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => { onFromGps(); onClose(); }}
          >
            <Navigation className="w-4 h-4 mr-2" />
            {language === 'no' ? 'Fra din nåværende posisjon' : 'From your current location'}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => { onPickOnMap(); onClose(); }}
          >
            <MapPin className="w-4 h-4 mr-2" />
            {language === 'no' ? 'Velg startpunkt på kartet' : 'Pick start point on map'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
