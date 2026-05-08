import cron from 'node-cron';
import type { Client, TextChannel } from 'discord.js';
import { supabase } from '../lib/supabase.js';
import { createDailyChallenge } from '../services/challenge.service.js';
import { resetWeeklyFreeze } from '../services/streak.service.js';
import { buildDailyChallengeEmbed, buildChallengeButtons } from '../lib/embeds.js';

export function startScheduler(client: Client) {
  // Daily challenge — every day at 08:00 WIB (01:00 UTC)
  cron.schedule('0 1 * * *', async () => {
    console.log('[SCHEDULER] Running daily challenge...');
    try {
      const { data: guilds } = await supabase
        .from('guilds').select('guild_id, guild_name, daily_channel')
        .eq('is_active', true).not('daily_channel', 'is', null);

      for (const guild of guilds || []) {
        try {
          const challenge = await createDailyChallenge(guild.guild_id);
          if (!challenge) continue;

          const channel = await client.channels.fetch(guild.daily_channel!) as TextChannel;
          if (!channel) continue;

          const embed = buildDailyChallengeEmbed(challenge, guild.guild_name || 'Server');
          const buttons = buildChallengeButtons();
          const msg = await channel.send({ embeds: [embed], components: [buttons] });

          // Save message ID
          await supabase.from('daily_challenges')
            .update({ message_id: msg.id, posted_at: new Date().toISOString() })
            .eq('guild_id', guild.guild_id)
            .eq('challenge_id', challenge.id);

          console.log(`[SCHEDULER] Daily posted to ${guild.guild_name}`);
        } catch (err) {
          console.error(`[SCHEDULER] Failed for guild ${guild.guild_id}:`, err);
        }
      }
    } catch (err) {
      console.error('[SCHEDULER] Daily challenge error:', err);
    }
  }, { timezone: 'Asia/Jakarta' });

  // Reset streak freeze — every Monday at 00:00 WIB
  cron.schedule('0 17 * * 0', async () => {
    // 17:00 UTC Sunday = 00:00 WIB Monday
    console.log('[SCHEDULER] Resetting weekly streak freeze...');
    try {
      const count = await resetWeeklyFreeze();
      console.log(`[SCHEDULER] Reset streak freeze for ${count} users`);
    } catch (err) {
      console.error('[SCHEDULER] Streak freeze reset error:', err);
    }
  }, { timezone: 'Asia/Jakarta' });

  console.log('📅 Scheduler started: Daily challenge (08:00 WIB), Streak freeze reset (Monday 00:00 WIB)');
}
