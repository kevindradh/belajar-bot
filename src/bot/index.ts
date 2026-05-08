import dotenv from 'dotenv';
dotenv.config();

import client from './client.js';

// Import events
import * as readyEvent from './events/ready.js';
import * as interactionCreateEvent from './events/interactionCreate.js';
import * as guildCreateEvent from './events/guildCreate.js';

// Import commands
import * as challengeCommand from '../commands/challenge.js';
import * as submitCommand from '../commands/submit.js';
import * as dailyCommand from '../commands/daily.js';
import * as profileCommand from '../commands/profile.js';
import * as leaderboardCommand from '../commands/leaderboard.js';
import * as streakCommand from '../commands/streak.js';
import * as hintCommand from '../commands/hint.js';
import * as categoriesCommand from '../commands/categories.js';
import * as setupCommand from '../commands/admin/setup.js';
import * as setChannelCommand from '../commands/admin/set-channel.js';

// Import scheduler
import { startScheduler } from '../scheduler/dailyChallenge.js';

// ============================================================
// Register Events
// ============================================================

const events = [readyEvent, interactionCreateEvent, guildCreateEvent];

for (const event of events) {
  if ((event as any).once) {
    client.once((event as any).name, (...args: unknown[]) => (event as any).execute(...args));
  } else {
    client.on((event as any).name, (...args: unknown[]) => (event as any).execute(...args));
  }
}

// ============================================================
// Register Commands
// ============================================================

const commands = [
  challengeCommand,
  submitCommand,
  dailyCommand,
  profileCommand,
  leaderboardCommand,
  streakCommand,
  hintCommand,
  categoriesCommand,
  setupCommand,
  setChannelCommand,
];

for (const command of commands) {
  const cmd = command as any;
  if ('data' in cmd && 'execute' in cmd) {
    client.commands.set(cmd.data.name, cmd);
  }
}

// ============================================================
// Login
// ============================================================

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN is not set in .env file!');
  console.error('   Please create a bot at https://discord.com/developers');
  console.error('   and add the token to your .env file.');
  process.exit(1);
}

client.login(token)
  .then(() => {
    // Start schedulers after bot is ready
    startScheduler(client);
  })
  .catch((error) => {
    console.error('❌ Failed to login to Discord:', error);
    process.exit(1);
  });

// ============================================================
// Graceful Shutdown
// ============================================================

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down CodeDojo...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down CodeDojo...');
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('[FATAL] Unhandled promise rejection:', error);
});
