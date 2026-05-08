import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { DIFFICULTY_COLORS, DIFFICULTY_EMOJI, BADGE_DEFINITIONS, BOT_CONFIG, LEVELS } from './constants.js';
import { progressBar, formatNumber, xpForNextLevel } from './utils.js';
import type { Challenge, User, UserBadge, JudgeResult, LeaderboardEntry, UserProfile } from '../types/index.js';

// ============================================================
// Challenge Embed
// ============================================================

export function buildChallengeEmbed(challenge: Challenge) {
  const diffColor = DIFFICULTY_COLORS[challenge.difficulty];
  const diffEmoji = DIFFICULTY_EMOJI[challenge.difficulty];

  const embed = new EmbedBuilder()
    .setColor(diffColor)
    .setTitle(`${diffEmoji} ${challenge.title}`)
    .setDescription(challenge.description)
    .addFields(
      { name: '📊 Difficulty', value: `${diffEmoji} ${challenge.difficulty.toUpperCase()}`, inline: true },
      { name: '⭐ XP Reward', value: `${challenge.xp_reward} XP`, inline: true },
      { name: '🌐 Languages', value: challenge.supported_languages.join(', '), inline: true },
    );

  if (challenge.constraints) {
    embed.addFields({ name: '⚠️ Constraints', value: challenge.constraints });
  }

  if (challenge.examples.length > 0) {
    const examplesText = challenge.examples.map((ex, i) =>
      `**Example ${i + 1}:**\n` +
      `Input: \`${ex.input}\`\n` +
      `Output: \`${ex.output}\`` +
      (ex.explanation ? `\nExplanation: ${ex.explanation}` : '')
    ).join('\n\n');
    embed.addFields({ name: '📝 Examples', value: examplesText });
  }

  // Show function signatures
  const sigEntries = Object.entries(challenge.function_signatures);
  if (sigEntries.length > 0) {
    const sigText = sigEntries
      .map(([lang, sig]) => `**${lang}:**\n\`\`\`${lang}\n${sig}\n\`\`\``)
      .join('\n');
    embed.addFields({ name: '🔧 Function Signature', value: sigText });
  }

  embed.addFields(
    { name: '📈 Stats', value: `${challenge.total_solves} solves / ${challenge.total_attempts} attempts`, inline: true },
    { name: '⏱️ Time Limit', value: `${challenge.time_limit_ms}ms`, inline: true },
  );

  embed.setFooter({ text: `${BOT_CONFIG.name} • ${challenge.slug}` });
  embed.setTimestamp();

  return embed;
}

/**
 * Build action buttons for a challenge (Submit, Hint, Skip).
 */
export function buildChallengeButtons() {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('btn_submit')
        .setLabel('📝 Submit')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn_hint')
        .setLabel('💡 Hint (-10 XP)')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('btn_skip')
        .setLabel('⏭️ Skip')
        .setStyle(ButtonStyle.Danger),
    );
}

// ============================================================
// Submission Result Embed
// ============================================================

export function buildSubmissionResultEmbed(
  result: JudgeResult,
  user: User,
  challenge: Challenge,
  xpEarned: number,
  isFirstSolve: boolean,
  leveledUp: boolean,
  newLevel?: number,
) {
  const isPassed = result.status === 'passed';
  const color = isPassed ? 0x00b894 : result.status === 'error' ? 0xe74c3c : 0xe17055;
  const statusEmoji = isPassed ? '✅' : result.status === 'timeout' ? '⏰' : '❌';
  const statusText = result.status.toUpperCase();

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${statusEmoji} ${statusText} — ${challenge.title}`)
    .addFields(
      { name: '🧪 Test Cases', value: `${result.testPassed}/${result.testTotal} passed`, inline: true },
    );

  if (result.runtimeMs !== null) {
    embed.addFields({ name: '⏱️ Runtime', value: `${result.runtimeMs}ms`, inline: true });
  }
  if (result.memoryKb !== null) {
    embed.addFields({ name: '💾 Memory', value: `${Math.round(result.memoryKb / 1024 * 100) / 100}MB`, inline: true });
  }

  if (isPassed) {
    let desc = `**+${xpEarned} XP** earned!`;
    if (isFirstSolve) desc += '\n🔥 **First Solve** on this challenge!';
    if (leveledUp && newLevel) {
      const levelInfo = LEVELS.find(l => l.level === newLevel);
      desc += `\n🎉 **Level Up!** You are now Level ${newLevel} — **${levelInfo?.name}**!`;
    }
    embed.setDescription(desc);
  } else if (result.errorMessage) {
    embed.addFields({ name: '❗ Error', value: `\`\`\`\n${result.errorMessage.slice(0, 1000)}\n\`\`\`` });
  }

  // Show failed public test cases
  if (!isPassed && result.failedTests.length > 0) {
    const failedText = result.failedTests.slice(0, 3).map(ft =>
      `Test #${ft.index + 1}:\n` +
      `  Input: \`${ft.input}\`\n` +
      `  Expected: \`${ft.expected}\`\n` +
      `  Got: \`${ft.got}\``
    ).join('\n\n');
    embed.addFields({ name: '🔍 Failed Tests (public)', value: failedText });
  }

  embed.setFooter({
    text: `${BOT_CONFIG.name} • Total XP: ${formatNumber(user.xp + xpEarned)}`,
  });
  embed.setTimestamp();

  return embed;
}

// ============================================================
// Profile Embed
// ============================================================

