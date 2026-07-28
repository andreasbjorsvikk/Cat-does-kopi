/**
 * headingService — provides device compass heading in degrees (0 = North, clockwise).
 *
 * Priority:
 *   1. iOS Safari `event.webkitCompassHeading` (already true north, clockwise)
 *   2. Standard `deviceorientationabsolute` / `deviceorientation` `event.alpha` (converted)
 *   3. Fallback: consumer computes heading from GPS movement bearing.
 *
 * iOS 13+ requires an explicit user-gesture permission request via
 * `DeviceOrientationEvent.requestPermission()`. Call `requestPermission()` from
 * within a click handler (e.g. the GPS button) before subscribing.
 */

type HeadingListener = (heading: number, source: 'webkitCompassHeading' | 'alpha') => void;

let listeners: HeadingListener[] = [];
let started = false;
let lastHeading: number | null = null;
let lastSource: 'webkitCompassHeading' | 'alpha' | null = null;

const handleOrientation = (event: DeviceOrientationEvent) => {
  // iOS Safari exposes webkitCompassHeading (degrees clockwise from true north).
  const webkitHeading = (event as any).webkitCompassHeading;
  if (typeof webkitHeading === 'number' && !Number.isNaN(webkitHeading)) {
    if (lastSource !== 'webkitCompassHeading') {
      console.log('[HEADING] using webkitCompassHeading');
      lastSource = 'webkitCompassHeading';
    }
    lastHeading = webkitHeading;
    listeners.forEach((l) => l(webkitHeading, 'webkitCompassHeading'));
    return;
  }

  // Standard: alpha is counter-clockwise from north. Convert to clockwise.
  if (event.alpha != null && !Number.isNaN(event.alpha)) {
    const heading = (360 - event.alpha) % 360;
    if (lastSource !== 'alpha') {
      console.log('[HEADING] using deviceorientation alpha');
      lastSource = 'alpha';
    }
    lastHeading = heading;
    listeners.forEach((l) => l(heading, 'alpha'));
  }
};

const attachOrientation = () => {
  if (started) return;
  started = true;
  // Prefer the absolute variant when available (true north).
  if ('ondeviceorientationabsolute' in window) {
    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
  }
  window.addEventListener('deviceorientation', handleOrientation, true);
};

export const headingService = {
  /**
   * Request permission for DeviceOrientation on iOS 13+. Must be called from a user gesture.
   * On other platforms this is a no-op and returns 'granted'.
   */
  async requestPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
    console.log('[HEADING] permission requested');
    const DOE: any = (window as any).DeviceOrientationEvent;
    if (!DOE) {
      console.log('[HEADING] permission unavailable (no DeviceOrientationEvent)');
      return 'unavailable';
    }
    if (typeof DOE.requestPermission === 'function') {
      try {
        const res = await DOE.requestPermission();
        if (res === 'granted') {
          console.log('[HEADING] permission granted');
          attachOrientation();
          return 'granted';
        }
        console.log('[HEADING] permission denied');
        return 'denied';
      } catch (e) {
        console.warn('[HEADING] permission request threw', e);
        return 'denied';
      }
    }
    // Non-iOS: no explicit permission needed.
    console.log('[HEADING] permission granted (implicit)');
    attachOrientation();
    return 'granted';
  },

  subscribe(listener: HeadingListener): () => void {
    listeners.push(listener);
    if (lastHeading != null && lastSource != null) {
      listener(lastHeading, lastSource);
    }
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  getLastHeading(): number | null {
    return lastHeading;
  },
};
