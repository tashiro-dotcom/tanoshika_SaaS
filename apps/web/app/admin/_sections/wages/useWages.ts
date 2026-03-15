'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { downloadAuthenticatedFile, fetchJson, postJson, sendJson } from '../../_lib/api-client';
import { updateWageCalculationCollection } from '../../_lib/helpers';
import type {
  GlobalActionRunner,
  WageCalculateResponse,
  WageCalculationItem,
  WageRuleChangeRequest,
  WageRules,
  WageSlip,
  WageTemplatesResponse,
} from '../../_lib/types';

export type WagesSharedContext = {
  accessToken: string;
  tokenReady: boolean;
  setError: (value: string) => void;
  setOpsInfo: (value: string) => void;
  runGlobalAction: GlobalActionRunner;
};

export function useWages(shared: WagesSharedContext) {
  const [wageTemplates, setWageTemplates] = useState<WageTemplatesResponse | null>(null);
  const [wageRules, setWageRules] = useState<WageRules>({
    standardDailyHours: 4,
    presentPolicy: 'actual_only',
    absentPolicy: 'fixed_zero',
    paidLeavePolicy: 'fixed_standard',
    scheduledHolidayPolicy: 'fixed_zero',
    specialLeavePolicy: 'fixed_standard',
  });
  const [wageRuleChangeReason, setWageRuleChangeReason] = useState('');
  const [wageRuleRequests, setWageRuleRequests] = useState<WageRuleChangeRequest[]>([]);
  const [wageRuleReviewCommentById, setWageRuleReviewCommentById] = useState<Record<string, string>>({});
  const [wageCalculations, setWageCalculations] = useState<WageCalculationItem[]>([]);
  const [wageSlip, setWageSlip] = useState<WageSlip | null>(null);
  const [wageYear, setWageYear] = useState(new Date().getFullYear());
  const [wageMonth, setWageMonth] = useState(new Date().getMonth() + 1);
  const [approveWageId, setApproveWageId] = useState('');
  const [slipWageId, setSlipWageId] = useState('');

  const refreshWageRules = useCallback(async (token: string) => {
    const data = await fetchJson<WageRules>('/wages/rules', token);
    setWageRules(data);
  }, []);

  const refreshWageRuleRequests = useCallback(async (token: string) => {
    const data = await fetchJson<WageRuleChangeRequest[]>('/wages/rules/requests?status=pending', token);
    setWageRuleRequests(data);
  }, []);

  const loadWageTemplates = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady) return;
    try {
      await shared.runGlobalAction(async () => {
        const data = await fetchJson<WageTemplatesResponse>('/wages/templates', shared.accessToken.trim());
        setWageTemplates(data);
        shared.setOpsInfo('賃金テンプレートを取得しました。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '賃金テンプレートの取得に失敗しました');
    }
  }, [shared]);

  const loadWageRules = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady) return;
    try {
      await shared.runGlobalAction(async () => {
        const data = await fetchJson<WageRules>('/wages/rules', shared.accessToken.trim());
        setWageRules(data);
        shared.setOpsInfo('賃金計算ルールを取得しました。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '賃金計算ルールの取得に失敗しました');
    }
  }, [shared]);

  const saveWageRules = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady) return;
    try {
      await shared.runGlobalAction(async () => {
        const data = await sendJson<WageRules>(
          'PUT',
          '/wages/rules',
          {
            ...wageRules,
            changeReason: wageRuleChangeReason,
          },
          shared.accessToken.trim(),
        );
        setWageRules(data);
        setWageRuleChangeReason('');
        shared.setOpsInfo('賃金計算ルールを更新しました。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '賃金計算ルールの更新に失敗しました');
    }
  }, [shared, wageRuleChangeReason, wageRules]);

  const loadWageRuleRequests = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady) return;
    try {
      await shared.runGlobalAction(async () => {
        const data = await fetchJson<WageRuleChangeRequest[]>('/wages/rules/requests?status=pending', shared.accessToken.trim());
        setWageRuleRequests(data);
        shared.setOpsInfo(`賃金ルール変更申請を取得しました（${data.length}件）。`);
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '賃金ルール変更申請の取得に失敗しました');
    }
  }, [shared]);

  const createWageRuleRequest = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady) return;
    try {
      await shared.runGlobalAction(async () => {
        const created = await postJson<WageRuleChangeRequest>(
          '/wages/rules/requests',
          {
            ...wageRules,
            changeReason: wageRuleChangeReason,
          },
          shared.accessToken.trim(),
        );
        setWageRuleChangeReason('');
        setWageRuleRequests((prev) => [created, ...prev]);
        shared.setOpsInfo('賃金ルール変更申請を作成しました。別ユーザーで承認してください。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '賃金ルール変更申請の作成に失敗しました');
    }
  }, [shared, wageRuleChangeReason, wageRules]);

  const approveWageRuleRequest = useCallback(async (requestId: string) => {
    if (!shared.tokenReady) return;
    try {
      await shared.runGlobalAction(async () => {
        await postJson<WageRuleChangeRequest>(`/wages/rules/requests/${requestId}/approve`, {}, shared.accessToken.trim());
        await Promise.all([refreshWageRules(shared.accessToken.trim()), refreshWageRuleRequests(shared.accessToken.trim())]);
        shared.setOpsInfo('賃金ルール変更申請を承認し、ルールへ適用しました。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '賃金ルール変更申請の承認に失敗しました');
    }
  }, [refreshWageRuleRequests, refreshWageRules, shared]);

  const rejectWageRuleRequest = useCallback(async (requestId: string) => {
    if (!shared.tokenReady) return;
    const reviewComment = (wageRuleReviewCommentById[requestId] || '').trim();
    if (!reviewComment) {
      shared.setError('却下理由を入力してください。');
      return;
    }
    try {
      await shared.runGlobalAction(async () => {
        await postJson<WageRuleChangeRequest>(
          `/wages/rules/requests/${requestId}/reject`,
          { reviewComment },
          shared.accessToken.trim(),
        );
        setWageRuleReviewCommentById((prev) => ({ ...prev, [requestId]: '' }));
        await refreshWageRuleRequests(shared.accessToken.trim());
        shared.setOpsInfo('賃金ルール変更申請を却下しました。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '賃金ルール変更申請の却下に失敗しました');
    }
  }, [refreshWageRuleRequests, shared, wageRuleReviewCommentById]);

  const calculateMonthlyWages = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady) return;
    try {
      await shared.runGlobalAction(async () => {
        const data = await postJson<WageCalculateResponse>(
          '/wages/calculate-monthly',
          { year: wageYear, month: wageMonth },
          shared.accessToken.trim(),
        );
        setWageCalculations(data.items);
        if (data.items.length > 0) {
          setApproveWageId(data.items[0].id);
          setSlipWageId(data.items[0].id);
        }
        shared.setOpsInfo(`月次賃金を計算しました（${data.count}件）。`);
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '月次賃金計算に失敗しました');
    }
  }, [shared, wageMonth, wageYear]);

  const approveWageCalculation = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady || !approveWageId.trim()) return;
    try {
      await shared.runGlobalAction(async () => {
        const item = await postJson<WageCalculationItem>(`/wages/${approveWageId.trim()}/approve`, {}, shared.accessToken.trim());
        setWageCalculations((prev) => updateWageCalculationCollection(prev, item));
        setSlipWageId(item.id);
        shared.setOpsInfo('賃金計算を承認しました。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '賃金承認に失敗しました');
    }
  }, [approveWageId, shared]);

  const loadWageSlipJson = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady || !slipWageId.trim()) return;
    try {
      await shared.runGlobalAction(async () => {
        const item = await fetchJson<WageSlip>(`/wages/${slipWageId.trim()}/slip`, shared.accessToken.trim());
        setWageSlip(item);
        shared.setOpsInfo('賃金明細(JSON)を取得しました。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '賃金明細(JSON)の取得に失敗しました');
    }
  }, [shared, slipWageId]);

  const downloadWageSlip = useCallback(async (format: 'csv' | 'pdf') => {
    if (!shared.tokenReady || !slipWageId.trim()) return;
    try {
      await shared.runGlobalAction(async () => {
        const filename = await downloadAuthenticatedFile(
          `/wages/${slipWageId.trim()}/slip.${format}`,
          shared.accessToken.trim(),
          `wage-slip-${slipWageId.slice(0, 8)}.${format}`,
        );
        if (!filename) return;
        shared.setOpsInfo(`賃金明細(${format.toUpperCase()})をダウンロードしました。`);
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : `賃金明細(${format.toUpperCase()})の取得に失敗しました`);
    }
  }, [shared, slipWageId]);

  const selectWageCalculation = useCallback((wageId: string) => {
    setApproveWageId(wageId);
    setSlipWageId(wageId);
  }, []);

  return {
    wageTemplates,
    wageRules,
    setWageRules,
    wageRuleChangeReason,
    setWageRuleChangeReason,
    wageRuleRequests,
    wageRuleReviewCommentById,
    setWageRuleReviewCommentById,
    wageCalculations,
    wageSlip,
    wageYear,
    setWageYear,
    wageMonth,
    setWageMonth,
    approveWageId,
    setApproveWageId,
    slipWageId,
    setSlipWageId,
    loadWageTemplates,
    loadWageRules,
    saveWageRules,
    loadWageRuleRequests,
    createWageRuleRequest,
    approveWageRuleRequest,
    rejectWageRuleRequest,
    calculateMonthlyWages,
    approveWageCalculation,
    loadWageSlipJson,
    downloadWageSlip,
    selectWageCalculation,
  };
}

export type UseWagesResult = ReturnType<typeof useWages>;
