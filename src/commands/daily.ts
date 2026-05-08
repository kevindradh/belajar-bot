import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { createDailyChallenge } from '../services/challenge.service.js';
import { buildDailyChallengeEmbed, buildChallengeButtons } from '../lib/embeds.js';
import { activeChallenges } from '../lib/utils.js';

export const data = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('Lihat soal harian server');

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: '❌ Command ini hanya bisa digunakan di server.', ephemeral: true });
    return;
  }
  await interaction.deferReply();
  const guildName = interaction.guild?.name || 'Server';
  const challenge = await createDailyChallenge(interaction.guildId);
  if (!challenge) {
    await interaction.editReply({ content: '😔 Belum ada soal yang tersedia untuk daily challenge.' });
    return;
  }
  activeChallenges.set(interaction.user.id, { challengeId: challenge.id, startedAt: new Date(), hintIndex: 0 });
  const embed = buildDailyChallengeEmbed(challenge, guildName);
  const buttons = buildChallengeButtons();
  await interaction.editReply({ embeds: [embed], components: [buttons] });
}