export function buildProfileEmbed(profile: UserProfile) {
  const { user, badges, totalSolved, totalSubmissions, easySolved, mediumSolved, hardSolved } = profile;
  const levelInfo = LEVELS.find(l => l.level === user.level) || LEVELS[0];
  const nextLevelInfo = xpForNextLevel(user.xp);

  const embed = new EmbedBuilder()
    .setColor(BOT_CONFIG.color)
    .setTitle(`👤 ${user.username}`)
    .setDescription(`**${levelInfo.name}** (Level ${user.level})`)
    .addFields(
      { name: '⭐ XP', value: formatNumber(user.xp), inline: true },
      { name: '📊 Level', value: `${user.level}/10`, inline: true },
      { name: '🔥 Streak', value: `${user.streak_current} days (best: ${user.streak_longest})`, inline: true },
    );

  if (nextLevelInfo) {
    embed.addFields({
      name: '📈 Progress',
      value: `${progressBar(user.xp - (levelInfo.xp_required), (LEVELS.find(l => l.level === user.level + 1)?.xp_required || 0) - levelInfo.xp_required)} ${nextLevelInfo.needed} XP to Level ${nextLevelInfo.nextLevel}`,
    });
  }

  embed.addFields(
    { name: '✅ Solved', value: `${totalSolved} total`, inline: true },
    { name: '📝 Submissions', value: `${totalSubmissions} total`, inline: true },
    { name: '❄️ Streak Freeze', value: `${user.streak_freeze} remaining`, inline: true },
    {
      name: '🏅 By Difficulty',
      value: `🟢 Easy: ${easySolved} | 🟡 Medium: ${mediumSolved} | 🔴 Hard: ${hardSolved}`,
    },
  );

  // Badges
  if (badges.length > 0) {
    const badgeText = badges.map(b => {
      const def = BADGE_DEFINITIONS[b.badge_key];
      return `${def.emoji} **${def.name}**`;
    }).join(' • ');
    embed.addFields({ name: '🎖️ Badges', value: badgeText });
  } else {
    embed.addFields({ name: '🎖️ Badges', value: '_No badges yet — keep coding!_' });
  }

  embed.setFooter({ text: BOT_CONFIG.name });
  embed.setTimestamp();

  return embed;
}

// ============================================================
// Leaderboard Embed
// ============================================================

export function buildLeaderboardEmbed(
  entries: LeaderboardEntry[],
  guildName: string,
  period: string,
) {
  const medals = ['🥇', '🥈', '🥉'];

  const leaderboardText = entries.length > 0
    ? entries.map((entry, i) => {
        const medal = i < 3 ? medals[i] : `**#${i + 1}**`;
        const levelInfo = LEVELS.find(l => l.xp_required <= entry.xp);
        return `${medal} **${entry.username}** — ${formatNumber(entry.xp)} XP`;
      }).join('\n')
    : '_No data yet. Start solving challenges!_';

  const embed = new EmbedBuilder()
    .setColor(BOT_CONFIG.color)
    .setTitle(`🏆 Leaderboard — ${guildName}`)
    .setDescription(`**${period.charAt(0).toUpperCase() + period.slice(1)}** ranking\n\n${leaderboardText}`)
    .setFooter({ text: `${BOT_CONFIG.name} • Top 10` })
    .setTimestamp();

  return embed;
}

// ============================================================
// Daily Challenge Embed
// ============================================================

export function buildDailyChallengeEmbed(challenge: Challenge, guildName: string) {
  const diffEmoji = DIFFICULTY_EMOJI[challenge.difficulty];
  const embed = buildChallengeEmbed(challenge);

  embed.setTitle(`📅 Daily Challenge — ${diffEmoji} ${challenge.title}`);
  embed.setDescription(`**Today's challenge for ${guildName}!**\n\n${challenge.description}`);

  return embed;
}

// ============================================================
// Streak Embed
// ============================================================

export function buildStreakEmbed(user: User) {
  const embed = new EmbedBuilder()
    .setColor(user.streak_current >= 7 ? 0xf39c12 : BOT_CONFIG.color)
    .setTitle(`🔥 Streak — ${user.username}`)
    .addFields(
      { name: '🔥 Current Streak', value: `${user.streak_current} days`, inline: true },
      { name: '🏆 Longest Streak', value: `${user.streak_longest} days`, inline: true },
      { name: '❄️ Freeze Available', value: `${user.streak_freeze}`, inline: true },
    );

  if (user.last_solved_at) {
    embed.addFields({ name: '📅 Last Solved', value: user.last_solved_at });
  }

  let tip = '';
  if (user.streak_current === 0) tip = 'Start your streak by solving a challenge today!';
  else if (user.streak_current < 7) tip = `${7 - user.streak_current} more days to unlock the **Week Warrior** badge!`;
  else if (user.streak_current < 30) tip = `${30 - user.streak_current} more days to unlock the **Monthly Champion** badge!`;
  else tip = 'Incredible streak! Keep it going! 🔥';

  embed.addFields({ name: '💡 Tip', value: tip });
  embed.setFooter({ text: BOT_CONFIG.name });
  embed.setTimestamp();

  return embed;
}

// ============================================================
// Categories Embed
// ============================================================

export function buildCategoriesEmbed(categories: Array<{ slug: string; name: string; icon: string | null; description: string | null }>) {
  const categoriesText = categories.map(c =>
    `${c.icon || '📁'} **${c.name}** — ${c.description || 'No description'}`
  ).join('\n');

  return new EmbedBuilder()
    .setColor(BOT_CONFIG.color)
    .setTitle('📂 Challenge Categories')
    .setDescription(categoriesText || '_No categories available._')
    .setFooter({ text: `${BOT_CONFIG.name} • Use /challenge category:<name> to filter` })
    .setTimestamp();
}
