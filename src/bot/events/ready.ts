import { Events } from 'discord.js';
import type { Client } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client<true>) {
  console.log(`\n🥋 CodeDojo is online!`);
  console.log(`   Logged in as: ${client.user.tag}`);
  console.log(`   Serving ${client.guilds.cache.size} server(s)`);
  console.log(`   Commands loaded: ${client.commands.size}`);
  console.log(`   Ready at: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`);
}
