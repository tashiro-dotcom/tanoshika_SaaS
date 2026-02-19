import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type SessionMeta = {
  timestamp: string;
  branch: string;
  changed_files: string[];
  goal: string;
  current_state: string;
  next_actions: string[];
  blockers: string[];
  decisions: string[];
  risk_level: 'low' | 'medium' | 'high' | 'unknown';
  confidence: number;
  summary: string;
};

const ROOT = process.cwd();
const STATE_DIR = join(ROOT, 'STATE');
const ACTIVE_TASK_PATH = join(STATE_DIR, '_active_task.md');
const SESSIONS_DIR = join(ROOT, 'logs', 'sessions');

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function safeRead(path: string): string {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8') : '';
  } catch {
    return '';
  }
}

function findLatestSessionDir(): string | null {
  if (!existsSync(SESSIONS_DIR)) return null;
  const entries = readdirSync(SESSIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));
  if (entries.length === 0) return null;
  return join(SESSIONS_DIR, entries[0]);
}

function readSessionMeta(sessionDir: string): SessionMeta | null {
  try {
    const path = join(sessionDir, 'session.json');
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const legacyChangedFiles = Array.isArray(parsed.changedFiles) ? parsed.changedFiles.map(String) : [];
    const changedFiles = Array.isArray(parsed.changed_files) ? parsed.changed_files.map(String) : legacyChangedFiles;

    const goal = typeof parsed.goal === 'string' ? parsed.goal : 'Goal not set';
    const currentState =
      typeof parsed.current_state === 'string'
        ? parsed.current_state
        : typeof parsed.summary === 'string'
          ? parsed.summary
          : 'Current state not set';

    const nextActions = Array.isArray(parsed.next_actions)
      ? parsed.next_actions.map(String)
      : typeof parsed.summary === 'string'
        ? [parsed.summary]
        : [];
    const blockers = Array.isArray(parsed.blockers) ? parsed.blockers.map(String) : [];
    const decisions = Array.isArray(parsed.decisions) ? parsed.decisions.map(String) : [];
    const risk = typeof parsed.risk_level === 'string' ? parsed.risk_level : 'unknown';
    const riskLevel: SessionMeta['risk_level'] =
      risk === 'low' || risk === 'medium' || risk === 'high' || risk === 'unknown' ? risk : 'unknown';
    const confidenceRaw = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
    const confidence = Math.max(0, Math.min(1, confidenceRaw));

    return {
      timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : 'unknown',
      branch: typeof parsed.branch === 'string' ? parsed.branch : 'unknown',
      changed_files: changedFiles,
      goal,
      current_state: currentState,
      next_actions: nextActions,
      blockers,
      decisions,
      risk_level: riskLevel,
      confidence,
      summary: typeof parsed.summary === 'string' ? parsed.summary : nextActions[0] ?? goal,
    };
  } catch {
    return null;
  }
}

function extractTopActions(activeTask: string): string[] {
  const lines = activeTask.split('\n').map((line) => line.trim());
  const unchecked = lines
    .filter((line) => line.startsWith('- [ ]'))
    .map((line) => line.replace(/^- \[ \]\s*/, '').trim())
    .filter((line) => line.length > 0);
  if (unchecked.length > 0) return unchecked.slice(0, 3);

  const bullets = lines
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, '').trim())
    .filter((line) => line.length > 0);
  return bullets.slice(0, 3);
}

