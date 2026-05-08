// ============================================================
// Constants for CodeDojo Bot
// ============================================================

import type { DifficultyLevel } from '../types/index.js';

// ============================================================
// XP & Level System
// ============================================================

export const LEVELS = [
  { level: 1,  name: 'Novice',      xp_required: 0       },
  { level: 2,  name: 'Apprentice',  xp_required: 200     },
  { level: 3,  name: 'Coder',       xp_required: 500     },
  { level: 4,  name: 'Developer',   xp_required: 1_000   },
  { level: 5,  name: 'Engineer',    xp_required: 2_000   },
  { level: 6,  name: 'Senior',      xp_required: 4_000   },
  { level: 7,  name: 'Expert',      xp_required: 7_500   },
  { level: 8,  name: 'Master',      xp_required: 12_000  },
  { level: 9,  name: 'Grandmaster', xp_required: 20_000  },
  { level: 10, name: 'Legend',      xp_required: 35_000  },
] as const;

export const XP_REWARDS: Record<DifficultyLevel, { min: number; max: number }> = {
  easy:   { min: 50,  max: 100 },
  medium: { min: 150, max: 250 },
  hard:   { min: 300, max: 500 },
};

export const XP_MULTIPLIERS = {
  daily_bonus:    50,   // XP flat bonus jika soal adalah daily challenge
  streak_7_days:  1.2,  // ×1.2 jika streak ≥ 7
  streak_30_days: 1.5,  // ×1.5 jika streak ≥ 30
} as const;

export const HINT_XP_COST = 10;

// ============================================================
// Judge0 Language ID Mapping
// ============================================================

export const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python:     71,   // Python 3.8.1
  javascript: 63,   // JavaScript (Node.js 12.14.0)
  // Fase 2:
  // java:       62,
  // cpp:        54,
  // typescript: 74,
};

// ============================================================
// Badge Definitions
// ============================================================

export const BADGE_DEFINITIONS = {
  first_solve:      { emoji: '🔥', name: 'First Blood',       description: 'Submit pertama kali berhasil' },
  streak_7:         { emoji: '🗓️', name: 'Week Warrior',      description: 'Streak mencapai 7 hari' },
  streak_30:        { emoji: '🏆', name: 'Monthly Champion',   description: 'Streak mencapai 30 hari' },
  hard_first_solve: { emoji: '💡', name: 'Hard Hitter',       description: 'Solve soal hard pertama kali' },
  speedster:        { emoji: '⚡', name: 'Speedster',         description: 'Solve soal dalam < 60 detik' },
  polyglot:         { emoji: '📚', name: 'Polyglot',          description: 'Submit passed dalam 3 bahasa berbeda' },
  top10_server:     { emoji: '🌟', name: 'Top 10',            description: 'Masuk leaderboard top 10 server' },
} as const;

// ============================================================
// Difficulty Color Coding (for Discord Embeds)
// ============================================================

export const DIFFICULTY_COLORS: Record<DifficultyLevel, number> = {
  easy:   0x00b894, // Green
  medium: 0xfdcb6e, // Yellow
  hard:   0xe17055, // Red-orange
};

export const DIFFICULTY_EMOJI: Record<DifficultyLevel, string> = {
  easy:   '🟢',
  medium: '🟡',
  hard:   '🔴',
};

// ============================================================
// Rate Limiting
// ============================================================

export const RATE_LIMITS = {
  submit: {
    maxRequests: 5,
    windowMs: 60_000, // 1 minute
  },
  maxCodeLength: 5000,
} as const;

// ============================================================
// Bot Config
// ============================================================

export const BOT_CONFIG = {
  name: 'CodeDojo',
  tagline: 'Level up your code, one challenge at a time.',
  color: 0x5865F2, // Discord blurple
  iconUrl: '', // Will be set at runtime from bot user avatar
} as const;
