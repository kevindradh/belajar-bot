import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

// Import command data
import { data as challengeData } from '../src/commands/challenge.js';
import { data as submitData } from '../src/commands/submit.js';
import { data as dailyData } from '../src/commands/daily.js';
import { data as profileData } from '../src/commands/profile.js';
import { data as leaderboardData } from '../src/commands/leaderboard.js';
import { data as streakData } from '../src/commands/streak.js';
import { data as hintData } from '../src/commands/hint.js';
import { data as categoriesData } from '../src/commands/categories.js';
import { data as setupData } from '../src/commands/admin/setup.js';
import { data as setChannelData } from '../src/commands/admin/set-channel.js';

const commands = [
  challengeData, submitData, dailyData, profileData,
  leaderboardData, streakData, hintData, categoriesData,
  setupData, setChannelData,
].map(cmd => (cmd as any).toJSON());

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.DISCORD_GUILD_ID;

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`🔄 Refreshing ${commands.length} slash commands...`);

    if (guildId) {
      // Guild commands (instant, for development)
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
      console.log(`✅ Registered ${(data as any[]).length} guild commands (instant)`);
    } else {
      // Global commands (can take up to 1 hour)
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log(`✅ Registered ${(data as any[]).length} global commands (may take ~1h to propagate)`);
    }
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
