import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { supabase } from '../../lib/supabase.js';
import { BOT_CONFIG } from '../../lib/constants.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Setup awal CodeDojo di server ini')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: '❌ Command ini hanya bisa digunakan di server.', ephemeral: true });
    return;
  }
  await interaction.deferReply();
  const { data: existing } = await supabase.from('guilds').select('*').eq('guild_id', interaction.guildId).single();
  if (existing) {
    await supabase.from('guilds').update({ guild_name: interaction.guild?.name, is_active: true }).eq('guild_id', interaction.guildId);
  } else {
    await supabase.from('guilds').insert({ guild_id: interaction.guildId, guild_name: interaction.guild?.name });
  }
  const { data: guild } = await supabase.from('guilds').select('*').eq('guild_id', interaction.guildId).single();

  const embed = new EmbedBuilder()
    .setColor(BOT_CONFIG.color)
    .setTitle('⚙️ CodeDojo Setup')
    .setDescription(`**${BOT_CONFIG.name}** berhasil di-setup di **${interaction.guild?.name}**!`)
    .addFields(
      { name: '📢 Challenge Channel', value: guild?.challenge_channel ? `<#${guild.challenge_channel}>` : '_Belum diset_', inline: true },
      { name: '📅 Daily Channel', value: guild?.daily_channel ? `<#${guild.daily_channel}>` : '_Belum diset_', inline: true },
      { name: '⏰ Daily Time', value: `${guild?.daily_time || '08:00:00'} (${guild?.timezone || 'Asia/Jakarta'})`, inline: true },
    )
    .addFields({ name: '📌 Next Steps', value: '1. Gunakan `/set-channel type:challenge channel:#channel`\n2. Gunakan `/set-channel type:daily channel:#channel`\n3. Bot akan auto-post daily challenge!' })
    .setFooter({ text: BOT_CONFIG.name })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
