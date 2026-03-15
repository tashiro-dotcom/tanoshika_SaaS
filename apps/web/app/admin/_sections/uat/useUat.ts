'use client';

import { useCallback, useEffect, useState } from 'react';
import { buildUatReport } from '../../_lib/helpers';
import { uatScenarioItems, uatStorageKey } from '../../_lib/types';

export function useUat(setOpsInfo: (value: string) => void, setError: (value: string) => void) {
  const [uatChecks, setUatChecks] = useState<Record<string, boolean>>({});
  const [uatExecutor, setUatExecutor] = useState('');
  const [uatEnvironment, setUatEnvironment] = useState('');
  const [uatNotes, setUatNotes] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem(uatStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        checks?: Record<string, boolean>;
        executor?: string;
        environment?: string;
        notes?: string;
      };
      if (parsed.checks) setUatChecks(parsed.checks);
      if (typeof parsed.executor === 'string') setUatExecutor(parsed.executor);
      if (typeof parsed.environment === 'string') setUatEnvironment(parsed.environment);
      if (typeof parsed.notes === 'string') setUatNotes(parsed.notes);
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      uatStorageKey,
      JSON.stringify({
        checks: uatChecks,
        executor: uatExecutor,
        environment: uatEnvironment,
        notes: uatNotes,
      }),
    );
  }, [uatChecks, uatEnvironment, uatExecutor, uatNotes]);

  const copyUatRecord = useCallback(async () => {
    const done = uatScenarioItems.filter((item) => uatChecks[item]);
    const pending = uatScenarioItems.filter((item) => !uatChecks[item]);
    const report = buildUatReport(done as string[], pending as string[], uatExecutor, uatEnvironment, uatNotes);

    try {
      await navigator.clipboard.writeText(report);
      setOpsInfo('UAT実施記録をクリップボードへコピーしました。');
    } catch {
      setError('UAT実施記録のコピーに失敗しました。');
    }
  }, [setError, setOpsInfo, uatChecks, uatEnvironment, uatExecutor, uatNotes]);

  return {
    uatChecks,
    setUatChecks,
    uatExecutor,
    setUatExecutor,
    uatEnvironment,
    setUatEnvironment,
    uatNotes,
    setUatNotes,
    copyUatRecord,
  };
}

export type UseUatResult = ReturnType<typeof useUat>;
