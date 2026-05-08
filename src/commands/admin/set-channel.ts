import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction } from 'discord.js';
import { supabase } from '../../lib/supabase.js';

export const data = new SlashCommandBuilder()
  .setName('set-channel')
  .setDescription('Set channel untuk challenge atau daily')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt => opt.setName('type').setDescription('Tipe channel').setRequired(true)
    .addChoices({ name: 'Challenge', value: 'challenge' }, { name: 'Daily', value: 'daily' }))
  .addChannelOption(opt => opt.setName('channel').setDescription('Channel tujuan').setRequired(true)
    .addChannelTypes(ChannelType.GuildText));

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: '❌ Hanya bisa digunakan di server.', ephemeral: true });
    return;
  }
  const type = interaction.options.getString('type', true);
  const channel = interaction.options.getChannel('channel', true);
  const field = type === 'challenge' ? 'challenge_channel' : 'daily_channel';

  await supabase.from('guilds').upsert({
    guild_id: interaction.guildId,
    guild_name: interaction.guild?.name,
    [field]: channel.id,
  }, { onConflict: 'guild_id' });

  await interaction.reply({
    content: `✅ **${type === 'challenge' ? 'Challenge' : 'Daily'}** channel diset ke <#${channel.id}>`,
  });
}
