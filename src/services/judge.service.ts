import axios from 'axios';
import { JUDGE0_LANGUAGE_IDS } from '../lib/constants.js';
import { sleep } from '../lib/utils.js';
import type { JudgeResult, TestCase, TestRunnerResult, SubmissionStatus, FailedTest } from '../types/index.js';

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'http://localhost:2358';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';

/**
 * Build the test runner source code that wraps user code with test execution.
 */
function buildTestRunner(
  language: string,
  userCode: string,
  testCases: TestCase[],
  functionName: string = 'solve',
): string {
  const testCasesJson = JSON.stringify(testCases);

  if (language === 'python') {
    return `import json, sys

# === KODE USER ===
${userCode}
# === END KODE USER ===

test_cases = ${testCasesJson}
results = []

for i, tc in enumerate(test_cases):
    try:
        inp = tc["input"]
        if isinstance(inp, list):
            result = ${functionName}(*inp)
        else:
            result = ${functionName}(inp)
        passed = result == tc["expected"]
        results.append({"index": i, "passed": passed, "got": result, "expected": tc["expected"]})
    except Exception as e:
        results.append({"index": i, "passed": False, "error": str(e)})

print(json.dumps(results))
`;
  }

  if (language === 'javascript') {
    return `// === KODE USER ===
${userCode}
// === END KODE USER ===

const testCases = ${testCasesJson};
const results = [];

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  try {
    const inp = tc.input;
    let result;
    if (Array.isArray(inp)) {
      result = ${functionName}(...inp);
    } else {
      result = ${functionName}(inp);
    }
    const passed = JSON.stringify(result) === JSON.stringify(tc.expected);
    results.push({ index: i, passed, got: result, expected: tc.expected });
  } catch (e) {
    results.push({ index: i, passed: false, error: e.message });
  }
}

console.log(JSON.stringify(results));
`;
  }

  throw new Error(`Unsupported language: ${language}`);
}

/**
 * Submit code to Judge0 and get a submission token.
 */
async function submitToJudge0(
  sourceCode: string,
  languageId: number,
  timeLimitSeconds: number,
  memoryLimitKb: number,
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (JUDGE0_API_KEY) {
    headers['X-Auth-Token'] = JUDGE0_API_KEY;
  }

  const response = await axios.post(
    `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`,
    {
      source_code: sourceCode,
      language_id: languageId,
      cpu_time_limit: timeLimitSeconds,
      memory_limit: memoryLimitKb,
    },
    { headers },
  );

  return response.data.token;
}

/**
 * Poll Judge0 for submission result.
 */
async function pollResult(token: string, maxWaitMs: number = 10_000): Promise<any> {
  const headers: Record<string, string> = {};
  if (JUDGE0_API_KEY) {
    headers['X-Auth-Token'] = JUDGE0_API_KEY;
  }

  const startTime = Date.now();
  const pollIntervalMs = 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const response = await axios.get(
      `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false&fields=status,stdout,stderr,compile_output,time,memory`,
      { headers },
    );

    const { status, stdout, stderr, compile_output, time, memory } = response.data;

    // Status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4=WA, 5=TLE, 6=CE, etc.
    if (status.id >= 3) {
      return {
        statusId: status.id,
        statusDescription: status.description,
        stdout,
        stderr,
        compileOutput: compile_output,
        time: time ? parseFloat(time) : null,
        memory,
      };
    }

    await sleep(pollIntervalMs);
  }

  // Timeout waiting for Judge0
  return { statusId: 5, statusDescription: 'Time Limit Exceeded', stdout: null, stderr: null, compileOutput: null, time: null, memory: null };
}

/**
 * Execute user code against test cases and return structured results.
 */
