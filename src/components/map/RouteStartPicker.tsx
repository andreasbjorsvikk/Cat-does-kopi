import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

interface Props {
  language: 'no' | 'en';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Overlay shown when the user is picking a route start point on the map.
 * Renders a centered light crosshair and a bottom "Lag rute" confirm button.
 * The map itself is rendered underneath — the user pans/zooms to align
 * the target crosshair with the desired start location.
 */
export default function RouteStartPicker({ language, loading, onConfirm, onCancel }: Props) {
  return (
    <>
      {/* Centered crosshair — light styling so it stands out on satellite/terrain */}
      <div className="pointer-events-none absolute inset-0 z-[45] flex items-center justify-center">
        <div className="relative">
          <div
            className="w-11 h-11 rounded-full border-2 border-white bg-white/25 backdrop-blur-sm flex items-center justify-center"
            style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.45), 0 0 0 2px rgba(0,0,0,0.25)' }}
          >
            <X className="w-6 h-6 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" strokeWidth={2.75} />
          </div>
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white"
            style={{ boxShadow: '0 0 0 1.5px rgba(0,0,0,0.5)' }}
          />
        </div>
      </div>

      {/* Instruction pill */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[45] px-4 py-2 rounded-full text-xs font-medium shadow-lg border border-white/40 bg-black/60 backdrop-blur-sm text-white whitespace-nowrap">
        {language === 'no' ? 'Flytt kartet til ønsket startpunkt' : 'Move the map to your desired start point'}
      </div>

      {/* Bottom action bar — high z-index and safe-area padding so it never hides behind system UI */}
      <div
        className="absolute left-4 right-4 z-[50] flex gap-2 max-w-sm mx-auto"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Button
          variant="outline"
          className="flex-1 bg-background/95 backdrop-blur-sm shadow-lg"
          onClick={onCancel}
          disabled={loading}
        >
          {language === 'no' ? 'Avbryt' : 'Cancel'}
        </Button>
        <Button
          className="flex-1 bg-success hover:bg-success/90 text-success-foreground shadow-lg"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {language === 'no' ? 'Lag rute' : 'Create route'}
        </Button>
      </div>
    </>
  );
}
