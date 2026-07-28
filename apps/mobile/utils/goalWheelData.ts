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