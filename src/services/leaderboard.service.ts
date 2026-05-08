import { supabase } from '../lib/supabase.js';
import type { LeaderboardEntry } from '../types/index.js';

export async function getServerLeaderboard(
  guildId: string,
  period: 'weekly' | 'monthly' | 'alltime' = 'alltime',
  limit: number = 10,
): Promise<LeaderboardEntry[]> {
  let dateFilter: string | null = null;
  const now = new Date();

  if (period === 'weekly') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateFilter = weekAgo.toISOString();
  } else if (period === 'monthly') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateFilter = monthAgo.toISOString();
  }

  // Query submissions for this guild grouped by user
  let query = supabase
    .from('submissions')
    .select('user_id, xp_earned')
    .eq('guild_id', guildId)
    .eq('status', 'passed');

  if (dateFilter) {
    query = query.gte('submitted_at', dateFilter);
  }

  const { data: submissions } = await query;
  if (!submissions || submissions.length === 0) return [];

  // Aggregate XP per user
  const xpMap = new Map<string, number>();
  for (const sub of submissions) {
    xpMap.set(sub.user_id, (xpMap.get(sub.user_id) || 0) + sub.xp_earned);
  }

  // Sort by XP descending
  const sorted = Array.from(xpMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  // Get user info
  const userIds = sorted.map(([id]) => id);
  const { data: users } = await supabase
    .from('users').select('id, discord_id, username, xp')
    .in('id', userIds);

  const userMap = new Map((users || []).map(u => [u.id, u]));

  return sorted.map(([userId, xp], index) => {
    const user = userMap.get(userId);
    return {
      discord_id: user?.discord_id || 'unknown',
      username: user?.username || 'Unknown',
      xp: period === 'alltime' ? (user?.xp || 0) : xp,
      rank: index + 1,
    };
  });
}
