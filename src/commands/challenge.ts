import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { getOrCreateUser } from '../services/user.service.js';
import { getRandomChallenge, getUserSolvedChallengeIds } from '../services/challenge.service.js';
import { buildChallengeEmbed, buildChallengeButtons } from '../lib/embeds.js';
import { activeChallenges } from '../lib/utils.js';
import type { DifficultyLevel } from '../types/index.js';

export const data = new SlashCommandBuilder()
  .setName('challenge')
  .setDescription('Ambil soal coding random')
  .addStringOption(opt => opt
    .setName('difficulty')
    .setDescription('Filter berdasarkan difficulty')
    .addChoices(
      { name: 'Easy', value: 'easy' },
      { name: 'Medium', value: 'medium' },
      { name: 'Hard', value: 'hard' },
    ))
  .addStringOption(opt => opt
    .setName('category')
    .setDescription('Filter berdasarkan kategori (contoh: array, string, math)'));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const difficulty = interaction.options.getString('difficulty') as DifficultyLevel | null;
  const category = interaction.options.getString('category') || undefined;

  const user = await getOrCreateUser(
    interaction.user.id,
    interaction.user.username,
    interaction.user.displayAvatarURL(),
  );

  // Get challenges user already solved (prioritize unsolved)
  const solvedIds = await getUserSolvedChallengeIds(user.id);

  const challenge = await getRandomChallenge(
    difficulty || undefined,
    category,
    solvedIds,
  );

  if (!challenge) {
    await interaction.editReply({
      content: '😔 Tidak ada challenge yang tersedia dengan filter tersebut. Coba filter yang lain!',
    });
    return;
  }

  // Store active challenge
  activeChallenges.set(interaction.user.id, {
    challengeId: challenge.id,
    startedAt: new Date(),
    hintIndex: 0,
  });

  const embed = buildChallengeEmbed(challenge);
  const buttons = buildChallengeButtons();

  await interaction.editReply({ embeds: [embed], components: [buttons] });
}
