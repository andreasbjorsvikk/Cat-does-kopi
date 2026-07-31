import { PrimaryGoalPeriod, WorkoutSession } from '@/types/workout';
import { getMonthTarget, getYearExpectedProgress, getActiveGoalForDate, getEarliestStart } from '@/services/primaryGoalService';

export function computeMonthWheelData(
  periods: PrimaryGoalPeriod[],
  sessions: WorkoutSession[],
  month: number,
  year: number,
  now: Date,
  unitLabel: string
) {
  const target = getMonthTarget(periods, year, month);
  const monthEnd = new Date(year, month + 1, 0);

  const current = sessions.filter(s => {
    if (s.excludeFromCount) return false;
    const d = new Date(s.date);
    if (d.getMonth() !== month || d.getFullYear() !== year) return false;
    return getActiveGoalForDate(periods, d) !== null;
  }).length;
  
  const percent = target === 0 ? 0 : (current / target) * 100;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
  const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());

  const monthStart = new Date(year, month, 1);
  const activeAtStart = getActiveGoalForDate(periods, monthStart);
  const activeAtEnd = getActiveGoalForDate(periods, monthEnd);

  let goalStartDay = 1;
  let hasActiveGoalInMonth = false;

  if (activeAtStart) {
    goalStartDay = 1;
    hasActiveGoalInMonth = true;
  } else if (activeAtEnd) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthStartStr = `${year}-${pad(month + 1)}-01`;
    const firstInMonth = periods.find(p => p.validFrom >= monthStartStr && p.validFrom <= activeAtEnd.validFrom);
    if (firstInMonth) {
      goalStartDay = parseInt(firstInMonth.validFrom.slice(8, 10));
    } else {
      goalStartDay = parseInt(activeAtEnd.validFrom.slice(8, 10));
    }
    hasActiveGoalInMonth = true;
  }

  const activeDaysInMonth = hasActiveGoalInMonth ? (daysInMonth - goalStartDay + 1) : 0;

  let expectedFraction: number;
  const todayDay = now.getDate();

  if (isFutureMonth) {
    expectedFraction = 0;
  } else if (!isCurrentMonth) {
    expectedFraction = hasActiveGoalInMonth ? 1 : 0;
  } else if (activeDaysInMonth <= 0) {
    expectedFraction = 0;
  } else {
    // Rule: expectedFraction = (nåværende dag - startdag + 1) / antall aktive dager i måneden
    const daysElapsed = Math.max(0, todayDay - goalStartDay + 1);
    expectedFraction = Math.min(1, daysElapsed / activeDaysInMonth);
  }
  const expected = target * expectedFraction;
  const diff = current - expected;
  return { current, target: Math.round(target), percent, unit: unitLabel, expectedFraction, diff };
}

export function computeYearWheelData(
  periods: PrimaryGoalPeriod[],
  sessions: WorkoutSession[],
  year: number,
  now: Date,
  unitLabel: string
) {
  const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  const getDayOfYear = (d: Date) => {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const current = sessions.filter(s => {
    if (s.excludeFromCount) return false;
    const d = new Date(s.date);
    if (d.getFullYear() !== year) return false;
    return getActiveGoalForDate(periods, d) !== null;
  }).length;

  const refDate = year === now.getFullYear() ? now : new Date(year + 1, 0, 1);
  const { target } = getYearExpectedProgress(periods, year, refDate);
  const isFutureYear = year > now.getFullYear();
  const isCurrentYear = year === now.getFullYear();

  let fractionElapsed = 0;
  if (isCurrentYear) {
    // Rule: expectedFraction = (dagnummer i året / 365)
    const dayOfYear = getDayOfYear(now);
    const totalDays = isLeapYear(year) ? 366 : 365;
    fractionElapsed = Math.min(1, dayOfYear / totalDays);
  } else if (!isFutureYear) {
    fractionElapsed = 1;
  }

  const expected = target * fractionElapsed;
  const diff = current - expected;
  const percent = target === 0 ? 0 : (current / target) * 100;
  return { current, target: Math.round(target), diff, expected, unit: unitLabel, expectedFraction: fractionElapsed, percent };
}

export function computeYearPrognosisData(
  sessions: WorkoutSession[],
  year: number,
  now: Date
) {
  const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  const getDayOfYear = (d: Date) => {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const totalDays = isLeapYear(year) ? 366 : 365;
  const dayOfYear = getDayOfYear(now);
  const yearFraction = Math.max(0.001, dayOfYear / totalDays); // Avoid div by zero
  const startOfYear = new Date(year, 0, 1);

  // Current state
  const sessionsYTD = sessions.filter(s => {
    if (s.excludeFromCount) return false;
    const d = new Date(s.date);
    return d.getFullYear() === year && d <= now;
  });
  const current = sessionsYTD.length;
  const prognosisNow = Math.round(current / yearFraction);

  // Momentum state (compare with 7 days ago)
  let sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // If we are in the first week of the year, compare with start of year
  if (sevenDaysAgo < startOfYear) {
    sevenDaysAgo = startOfYear;
  }

  const dayOfYear7d = getDayOfYear(sevenDaysAgo);
  const yearFraction7d = Math.max(0.001, dayOfYear7d / totalDays);

  const sessions7d = sessions.filter(s => {
    if (s.excludeFromCount) return false;
    const d = new Date(s.date);
    return d.getFullYear() === year && d <= sevenDaysAgo;
  });
  const count7d = sessions7d.length;
  const prognosis7d = Math.round(count7d / yearFraction7d);

  // Red condition: fallen significantly (>5%) AND >1 week since last session
  const lastSessionDate = sessionsYTD.length > 0 ? new Date(sessionsYTD[0].date) : null;
  const noWorkoutInWeek = !lastSessionDate || lastSessionDate < sevenDaysAgo;
  const fallenSignificantly = prognosisNow < prognosis7d * 0.95;

  let color = '#10B981'; // Green (default: stable or increasing)
  if (fallenSignificantly && noWorkoutInWeek) {
    color = '#EF4444'; // Red
  } else if (prognosisNow < prognosis7d) {
    color = '#F59E0B'; // Yellow (moderately falling)
  }

  return {
    current,
    prognosis: prognosisNow,
    yearFraction,
    percent: yearFraction * 100,
    color,
    label: `Du ligger an til å nå ${prognosisNow} økter i år`
  };
}