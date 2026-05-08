import { SlashCommandBuilder, type ChatInputCommandInteraction, type ButtonInteraction } from 'discord.js';
import { getOrCreateUser } from '../services/user.service.js';
import { buildStreakEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('streak')
  .setDescription('Cek streak & info freeze');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
  const embed = buildStreakEmbed(user);
  await interaction.editReply({ embeds: [embed] });
}
