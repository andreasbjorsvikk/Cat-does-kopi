/**
 * useDailySteps — fetches daily step counts from the `daily_health_metrics`
 * table (populated by Apple HealthKit on iOS native).
 *
 * TODO (Native/Xcode): implement a Capacitor HealthKit plugin that reads
 * daily HKQuantityTypeIdentifierStepCount from HealthKit and calls
 * `appleHealthService.saveDailyMetrics({ date, steps })`. Requires:
 *   - Enable HealthKit capability in Xcode / Apple Developer portal.
 *   - Add NSHealthShareUsageDescription in Info.plist.
 * Web has no HealthKit — the hook returns an empty map and callers should
 * show a fallback message.
 */
import { useEffect, useState } from 'react';
import { appleHealthService, DailyHealthMetric } from '@/services/appleHealthService';
import { isNativePlatform } from '@/utils/capacitor';

export function useDailySteps(startDate: string, endDate: string) {
  const [metrics, setMetrics] = useState<DailyHealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const available = isNativePlatform();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    appleHealthService
      .getMetrics(startDate, endDate)
      .then((m) => { if (!cancelled) setMetrics(m); })
      .catch(() => { if (!cancelled) setMetrics([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  // Map: date -> step count
  const stepsByDate = new Map<string, number>();
  for (const m of metrics) {
    if (m.steps != null) stepsByDate.set(m.date, (stepsByDate.get(m.date) || 0) + m.steps);
  }

  return { stepsByDate, loading, available };
}
