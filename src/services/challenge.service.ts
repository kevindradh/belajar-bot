import { supabase } from '../lib/supabase.js';
import { getTodayWIB } from '../lib/utils.js';
import type { Challenge, DifficultyLevel } from '../types/index.js';

/**
 * Get a random challenge, optionally filtered by difficulty and category.
 * Excludes challenges the user has already solved.
 */
export async function getRandomChallenge(
  difficulty?: DifficultyLevel,
  categorySlug?: string,
  excludeIds: string[] = [],
): Promise<Challenge | null> {
  let query = supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true);

  if (difficulty) {
    query = query.eq('difficulty', difficulty);
  }

  if (excludeIds.length > 0) {
    // Supabase doesn't support NOT IN directly, use filter
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ERROR] getRandomChallenge:', error);
    return null;
  }

  let challenges = data as Challenge[];

  // Filter by category if specified
  if (categorySlug) {
    const { data: categoryData } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();

    if (categoryData) {
      const { data: ccData } = await supabase
        .from('challenge_categories')
        .select('challenge_id')
        .eq('category_id', categoryData.id);

      const categoryIds = new Set((ccData || []).map(cc => cc.challenge_id));
      challenges = challenges.filter(c => categoryIds.has(c.id));
    }
  }

  if (challenges.length === 0) return null;

  // Pick random
  const randomIndex = Math.floor(Math.random() * challenges.length);
  return challenges[randomIndex];
}

/**
 * Get challenge by ID.
 */
export async function getChallengeById(id: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Challenge;
}

/**
 * Get challenge by slug.
 */
export async function getChallengeBySlug(slug: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data as Challenge;
}

/**
 * Get today's daily challenge for a guild.
 */
export async function getTodayDailyChallenge(guildId: string): Promise<Challenge | null> {
  const today = getTodayWIB();

  const { data } = await supabase
    .from('daily_challenges')
    .select('challenge_id')
    .eq('guild_id', guildId)
    .eq('scheduled_for', today)
    .single();

  if (!data) return null;

  return getChallengeById(data.challenge_id);
}

/**
 * Create a daily challenge for a guild.
 * Picks a challenge that hasn't been a daily for this guild yet.
 */
export async function createDailyChallenge(guildId: string): Promise<Challenge | null> {
  const today = getTodayWIB();

  // Check if already exists
  const existing = await getTodayDailyChallenge(guildId);
  if (existing) return existing;

  // Get challenges already used as daily for this guild
  const { data: usedDailies } = await supabase
    .from('daily_challenges')
    .select('challenge_id')
    .eq('guild_id', guildId);

  const usedIds = (usedDailies || []).map(d => d.challenge_id);

  // Pick a new one
  let query = supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true)
    .eq('is_daily_eligible', true);

  if (usedIds.length > 0) {
    query = query.not('id', 'in', `(${usedIds.join(',')})`);
  }

  const { data: candidates } = await query;

  if (!candidates || candidates.length === 0) {
    // All challenges used — recycle by picking random from all eligible
    const { data: allEligible } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .eq('is_daily_eligible', true);

    if (!allEligible || allEligible.length === 0) return null;
    const challenge = allEligible[Math.floor(Math.random() * allEligible.length)] as Challenge;

    await supabase.from('daily_challenges').insert({
      guild_id: guildId,
      challenge_id: challenge.id,
      scheduled_for: today,
    });

    return challenge;
  }

  const challenge = candidates[Math.floor(Math.random() * candidates.length)] as Challenge;

  await supabase.from('daily_challenges').insert({
    guild_id: guildId,
    challenge_id: challenge.id,
    scheduled_for: today,
  });

  return challenge;
}

/**
 * Get IDs of challenges the user has already solved.
 */
export async function getUserSolvedChallengeIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('submissions')
    .select('challenge_id')
    .eq('user_id', userId)
    .eq('status', 'passed');

  if (!data) return [];
  return [...new Set(data.map(s => s.challenge_id))];
}

/**
 * Increment challenge attempt/solve counters.
 */
export async function incrementChallengeStats(challengeId: string, solved: boolean): Promise<void> {
  const { data: challenge } = await supabase
    .from('challenges')
    .select('total_attempts, total_solves')
    .eq('id', challengeId)
    .single();

  if (!challenge) return;

  await supabase
    .from('challenges')
    .update({
      total_attempts: challenge.total_attempts + 1,
      total_solves: solved ? challenge.total_solves + 1 : challenge.total_solves,
    })
    .eq('id', challengeId);
}
