import { supabase } from '../lib/supabase.js';
import { getTodayWIB, daysDifference } from '../lib/utils.js';
import type { StreakUpdateResult } from '../types/index.js';

export async function updateStreak(userId: string): Promise<StreakUpdateResult> {
  const { data: user } = await supabase
    .from('users').select('streak_current, streak_longest, streak_freeze, last_solved_at')
    .eq('id', userId).single();
  if (!user) throw new Error('User not found');

  const today = getTodayWIB();
  let { streak_current, streak_longest, streak_freeze, last_solved_at } = user;
  let streakChanged = false;
  let freezeUsed = false;

  if (last_solved_at === today) {
    // Already solved today — no change
    return { streakCurrent: streak_current, streakLongest: streak_longest, streakChanged: false, freezeUsed: false };
  }

  if (!last_solved_at) {
    streak_current = 1;
    streakChanged = true;
  } else {
    const diff = daysDifference(last_solved_at, today);
    if (diff === 1) {
      streak_current += 1;
      streakChanged = true;
    } else if (diff === 2 && streak_freeze > 0) {
      streak_freeze -= 1;
      streak_current += 1;
      streakChanged = true;
      freezeUsed = true;
    } else {
      streak_current = 1;
      streakChanged = true;
    }
  }

  streak_longest = Math.max(streak_longest, streak_current);

  await supabase.from('users').update({
    streak_current, streak_longest, streak_freeze, last_solved_at: today,
  }).eq('id', userId);

  return { streakCurrent: streak_current, streakLongest: streak_longest, streakChanged, freezeUsed };
}

export async function useStreakFreeze(userId: string): Promise<{ success: boolean; remaining: number }> {
  const { data: user } = await supabase
    .from('users').select('streak_freeze').eq('id', userId).single();
  if (!user || user.streak_freeze <= 0) return { success: false, remaining: 0 };
  const remaining = user.streak_freeze - 1;
  await supabase.from('users').update({ streak_freeze: remaining }).eq('id', userId);
  return { success: true, remaining };
}

export async function resetWeeklyFreeze(): Promise<number> {
  const { data, error } = await supabase.from('users').update({ streak_freeze: 1 }).neq('streak_freeze', 1).select('id');
  return data?.length || 0;
}
