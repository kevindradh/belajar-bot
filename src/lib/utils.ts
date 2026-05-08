import { LEVELS, XP_REWARDS } from './constants.js';
import type { DifficultyLevel, ActiveChallenge } from '../types/index.js';

/**
 * Calculate the level for a given XP amount.
 */
export function calculateLevel(xp: number): { level: number; name: string } {
  let result: { level: number; name: string } = { level: LEVELS[0].level, name: LEVELS[0].name };
  for (const lvl of LEVELS) {
    if (xp >= lvl.xp_required) {
      result = { level: lvl.level, name: lvl.name };
    } else {
      break;
    }
  }
  return result;
}

/**
 * Get XP needed for next level.
 */
export function xpForNextLevel(currentXP: number): { needed: number; nextLevel: number } | null {
  const currentLevel = calculateLevel(currentXP);
  const next = LEVELS.find(l => l.level === currentLevel.level + 1);
  if (!next) return null; // Already max level
  return { needed: next.xp_required - currentXP, nextLevel: next.level };
}

/**
 * Generate a random XP reward based on difficulty.
 */
export function randomXPReward(difficulty: DifficultyLevel): number {
  const range = XP_REWARDS[difficulty];
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

/**
 * Format number with locale-aware separators.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('id-ID');
}

/**
 * Get today's date in YYYY-MM-DD format, adjusted for WIB (UTC+7).
 */
export function getTodayWIB(): string {
  const now = new Date();
  const wibOffset = 7 * 60; // UTC+7 in minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const wibDate = new Date(now);
  wibDate.setUTCMinutes(wibDate.getUTCMinutes() + wibOffset);
  return wibDate.toISOString().split('T')[0];
}

/**
 * Calculate date difference in days.
 */
export function daysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * In-memory store for active challenges per user.
 * Key: Discord user ID, Value: Active challenge info
 */
export const activeChallenges = new Map<string, ActiveChallenge>();

/**
 * Simple in-memory rate limiter.
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  /**
   * Check if a user is rate limited. Returns remaining requests or -1 if limited.
   */
  check(userId: string): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // Filter out expired timestamps
    const validRequests = userRequests.filter(t => now - t < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      const oldestValid = validRequests[0];
      const retryAfterMs = this.windowMs - (now - oldestValid);
      return { allowed: false, remaining: 0, retryAfterMs };
    }

    // Record this request
    validRequests.push(now);
    this.requests.set(userId, validRequests);

    return {
      allowed: true,
      remaining: this.maxRequests - validRequests.length,
      retryAfterMs: 0,
    };
  }

  /**
   * Cleanup old entries periodically.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [userId, timestamps] of this.requests) {
      const valid = timestamps.filter(t => now - t < this.windowMs);
      if (valid.length === 0) {
        this.requests.delete(userId);
      } else {
        this.requests.set(userId, valid);
      }
    }
  }
}

/**
 * Truncate text to a max length, adding ellipsis if needed.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Create a progress bar string.
 */
export function progressBar(current: number, max: number, length: number = 10): string {
  const percentage = Math.min(current / max, 1);
  const filled = Math.round(percentage * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
