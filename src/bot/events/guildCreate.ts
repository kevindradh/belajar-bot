import { Events, type Guild } from 'discord.js';
import { supabase } from '../../lib/supabase.js';

export const name = Events.GuildCreate;

export async function execute(guild: Guild) {
  console.log(`[INFO] Joined new guild: ${guild.name} (${guild.id})`);

  try {
    // Upsert guild to database
    const { error } = await supabase
      .from('guilds')
      .upsert(
        {
          guild_id: guild.id,
          guild_name: guild.name,
          is_active: true,
        },
        { onConflict: 'guild_id' }
      );

    if (error) {
      console.error(`[ERROR] Failed to save guild ${guild.id}:`, error);
    } else {
      console.log(`[INFO] Guild saved to DB: ${guild.name}`);
    }
  } catch (err) {
    console.error(`[ERROR] guildCreate handler:`, err);
  }
}
