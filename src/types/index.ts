// ============================================================
// TypeScript Interfaces for CodeDojo Database (Test)
// ============================================================

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type SubmissionStatus = 'passed' | 'failed' | 'error' | 'timeout' | 'pending';
export type BadgeTrigger =
  | 'first_solve'
  | 'streak_7'
  | 'streak_30'
  | 'hard_first_solve'
  | 'speedster'
  | 'polyglot'
  | 'top10_server';

// ============================================================
// Database Row Types
// ============================================================

export interface User {
  id: string;
  discord_id: string;
  username: string;
  discriminator: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  streak_current: number;
  streak_longest: number;
  streak_freeze: number;
  last_solved_at: string | null; // DATE as string
  dm_reminder: boolean;
  created_at: string;
  updated_at: string;
}

export interface Guild {
  guild_id: string;
  guild_name: string | null;
  challenge_channel: string | null;
  daily_channel: string | null;
  daily_time: string; // TIME as string HH:MM:SS
  timezone: string;
  is_active: boolean;
  prefix: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface ChallengeExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  input: unknown[];
  expected: unknown;
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  difficulty: DifficultyLevel;
  xp_reward: number;
  description: string;
  constraints: string | null;
  examples: ChallengeExample[];
  function_signatures: Record<string, string>;
  test_cases_public: TestCase[];
  test_cases_hidden: TestCase[];
  hints: string[];
  tags: string[];
  supported_languages: string[];
  time_limit_ms: number;
  memory_limit_mb: number;
  is_active: boolean;
  is_daily_eligible: boolean;
  total_attempts: number;
  total_solves: number;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  challenge_id: string;
  guild_id: string | null;
  language: string;
  code: string;
  status: SubmissionStatus;
  test_passed: number | null;
  test_total: number | null;
  runtime_ms: number | null;
  memory_kb: number | null;
  error_message: string | null;
  xp_earned: number;
  is_first_solve: boolean;
  submitted_at: string;
}

export interface DailyChallenge {
  id: number;
  guild_id: string;
  challenge_id: string;
  scheduled_for: string; // DATE
  message_id: string | null;
  posted_at: string | null;
  created_at: string;
}

export interface UserBadge {
  id: number;
  user_id: string;
  badge_key: BadgeTrigger;
  earned_at: string;
}

export interface LeaderboardSnapshot {
  id: number;
  guild_id: string;
  snapshot_at: string;
  period: 'weekly' | 'monthly' | 'alltime';
  data: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  discord_id: string;
  username: string;
  xp: number;
  rank: number;
}

// ============================================================
// Service Input/Output Types
// ============================================================

export interface AddXPResult {
  newXP: number;
  leveledUp: boolean;
  newLevel: number;
  levelName: string;
}

export interface JudgeResult {
  status: SubmissionStatus;
  testPassed: number;
  testTotal: number;
  runtimeMs: number | null;
  memoryKb: number | null;
  errorMessage: string | null;
  failedTests: FailedTest[];
}

export interface FailedTest {
  index: number;
  input: string;
  expected: string;
  got: string;
}

export interface TestRunnerResult {
  index: number;
  passed: boolean;
  got?: unknown;
  expected?: unknown;
  error?: string;
}

export interface UserProfile {
  user: User;
  badges: UserBadge[];
  totalSolved: number;
  totalSubmissions: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
}

export interface StreakUpdateResult {
  streakCurrent: number;
  streakLongest: number;
  streakChanged: boolean;
  freezeUsed: boolean;
}

// ============================================================
// Active Challenge Tracking (in-memory)
// ============================================================

export interface ActiveChallenge {
  challengeId: string;
  startedAt: Date;
  hintIndex: number; // track which hint they've seen
}

// ============================================================
// Command Types
// ============================================================

export interface CommandData {
  data: unknown;
  execute: (interaction: unknown) => Promise<void>;
}
