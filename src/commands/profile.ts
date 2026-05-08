import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser, getUserProfile } from '../services/user.service.js';
import { buildProfileEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Lihat profil & statistik')
  .addUserOption(opt => opt.setName('user').setDescription('User yang ingin dilihat'));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const targetUser = interaction.options.getUser('user') || interaction.user;
  await getOrCreateUser(targetUser.id, targetUser.username, targetUser.displayAvatarURL());
  const profile = await getUserProfile(targetUser.id);
  if (!profile) {
    await interaction.editReply({ content: '❌ Profil tidak ditemukan.' });
    return;
  }
  const embed = buildProfileEmbed(profile);
  await interaction.editReply({ embeds: [embed] });
}
