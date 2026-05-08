import { SlashCommandBuilder, type ChatInputCommandInteraction, type ModalSubmitInteraction } from 'discord.js';
import { getOrCreateUser, addXP } from '../services/user.service.js';
import { getChallengeById, incrementChallengeStats } from '../services/challenge.service.js';
import { executeAndJudge } from '../services/judge.service.js';
import { saveSubmission, isFirstSolve } from '../services/submission.service.js';
import { updateStreak } from '../services/streak.service.js';
import { checkAndAwardBadges } from '../services/badge.service.js';
import { buildSubmissionResultEmbed } from '../lib/embeds.js';
import { activeChallenges, RateLimiter, randomXPReward } from '../lib/utils.js';
import { RATE_LIMITS, XP_MULTIPLIERS, JUDGE0_LANGUAGE_IDS, BADGE_DEFINITIONS } from '../lib/constants.js';

const submitRateLimiter = new RateLimiter(RATE_LIMITS.submit.maxRequests, RATE_LIMITS.submit.windowMs);

export const data = new SlashCommandBuilder()
  .setName('submit')
  .setDescription('Submit solusi untuk soal aktif')
  .addStringOption(opt => opt.setName('language').setDescription('Bahasa').setRequired(true)
    .addChoices(
      { name: 'Python', value: 'python' },
      { name: 'JavaScript', value: 'javascript' },
    ))
  .addStringOption(opt => opt.setName('code').setDescription('Kode solusi').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const language = interaction.options.getString('language', true);
  const code = interaction.options.getString('code', true);
  await processSubmission(interaction, language, code);
}

// Handle modal submit from button
export async function executeModal(interaction: ModalSubmitInteraction) {
  const language = interaction.fields.getTextInputValue('submit_language').toLowerCase().trim();
  const code = interaction.fields.getTextInputValue('submit_code');
  await processSubmission(interaction, language, code);
}

async function processSubmission(
  interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
  language: string,
  code: string,
) {
  // Check active challenge
  const active = activeChallenges.get(interaction.user.id);
  if (!active) {
    await interaction.reply({ content: '❌ Kamu belum mengambil soal. Gunakan `/challenge` dulu.', ephemeral: true });
    return;
  }

  // Rate limit
  const rateCheck = submitRateLimiter.check(interaction.user.id);
  if (!rateCheck.allowed) {
    await interaction.reply({
      content: `⏳ Rate limited! Tunggu ${Math.ceil(rateCheck.retryAfterMs / 1000)} detik.`,
      ephemeral: true,
    });
    return;
  }

  // Validate code length
  if (code.length > RATE_LIMITS.maxCodeLength) {
    await interaction.reply({ content: `❌ Kode terlalu panjang (max ${RATE_LIMITS.maxCodeLength} karakter).`, ephemeral: true });
    return;
  }

  // Validate language
  if (!JUDGE0_LANGUAGE_IDS[language]) {
    await interaction.reply({
      content: `❌ Bahasa "${language}" tidak didukung. Gunakan: ${Object.keys(JUDGE0_LANGUAGE_IDS).join(', ')}`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const challenge = await getChallengeById(active.challengeId);
  if (!challenge) {
    await interaction.editReply({ content: '❌ Challenge tidak ditemukan. Coba ambil soal baru.' });
    activeChallenges.delete(interaction.user.id);
    return;
  }

  const user = await getOrCreateUser(interaction.user.id, interaction.user.username);

  // Extract function name from signature
  const sig = challenge.function_signatures[language] || '';
  const funcMatch = sig.match(/(?:def|function)\s+(\w+)/);
  const functionName = funcMatch?.[1] || 'solve';

  // Execute against Judge0
  const judgeResult = await executeAndJudge(
    code, language,
    challenge.test_cases_public, challenge.test_cases_hidden,
    challenge.time_limit_ms, challenge.memory_limit_mb,
    functionName,
  );

  const isPassed = judgeResult.status === 'passed';
  let xpEarned = 0;
  let firstSolve = false;
  let leveledUp = false;
  let newLevel: number | undefined;

  if (isPassed) {
    firstSolve = await isFirstSolve(user.id, challenge.id);
    xpEarned = firstSolve ? randomXPReward(challenge.difficulty) : Math.floor(challenge.xp_reward * 0.1);

    // Streak multiplier
    const streakResult = await updateStreak(user.id);
    if (streakResult.streakCurrent >= 30) xpEarned = Math.floor(xpEarned * XP_MULTIPLIERS.streak_30_days);
    else if (streakResult.streakCurrent >= 7) xpEarned = Math.floor(xpEarned * XP_MULTIPLIERS.streak_7_days);

    // Add XP
    const xpResult = await addXP(user.id, xpEarned);
    leveledUp = xpResult.leveledUp;
    newLevel = xpResult.newLevel;

    // Badges
    const solveTimeSec = (Date.now() - active.startedAt.getTime()) / 1000;
    const awardedBadges = await checkAndAwardBadges({
      userId: user.id,
      isFirstSolve: firstSolve,
      challengeDifficulty: challenge.difficulty,
      streakCurrent: streakResult.streakCurrent,
      solveTimeSec,
      guildId: interaction.guildId,
    });

    await incrementChallengeStats(challenge.id, true);
    activeChallenges.delete(interaction.user.id);

    // Badge notification
    if (awardedBadges.length > 0) {
      const badgeText = awardedBadges.map(b => `${BADGE_DEFINITIONS[b].emoji} **${BADGE_DEFINITIONS[b].name}**`).join(', ');
      await interaction.followUp({ content: `🎖️ Badge baru: ${badgeText}`, ephemeral: true });
    }
  } else {
    await incrementChallengeStats(challenge.id, false);
  }

  // Save submission
  await saveSubmission({
    user_id: user.id,
    challenge_id: challenge.id,
    guild_id: interaction.guildId,
    language, code,
    status: judgeResult.status,
    test_passed: judgeResult.testPassed,
    test_total: judgeResult.testTotal,
    runtime_ms: judgeResult.runtimeMs,
    memory_kb: judgeResult.memoryKb,
    error_message: judgeResult.errorMessage,
    xp_earned: xpEarned,
    is_first_solve: firstSolve,
  });

  const embed = buildSubmissionResultEmbed(judgeResult, user, challenge, xpEarned, firstSolve, leveledUp, newLevel);
  await interaction.editReply({ embeds: [embed] });
}
