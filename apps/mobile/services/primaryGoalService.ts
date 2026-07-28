import { PrimaryGoalPeriod, GoalPeriod } from '@/types/workout';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function convertGoalValue(value: number, from: GoalPeriod, to: GoalPeriod): number {
  let yearly: number = 0;
  switch (from) {
    case 'week': yearly = value * 52; break;
    case 'month': yearly = value * 12; break;
    case 'year': yearly = value; break;
    default: yearly = value; break;
  }
  switch (to) {
    case 'week': return Math.round((yearly / 52) * 10) / 10;
    case 'month': return Math.round((yearly / 12) * 10) / 10;
    case 'year': return yearly;
    default: return yearly;
  }
}

function sorted(periods: PrimaryGoalPeriod[]): PrimaryGoalPeriod[] {
  return [...periods].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
}

export function getActiveGoalForDate(periods: PrimaryGoalPeriod[], date: Date): PrimaryGoalPeriod | null {
  const dateStr = date.toISOString().slice(0, 10);
  const s = sorted(periods);
  let active: PrimaryGoalPeriod | null = null;
  for (const p of s) {
    if (p.validFrom <= dateStr) active = p;
    else break;
  }
  return active;
}

export function getMonthTarget(periods: PrimaryGoalPeriod[], year: number, month: number): number {
  if (periods.length === 0) return 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthStartStr = `${year}-${pad(month + 1)}-01`;
  const monthEndStr = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;

  const s = sorted(periods);

  const transitions: { day: number; monthlyTarget: number }[] = [];

  for (const p of s) {
    if (p.validFrom > monthEndStr) break;
    const monthlyTarget = convertGoalValue(p.inputTarget, p.inputPeriod, 'month');
    if (p.validFrom <= monthStartStr) {
      if (transitions.length > 0 && transitions[0].day === 1) {
        transitions[0].monthlyTarget = monthlyTarget;
      } else {
        transitions.unshift({ day: 1, monthlyTarget });
      }
    } else {
      const day = parseInt(p.validFrom.slice(8, 10));
      transitions.push({ day, monthlyTarget });
    }
  }

  if (transitions.length === 0) return 0;

  transitions.sort((a, b) => a.day - b.day);

  let total = 0;
  for (let i = 0; i < transitions.length; i++) {
    const fromDay = transitions[i].day;
    const toDay = i + 1 < transitions.length ? transitions[i + 1].day - 1 : daysInMonth;
    total += transitions[i].monthlyTarget * ((toDay - fromDay + 1) / daysInMonth);
  }

  return Math.round(total * 10) / 10;
}

export function getYearTarget(periods: PrimaryGoalPeriod[], year: number): number {
  let total = 0;
  for (let m = 0; m < 12; m++) {
    total += getMonthTarget(periods, year, m);
  }
  return Math.round(total * 10) / 10;
}

export function getEarliestStart(periods: PrimaryGoalPeriod[]): Date | null {
  if (periods.length === 0) return null;
  const s = sorted(periods);
  return new Date(s[0].validFrom);
}

export function getYearExpectedProgress(periods: PrimaryGoalPeriod[], year: number, refDate: Date): { target: number; expected: number; fractionElapsed: number } {
  const target = getYearTarget(periods, year);
  if (target === 0) return { target: 0, expected: 0, fractionElapsed: 0 };
  let expected = 0;
  for (let m = 0; m < 12; m++) {
    const mTarget = getMonthTarget(periods, year, m);
    const monthEnd = new Date(year, m + 1, 0);
    const monthStart = new Date(year, m, 1);
    if (refDate >= monthEnd) {
      expected += mTarget;
    } else if (refDate >= monthStart) {
      const daysInMonth = monthEnd.getDate();
      const activeGoal = getActiveGoalForDate(periods, monthEnd);
      const goalStart = activeGoal ? new Date(activeGoal.validFrom) : null;
      let goalStartDay = 1;
      if (goalStart && goalStart.getFullYear() === year && goalStart.getMonth() === m) {
        goalStartDay = goalStart.getDate();
      }
      const activeDaysInMonth = daysInMonth - goalStartDay + 1;
      if (activeDaysInMonth <= 0) continue;
      const daysElapsed = Math.max(0, refDate.getDate() - goalStartDay + refDate.getHours() / 24);
      expected += mTarget * Math.min(1, daysElapsed / activeDaysInMonth);
    }
  }
  const fractionElapsed = target > 0 ? expected / target : 0;
  return { target, expected, fractionElapsed };
}

function rowToPeriod(row: any): PrimaryGoalPeriod {
  return {
    id: row.id,
    userId: row.user_id || "",
    inputPeriod: row.input_period as GoalPeriod,
    inputTarget: row.input_target,
    validFrom: row.valid_from,
    createdAt: row.created_at,
  };
}

export const primaryGoalService = {
  async getAll(userId?: string): Promise<PrimaryGoalPeriod[]> {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('primary_goal_periods')
      .select('*')
      .eq('user_id', userId)
      .order('valid_from', { ascending: true });
    
    if (error) {
      console.error("Database failed to load primary goals:", error);
      throw error;
    }
    return (data || []).map(rowToPeriod);
  },

  async add(userId: string | undefined, data: { inputPeriod: GoalPeriod; inputTarget: number; validFrom: string }): Promise<PrimaryGoalPeriod> {
    if (!userId) throw new Error("User must be logged in to add a primary goal");

    try {
      // Check if one exists with same validFrom
      const { data: existing } = await supabase
        .from('primary_goal_periods')
        .select('id')
        .eq('user_id', userId)
        .eq('valid_from', data.validFrom)
        .maybeSingle();

      if (existing) {
        const { data: row, error } = await supabase
          .from('primary_goal_periods')
          .update({
            input_period: data.inputPeriod,
            input_target: data.inputTarget,
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return rowToPeriod(row);
      }

      const { data: row, error } = await supabase
        .from('primary_goal_periods')
        .insert({
          user_id: userId,
          input_period: data.inputPeriod,
          input_target: data.inputTarget,
          valid_from: data.validFrom,
        })
        .select()
        .single();
      if (error) throw error;
      return rowToPeriod(row);
    } catch (err) {
      console.error("Could not save primary goal to Supabase:", err);
      throw err;
    }
  },

  async update(id: string, data: Partial<Pick<PrimaryGoalPeriod, 'inputPeriod' | 'inputTarget' | 'validFrom'>>): Promise<void> {
    try {
      const updateObj: any = {};
      if (data.inputPeriod !== undefined) updateObj.input_period = data.inputPeriod;
      if (data.inputTarget !== undefined) updateObj.input_target = data.inputTarget;
      if (data.validFrom !== undefined) updateObj.valid_from = data.validFrom;
      const { error } = await supabase.from('primary_goal_periods').update(updateObj).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Could not update primary goal on Supabase:", err);
      throw err;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('primary_goal_periods').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Could not delete primary goal on Supabase:", err);
      throw err;
    }
  },
};