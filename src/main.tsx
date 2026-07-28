import { createRoot } from 'react-dom/client';
import App from "./App.tsx";
import "./index.css";
import { restoreActivityColors } from './utils/activityColors';
import { setupNativeAuthListener } from './utils/nativeAuth';

restoreActivityColors();
setupNativeAuthListener();

// Cleanup: unregister any legacy offline-tile service worker from earlier
// builds so it stops intercepting tile requests. Safe no-op if none exists.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
      if (url.includes('sw-offline-tiles')) {
        reg.unregister().catch(() => {});
      }
    });
  }).catch(() => {});
  // Also purge the tile cache once so blurred/stale tiles don't stick around.
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.filter((k) => k.startsWith('mapbox-tiles')).forEach((k) => caches.delete(k).catch(() => {}));
    }).catch(() => {});
  }
}

createRoot(document.getElementById("root")!).render(<App />);
