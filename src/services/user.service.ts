import { supabase } from '../lib/supabase.js';
import { calculateLevel, formatNumber } from '../lib/utils.js';
import { LEVELS } from '../lib/constants.js';
import type { User, UserProfile, AddXPResult } from '../types/index.js';

/**
 * Get or create a user by Discord ID.
 */
export async function getOrCreateUser(discordId: string, username: string, avatarUrl?: string | null): Promise<User> {
  // Try to get existing user
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', discordId)
    .single();

  if (existing) {
    // Update username if changed
    if (existing.username !== username) {
      await supabase
        .from('users')
        .update({ username, avatar_url: avatarUrl })
        .eq('discord_id', discordId);
      existing.username = username;
    }
    return existing as User;
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      discord_id: discordId,
      username,
      avatar_url: avatarUrl,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return newUser as User;
}

/**
 * Add XP to a user and handle level-up.
 */
export async function addXP(userId: string, amount: number): Promise<AddXPResult> {
  // Get current XP
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('xp, level')
    .eq('id', userId)
    .single();

  if (fetchError || !user) throw new Error('User not found');

  const newXP = user.xp + amount;
  const { level: newLevel, name: levelName } = calculateLevel(newXP);
  const leveledUp = newLevel > user.level;

  // Update user
  const { error: updateError } = await supabase
    .from('users')
    .update({ xp: newXP, level: newLevel })
    .eq('id', userId);

  if (updateError) throw new Error(`Failed to update XP: ${updateError.message}`);

  return { newXP, leveledUp, newLevel, levelName };
}

/**
 * Deduct XP from a user (for hints).
 */
export async function deductXP(userId: string, amount: number): Promise<number> {
  const { data: user } = await supabase
    .from('users')
    .select('xp')
    .eq('id', userId)
    .single();

  if (!user) throw new Error('User not found');

  const newXP = Math.max(0, user.xp - amount);

  await supabase
    .from('users')
    .update({ xp: newXP })
    .eq('id', userId);

  return newXP;
}

/**
 * Get full user profile with badges and stats.
 */
export async function getUserProfile(discordId: string): Promise<UserProfile | null> {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', discordId)
    .single();

  if (!user) return null;

  // Get badges
  const { data: badges } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', user.id);

  // Get submission stats
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, status, challenge_id')
    .eq('user_id', user.id);

  const totalSubmissions = submissions?.length || 0;

  // Count unique solved challenges
  const solvedChallengeIds = new Set(
    submissions?.filter(s => s.status === 'passed').map(s => s.challenge_id) || []
  );
  const totalSolved = solvedChallengeIds.size;

  // Get difficulty breakdown of solved challenges
  let easySolved = 0, mediumSolved = 0, hardSolved = 0;

  if (solvedChallengeIds.size > 0) {
    const { data: solvedChallenges } = await supabase
      .from('challenges')
      .select('id, difficulty')
      .in('id', Array.from(solvedChallengeIds));

    for (const ch of solvedChallenges || []) {
      if (ch.difficulty === 'easy') easySolved++;
      else if (ch.difficulty === 'medium') mediumSolved++;
      else if (ch.difficulty === 'hard') hardSolved++;
    }
  }

  return {
    user: user as User,
    badges: (badges || []) as any[],
    totalSolved,
    totalSubmissions,
    easySolved,
    mediumSolved,
    hardSolved,
  };
}
