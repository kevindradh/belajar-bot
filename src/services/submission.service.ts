import { supabase } from '../lib/supabase.js';
import type { Submission, SubmissionStatus } from '../types/index.js';

export async function saveSubmission(data: {
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
}): Promise<Submission> {
  const { data: sub, error } = await supabase
    .from('submissions').insert(data).select('*').single();
  if (error) throw new Error(`Failed to save submission: ${error.message}`);
  return sub as Submission;
}

export async function isFirstSolve(userId: string, challengeId: string): Promise<boolean> {
  const { data } = await supabase
    .from('submissions').select('id')
    .eq('user_id', userId).eq('challenge_id', challengeId).eq('status', 'passed').limit(1);
  return !data || data.length === 0;
}

export async function getUserSubmissions(userId: string, limit = 10): Promise<Submission[]> {
  const { data } = await supabase
    .from('submissions').select('*')
    .eq('user_id', userId).order('submitted_at', { ascending: false }).limit(limit);
  return (data || []) as Submission[];
}
