import { Client, Collection, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Discord client instance with minimal required intents.
 * Intents follow the principle from discord-bot-architect skill:
 * "Request only required intents (minimize privileged intents)"
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,             // Required for guild events
    GatewayIntentBits.GuildMessages,      // For monitoring channels
  ],
});

// Extend client with commands collection
client.commands = new Collection();

export default client;

// Augment discord.js Client type to include commands
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, {
      data: unknown;
      execute: (interaction: import('discord.js').ChatInputCommandInteraction) => Promise<void>;
    }>;
  }
}
