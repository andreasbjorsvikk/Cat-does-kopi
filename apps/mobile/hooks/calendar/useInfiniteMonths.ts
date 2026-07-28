import { useState, useCallback, useMemo } from 'react';

export interface MonthInfo {
  id: string; // YYYY-MM
  year: number;
  month: number;
  label: string;
  weeks: number;
}

const MONTH_NAMES = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember'
];

function getWeeksCount(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Adjust to Monday start (0=Sun -> index 6, 1=Mon -> index 0)
  let firstDayIdx = firstDay.getDay() - 1;
  if (firstDayIdx === -1) firstDayIdx = 6;
  
  const totalDays = lastDay.getDate() + firstDayIdx;
  return Math.ceil(totalDays / 7);
}

export function useInfiniteMonths() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const [range, setRange] = useState({
    startOffset: -12, // 12 months back initially
    endOffset: 12     // 12 months forward initially
  });

  const generateMonth = useCallback((offset: number): MonthInfo => {
    const date = new Date(currentYear, currentMonth + offset, 1);
    const y = date.getFullYear();
    const m = date.getMonth();
    const weeks = getWeeksCount(y, m);
    
    return {
      id: `${y}-${m.toString().padStart(2, '0')}`,
      year: y,
      month: m,
      label: `${MONTH_NAMES[m]} ${y}`,
      weeks
    };
  }, [currentYear, currentMonth]);

  const months = useMemo(() => {
    const list: MonthInfo[] = [];
    for (let i = range.startOffset; i <= range.endOffset; i++) {
      list.push(generateMonth(i));
    }
    return list;
  }, [range, generateMonth]);

  const loadMoreFuture = useCallback(() => {
    setRange(prev => ({
      ...prev,
      endOffset: prev.endOffset + 8
    }));
  }, []);

  const loadMorePast = useCallback(() => {
    setRange(prev => ({
      ...prev,
      startOffset: prev.startOffset - 8
    }));
  }, []);

  const getInitialIndex = useCallback(() => {
    // Offset 0 is today's month
    // Range starts at startOffset
    // So today's month index is abs(startOffset)
    return Math.abs(range.startOffset);
  }, [range.startOffset]);

  const reset = useCallback(() => {
    setRange({
      startOffset: -12,
      endOffset: 12
    });
  }, []);

  return {
    months,
    loadMoreFuture,
    loadMorePast,
    getInitialIndex,
   reset,
    todayMonthId: `${currentYear}-${currentMonth.toString().padStart(2, '0')}`,
    startOffset: range.startOffset
  };
}