import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { supabase } from '../lib/supabase.js';
import { buildCategoriesEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('categories')
  .setDescription('Daftar kategori soal');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const { data: categories } = await supabase
    .from('categories').select('slug, name, icon, description').order('name');
  const embed = buildCategoriesEmbed(categories || []);
  await interaction.editReply({ embeds: [embed] });
}
