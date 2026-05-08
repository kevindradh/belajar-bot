import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { getServerLeaderboard } from '../services/leaderboard.service.js';
import { buildLeaderboardEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Top 10 XP server')
  .addStringOption(opt => opt.setName('period').setDescription('Periode')
    .addChoices(
      { name: 'Weekly', value: 'weekly' },
      { name: 'Monthly', value: 'monthly' },
      { name: 'All Time', value: 'alltime' },
    ));

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: '❌ Command ini hanya bisa digunakan di server.', ephemeral: true });
    return;
  }
  await interaction.deferReply();
  const period = (interaction.options.getString('period') || 'alltime') as 'weekly' | 'monthly' | 'alltime';
  const entries = await getServerLeaderboard(interaction.guildId, period);
  const guildName = interaction.guild?.name || 'Server';
  const embed = buildLeaderboardEmbed(entries, guildName, period);
  await interaction.editReply({ embeds: [embed] });
}