function buildRestartPrompt(meta: SessionMeta, snapshotDir: string, activeTaskPath: string): string {
  const lines: string[] = [
    'You are resuming a paused coding session.',
    '',
    'Session Context:',
    `- Snapshot directory: ${snapshotDir}`,
    `- Timestamp: ${meta.timestamp}`,
    `- Branch: ${meta.branch}`,
    `- Goal: ${meta.goal}`,
    `- Current state: ${meta.current_state}`,
    `- Risk level: ${meta.risk_level}`,
    `- Confidence: ${meta.confidence}`,
    '',
    'Changed files (recent):',
    ...(meta.changed_files.length > 0 ? meta.changed_files.map((f) => `- ${f}`) : ['- none']),
    '',
    'Next actions:',
    ...(meta.next_actions.length > 0 ? meta.next_actions.map((a, i) => `${i + 1}. ${a}`) : ['1. Define next actions']),
    '',
    'Blockers:',
    ...(meta.blockers.length > 0 ? meta.blockers.map((b) => `- ${b}`) : ['- none']),
    '',
    'Decisions:',
    ...(meta.decisions.length > 0 ? meta.decisions.map((d) => `- ${d}`) : ['- none']),
    '',
    `Reference active task file: ${activeTaskPath}`,
  ];
  return lines.join('\n');
}

function main(): void {
  try {
    ensureDir(STATE_DIR);
    ensureDir(SESSIONS_DIR);

    const latestSessionDir = findLatestSessionDir();
    const activeTask = safeRead(ACTIVE_TASK_PATH);
    const actions = extractTopActions(activeTask);

    if (!latestSessionDir) {
      console.log('[state:restore] no snapshots found');
      console.log(`- active task file: ${ACTIVE_TASK_PATH}`);
      if (actions.length > 0) {
        console.log('- next actions:');
        actions.forEach((action, index) => console.log(`  ${index + 1}. ${action}`));
      } else {
        console.log('- next actions: none');
      }
      return;
    }

    const sessionMeta = readSessionMeta(latestSessionDir);
    const fallbackMeta: SessionMeta = {
      timestamp: 'unknown',
      branch: 'unknown',
      changed_files: [],
      goal: 'Goal not set',
      current_state: 'Current state not set',
      next_actions: actions,
      blockers: [],
      decisions: [],
      risk_level: 'unknown',
      confidence: 0.5,
      summary: actions[0] ?? 'No summary available',
    };
    const meta = sessionMeta ?? fallbackMeta;
    const changedFiles = meta.changed_files;

    const restartPrompt = buildRestartPrompt(meta, latestSessionDir, ACTIVE_TASK_PATH);
    const restartPromptPath = join(latestSessionDir, 'restart_prompt.txt');
    writeFileSync(restartPromptPath, restartPrompt, 'utf8');

    console.log('=== AI Resume Brief ===');
    console.log(`snapshot: ${latestSessionDir}`);
    console.log(`timestamp: ${meta.timestamp}`);
    console.log(`branch: ${meta.branch}`);
    console.log(`goal: ${meta.goal}`);
    console.log(`current_state: ${meta.current_state}`);
    console.log(`risk_level: ${meta.risk_level}`);
    console.log(`confidence: ${meta.confidence}`);
    console.log(`summary: ${meta.summary}`);
    console.log('');
    console.log('Recent changed files:');
    if (changedFiles.length === 0) {
      console.log('- none');
    } else {
      changedFiles.slice(0, 20).forEach((file) => console.log(`- ${file}`));
    }
    console.log('');
    console.log('Top 3 next actions:');
    const prioritizedActions = meta.next_actions.length > 0 ? meta.next_actions.slice(0, 3) : actions.slice(0, 3);
    if (prioritizedActions.length === 0) {
      console.log('1. _active_task.md を更新して次アクションを明確化');
      console.log('2. 最新 snapshot の session.json を確認');
      console.log('3. 必要なら state:snapshot を再実行');
    } else {
      prioritizedActions.forEach((action, index) => console.log(`${index + 1}. ${action}`));
    }
    console.log('');
    console.log('Blockers:');
    if (meta.blockers.length === 0) console.log('- none');
    meta.blockers.forEach((blocker) => console.log(`- ${blocker}`));
    console.log('');
    console.log('Decisions:');
    if (meta.decisions.length === 0) console.log('- none');
    meta.decisions.forEach((decision) => console.log(`- ${decision}`));
    console.log('');
    console.log(`active task: ${ACTIVE_TASK_PATH}`);
    console.log(`restart prompt: ${restartPromptPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`[state:restore] recovered from error: ${message}`);
  }
}

main();
