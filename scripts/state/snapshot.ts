import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

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
const MEMORY_SUGGESTIONS_PATH = join(STATE_DIR, 'memory_suggestions.md');
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

function runGit(args: string[]): { ok: boolean; output: string } {
  try {
    const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
    if (result.error) return { ok: false, output: `git not available: ${result.error.message}\n` };
    if (result.status !== 0) {
      const stderr = result.stderr?.trim() ?? '';
      return { ok: false, output: stderr ? `${stderr}\n` : 'git command failed\n' };
    }
    return { ok: true, output: result.stdout ?? '' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return { ok: false, output: `git execution error: ${message}\n` };
  }
}

function nowForDir(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}${pad(date.getSeconds())}`;
}

function extractChangedFiles(gitStatusPorcelain: string): string[] {
  return gitStatusPorcelain
    .split('\n')
    .filter((line) => line.length > 3)
    .map((line) => line.slice(3).trim());
}

function normalizeSectionName(raw: string): string {
  return raw.trim().toLowerCase().replace(/[：:]/g, '').replace(/\s+/g, ' ');
}

function extractBulletValue(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.startsWith('- [ ]')) return trimmed.replace(/^- \[ \]\s*/, '').trim();
  if (trimmed.startsWith('- [x]')) return trimmed.replace(/^- \[[xX]\]\s*/, '').trim();
  if (trimmed.startsWith('- ')) return trimmed.replace(/^- /, '').trim();
  return null;
}

function parseActiveTask(activeTask: string): Omit<SessionMeta, 'timestamp' | 'branch' | 'changed_files'> {
  const lines = activeTask.split('\n');
  let currentSection = '';
  const sectionBuckets: Record<string, string[]> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('## ')) {
      currentSection = normalizeSectionName(line.replace(/^##\s+/, ''));
      if (!sectionBuckets[currentSection]) sectionBuckets[currentSection] = [];
      continue;
    }

    if (!currentSection) continue;
    const value = extractBulletValue(line);
    if (value) {
      sectionBuckets[currentSection] = sectionBuckets[currentSection] ?? [];
      sectionBuckets[currentSection].push(value);
      continue;
    }

    if (line.length > 0 && !line.startsWith('#')) {
      sectionBuckets[currentSection] = sectionBuckets[currentSection] ?? [];
      sectionBuckets[currentSection].push(line);
    }
  }

  const goal = sectionBuckets['goal']?.[0] ?? sectionBuckets['objectives']?.[0] ?? 'Goal not set';
  const context = sectionBuckets['context'] ?? sectionBuckets['current state'] ?? [];
  const currentState = context.length > 0 ? context.join(' / ') : 'Current state not set';
  const nextActions = sectionBuckets['next actions'] ?? [];
  const blockers = sectionBuckets['blockers'] ?? [];
  const decisions = sectionBuckets['decisions'] ?? [];

  const riskRaw =
    sectionBuckets['risk level']?.[0] ?? sectionBuckets['risk']?.[0] ?? sectionBuckets['risks']?.[0] ?? 'unknown';
  const riskNormalized = riskRaw.toLowerCase();
  const riskLevel: SessionMeta['risk_level'] = riskNormalized.includes('high')
    ? 'high'
    : riskNormalized.includes('medium')
      ? 'medium'
      : riskNormalized.includes('low')
        ? 'low'
        : 'unknown';

  const confidenceRaw = sectionBuckets['confidence']?.[0] ?? '';
  const confidenceNumber = Number.parseFloat(confidenceRaw);
  const confidence = Number.isFinite(confidenceNumber)
    ? Math.max(0, Math.min(1, confidenceNumber > 1 ? confidenceNumber / 100 : confidenceNumber))
    : 0.5;

  const summary = nextActions[0] ?? goal;
  return {
    goal,
    current_state: currentState,
    next_actions: nextActions,
    blockers,
    decisions,
    risk_level: riskLevel,
    confidence,
    summary,
  };
}

function buildMemorySuggestions(activeTask: string, changedFiles: string[], isoTimestamp: string): string {
  const suggestions = [
    '# Memory Suggestions',
    '',
    `Generated at: ${isoTimestamp}`,
    '',
    '## Candidate Decisions',
    '- (候補) 今回の変更で再利用すべき設計判断を追記する',
    '- (候補) 破壊的変更を避ける方針があれば追記する',
    '',
    '## Candidate Keywords',
    `- Changed files: ${changedFiles.length > 0 ? changedFiles.slice(0, 10).join(', ') : 'none'}`,
    '',
    '## Active Task Snapshot',
    '```md',
    activeTask || '(empty)',
    '```',
    '',
    '> NOTE: STATE/MEMORY.md は自動更新していません。',
  ];
  return suggestions.join('\n');
}

function main(): void {
  try {
    ensureDir(STATE_DIR);
    ensureDir(SESSIONS_DIR);

    const date = new Date();
    const sessionDirName = nowForDir(date);
    const isoTimestamp = date.toISOString();
    const sessionDir = join(SESSIONS_DIR, sessionDirName);
    ensureDir(sessionDir);

    const activeTask = safeRead(ACTIVE_TASK_PATH);
    writeFileSync(join(sessionDir, '_active_task.md'), activeTask, 'utf8');

    const statusHuman = runGit(['status']);
    const statusPorcelain = runGit(['status', '--porcelain']);
    const diffStat = runGit(['diff', '--stat']);
    const log5 = runGit(['log', '-n', '5', '--oneline']);
    const branchInfo = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);

    writeFileSync(join(sessionDir, 'git-status.txt'), statusHuman.output, 'utf8');
    writeFileSync(join(sessionDir, 'git-diff-stat.txt'), diffStat.output, 'utf8');
    writeFileSync(join(sessionDir, 'git-log-5.txt'), log5.output, 'utf8');

    const changedFiles = statusPorcelain.ok ? extractChangedFiles(statusPorcelain.output) : [];
    const branch = branchInfo.ok ? branchInfo.output.trim() || 'unknown' : 'no-git';
    const parsedTask = parseActiveTask(activeTask);

    const sessionMeta: SessionMeta = {
      timestamp: isoTimestamp,
      branch,
      changed_files: changedFiles,
      goal: parsedTask.goal,
      current_state: parsedTask.current_state,
      next_actions: parsedTask.next_actions,
      blockers: parsedTask.blockers,
      decisions: parsedTask.decisions,
      risk_level: parsedTask.risk_level,
      confidence: parsedTask.confidence,
      summary: parsedTask.summary,
    };
    writeFileSync(join(sessionDir, 'session.json'), JSON.stringify(sessionMeta, null, 2), 'utf8');

    const memorySuggestions = buildMemorySuggestions(activeTask, changedFiles, isoTimestamp);
    writeFileSync(MEMORY_SUGGESTIONS_PATH, memorySuggestions, 'utf8');

    console.log('[state:snapshot] completed');
    console.log(`- session: ${sessionDir}`);
    console.log(`- branch: ${branch}`);
    console.log(`- changed files: ${changedFiles.length}`);
    console.log(`- goal: ${sessionMeta.goal}`);
    console.log(`- summary: ${sessionMeta.summary}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`[state:snapshot] recovered from error: ${message}`);
  }
}

main();
