import { supabase } from '../lib/supabase.js';
import type { BadgeTrigger, UserBadge } from '../types/index.js';

interface BadgeContext {
  userId: string;
  isFirstSolve?: boolean;
  challengeDifficulty?: string;
  streakCurrent?: number;
  solveTimeSec?: number;
  guildId?: string | null;
}

export async function checkAndAwardBadges(ctx: BadgeContext): Promise<BadgeTrigger[]> {
  const awarded: BadgeTrigger[] = [];
  const { userId } = ctx;

  // first_solve
  if (ctx.isFirstSolve) {
    const { data: existing } = await supabase
      .from('user_badges').select('id').eq('user_id', userId).eq('badge_key', 'first_solve').single();
    if (!existing) {
      // Check if this is user's very first passed submission
      const { data: subs } = await supabase
        .from('submissions').select('id').eq('user_id', userId).eq('status', 'passed').limit(2);
      if (subs && subs.length <= 1) {
        await supabase.from('user_badges').insert({ user_id: userId, badge_key: 'first_solve' });
        awarded.push('first_solve');
      }
    }
  }

  // hard_first_solve
  if (ctx.challengeDifficulty === 'hard' && ctx.isFirstSolve) {
    const { data: existing } = await supabase
      .from('user_badges').select('id').eq('user_id', userId).eq('badge_key', 'hard_first_solve').single();
    if (!existing) {
      await supabase.from('user_badges').insert({ user_id: userId, badge_key: 'hard_first_solve' });
      awarded.push('hard_first_solve');
    }
  }

  // streak_7
  if (ctx.streakCurrent && ctx.streakCurrent >= 7) {
    const { data: existing } = await supabase
      .from('user_badges').select('id').eq('user_id', userId).eq('badge_key', 'streak_7').single();
    if (!existing) {
      await supabase.from('user_badges').insert({ user_id: userId, badge_key: 'streak_7' });
      awarded.push('streak_7');
    }
  }

  // streak_30
  if (ctx.streakCurrent && ctx.streakCurrent >= 30) {
    const { data: existing } = await supabase
      .from('user_badges').select('id').eq('user_id', userId).eq('badge_key', 'streak_30').single();
    if (!existing) {
      await supabase.from('user_badges').insert({ user_id: userId, badge_key: 'streak_30' });
      awarded.push('streak_30');
    }
  }

  // speedster — solve in < 60 seconds
  if (ctx.solveTimeSec !== undefined && ctx.solveTimeSec < 60) {
    const { data: existing } = await supabase
      .from('user_badges').select('id').eq('user_id', userId).eq('badge_key', 'speedster').single();
    if (!existing) {
      await supabase.from('user_badges').insert({ user_id: userId, badge_key: 'speedster' });
      awarded.push('speedster');
    }
  }

  // polyglot — passed in 3+ different languages
  const { data: langSubs } = await supabase
    .from('submissions').select('language').eq('user_id', userId).eq('status', 'passed');
  if (langSubs) {
    const uniqueLangs = new Set(langSubs.map(s => s.language));
    if (uniqueLangs.size >= 3) {
      const { data: existing } = await supabase
        .from('user_badges').select('id').eq('user_id', userId).eq('badge_key', 'polyglot').single();
      if (!existing) {
        await supabase.from('user_badges').insert({ user_id: userId, badge_key: 'polyglot' });
        awarded.push('polyglot');
      }
    }
  }

  return awarded;
}

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const { data } = await supabase
    .from('user_badges').select('*').eq('user_id', userId).order('earned_at');
  return (data || []) as UserBadge[];
}
