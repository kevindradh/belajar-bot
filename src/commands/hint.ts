import { SlashCommandBuilder, type ChatInputCommandInteraction, type ButtonInteraction } from 'discord.js';
import { getOrCreateUser, deductXP } from '../services/user.service.js';
import { getChallengeById } from '../services/challenge.service.js';
import { activeChallenges } from '../lib/utils.js';
import { HINT_XP_COST } from '../lib/constants.js';

export const data = new SlashCommandBuilder()
  .setName('hint')
  .setDescription('Minta hint untuk soal aktif (-10 XP)');

export async function execute(interaction: ChatInputCommandInteraction) {
  await processHint(interaction);
}

// Handle button click
export async function executeButton(interaction: ButtonInteraction) {
  await processHint(interaction);
}

async function processHint(interaction: ChatInputCommandInteraction | ButtonInteraction) {
  const active = activeChallenges.get(interaction.user.id);
  if (!active) {
    await interaction.reply({ content: '❌ Kamu belum mengambil soal. Gunakan `/challenge` dulu.', ephemeral: true });
    return;
  }
  const challenge = await getChallengeById(active.challengeId);
  if (!challenge || challenge.hints.length === 0) {
    await interaction.reply({ content: '💡 Tidak ada hint untuk soal ini.', ephemeral: true });
    return;
  }
  if (active.hintIndex >= challenge.hints.length) {
    await interaction.reply({ content: '💡 Kamu sudah melihat semua hint untuk soal ini.', ephemeral: true });
    return;
  }
  const user = await getOrCreateUser(interaction.user.id, interaction.user.username);
  await deductXP(user.id, HINT_XP_COST);
  const hint = challenge.hints[active.hintIndex];
  active.hintIndex++;
  activeChallenges.set(interaction.user.id, active);

  await interaction.reply({
    content: `💡 **Hint ${active.hintIndex}/${challenge.hints.length}** (−${HINT_XP_COST} XP)\n\n${hint}`,
    ephemeral: true,
  });
}