export async function executeAndJudge(
  userCode: string,
  language: string,
  publicTestCases: TestCase[],
  hiddenTestCases: TestCase[],
  timeLimitMs: number,
  memoryLimitMb: number,
  functionName: string = 'solve',
): Promise<JudgeResult> {
  const languageId = JUDGE0_LANGUAGE_IDS[language];
  if (!languageId) {
    return {
      status: 'error',
      testPassed: 0,
      testTotal: 0,
      runtimeMs: null,
      memoryKb: null,
      errorMessage: `Bahasa "${language}" tidak didukung. Gunakan: ${Object.keys(JUDGE0_LANGUAGE_IDS).join(', ')}`,
      failedTests: [],
    };
  }

  const allTestCases = [...publicTestCases, ...hiddenTestCases];
  const sourceCode = buildTestRunner(language, userCode, allTestCases, functionName);

  try {
    const token = await submitToJudge0(
      sourceCode,
      languageId,
      timeLimitMs / 1000,
      memoryLimitMb * 1024,
    );

    const result = await pollResult(token);

    // Handle compilation/runtime errors
    if (result.statusId === 6) {
      return {
        status: 'error',
        testPassed: 0,
        testTotal: allTestCases.length,
        runtimeMs: null,
        memoryKb: null,
        errorMessage: result.compileOutput || 'Compilation error',
        failedTests: [],
      };
    }

    if (result.statusId === 5) {
      return {
        status: 'timeout',
        testPassed: 0,
        testTotal: allTestCases.length,
        runtimeMs: null,
        memoryKb: null,
        errorMessage: 'Kode melebihi batas waktu. Coba optimasi solusimu!',
        failedTests: [],
      };
    }

    if (result.statusId >= 7 && result.statusId <= 12) {
      return {
        status: 'error',
        testPassed: 0,
        testTotal: allTestCases.length,
        runtimeMs: result.time ? Math.round(result.time * 1000) : null,
        memoryKb: result.memory,
        errorMessage: result.stderr || result.compileOutput || 'Runtime error',
        failedTests: [],
      };
    }

    // Parse stdout for test results
    if (!result.stdout) {
      return {
        status: 'error',
        testPassed: 0,
        testTotal: allTestCases.length,
        runtimeMs: result.time ? Math.round(result.time * 1000) : null,
        memoryKb: result.memory,
        errorMessage: result.stderr || 'No output received from code execution',
        failedTests: [],
      };
    }

    let testResults: TestRunnerResult[];
    try {
      testResults = JSON.parse(result.stdout.trim());
    } catch {
      return {
        status: 'error',
        testPassed: 0,
        testTotal: allTestCases.length,
        runtimeMs: result.time ? Math.round(result.time * 1000) : null,
        memoryKb: result.memory,
        errorMessage: `Unexpected output format. stderr: ${result.stderr || 'none'}`,
        failedTests: [],
      };
    }

    const testPassed = testResults.filter(t => t.passed).length;
    const allPassed = testPassed === allTestCases.length;

    // Collect failed public test cases for user feedback
    const failedTests: FailedTest[] = testResults
      .filter(t => !t.passed && t.index < publicTestCases.length)
      .map(t => ({
        index: t.index,
        input: JSON.stringify(allTestCases[t.index]?.input),
        expected: JSON.stringify(allTestCases[t.index]?.expected),
        got: t.error || JSON.stringify(t.got),
      }));

    return {
      status: allPassed ? 'passed' : 'failed',
      testPassed,
      testTotal: allTestCases.length,
      runtimeMs: result.time ? Math.round(result.time * 1000) : null,
      memoryKb: result.memory,
      errorMessage: allPassed ? null : (result.stderr || null),
      failedTests,
    };
  } catch (error: any) {
    console.error('[ERROR] Judge0 execution:', error.message);
    return {
      status: 'error',
      testPassed: 0,
      testTotal: allTestCases.length,
      runtimeMs: null,
      memoryKb: null,
      errorMessage: `Judge0 service error: ${error.message}. Pastikan Judge0 berjalan di ${JUDGE0_API_URL}`,
      failedTests: [],
    };
  }
}
