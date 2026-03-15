'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { fetchJson, postJson } from '../../_lib/api-client';
import {
  buildCorrectionTargetSummary,
  buildDayStatusByServiceUser,
  buildLatestAttendanceByServiceUser,
  updateAttendanceCorrectionCollection,
  updateAttendanceLogCollection,
} from '../../_lib/helpers';
import type {
  AttendanceCorrection,
  AttendanceDayStatus,
  AttendanceDayStatusValue,
  AttendanceLog,
  GlobalActionRunner,
  ServiceUser,
} from '../../_lib/types';

export type AttendanceSharedContext = {
  accessToken: string;
  tokenReady: boolean;
  loading: boolean;
  setError: (value: string) => void;
  setOpsInfo: (value: string) => void;
  runGlobalAction: GlobalActionRunner;
  serviceUsers: ServiceUser[];
};

export function useAttendance(shared: AttendanceSharedContext) {
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [attendanceCorrections, setAttendanceCorrections] = useState<AttendanceCorrection[]>([]);
  const [attendanceDayStatuses, setAttendanceDayStatuses] = useState<AttendanceDayStatus[]>([]);
  const [correctionTargetLogId, setCorrectionTargetLogId] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionClockInAt, setCorrectionClockInAt] = useState('');
  const [correctionClockOutAt, setCorrectionClockOutAt] = useState('');
  const [approveCorrectionId, setApproveCorrectionId] = useState('');
  const [clockMethod, setClockMethod] = useState('web');
  const [clockLocation, setClockLocation] = useState('');
  const [quickClockLoadingByUser, setQuickClockLoadingByUser] = useState<Record<string, boolean>>({});
  const [quickClockErrorByUser, setQuickClockErrorByUser] = useState<Record<string, string>>({});
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [dayStatusDraftByUser, setDayStatusDraftByUser] = useState<Record<string, AttendanceDayStatusValue>>({});
  const [dayStatusNoteByUser, setDayStatusNoteByUser] = useState<Record<string, string>>({});
  const [dayStatusSavingByUser, setDayStatusSavingByUser] = useState<Record<string, boolean>>({});
  const [dayStatusErrorByUser, setDayStatusErrorByUser] = useState<Record<string, string>>({});

  const latestAttendanceByServiceUser = useMemo(
    () => buildLatestAttendanceByServiceUser(attendanceLogs),
    [attendanceLogs],
  );
  const dayStatusByServiceUser = useMemo(
    () => buildDayStatusByServiceUser(attendanceDayStatuses),
    [attendanceDayStatuses],
  );
  const correctionTargetSummary = useMemo(
    () => buildCorrectionTargetSummary(correctionTargetLogId, attendanceLogs, shared.serviceUsers),
    [attendanceLogs, correctionTargetLogId, shared.serviceUsers],
  );

  const refreshAttendanceLogs = useCallback(async (token: string) => {
    const data = await fetchJson<AttendanceLog[]>('/attendance?page=1&limit=20', token.trim());
    setAttendanceLogs(data);
    if (data.length > 0 && !correctionTargetLogId) {
      setCorrectionTargetLogId(data[0].id);
    }
  }, [correctionTargetLogId]);

  const refreshAttendanceDayStatuses = useCallback(async (token: string, targetWorkDate = workDate) => {
    const from = `${targetWorkDate}T00:00:00.000Z`;
    const to = `${targetWorkDate}T23:59:59.999Z`;
    const data = await fetchJson<AttendanceDayStatus[]>(
      `/attendance-statuses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=1&limit=200`,
      token.trim(),
    );
    setAttendanceDayStatuses(data);
    setDayStatusDraftByUser((prev) => {
      const next = { ...prev };
      for (const item of data) {
        next[item.serviceUserId] = (item.status as AttendanceDayStatusValue) || 'present';
      }
      return next;
    });
    setDayStatusNoteByUser((prev) => {
      const next = { ...prev };
      for (const item of data) {
        next[item.serviceUserId] = item.note || '';
      }
      return next;
    });
  }, [workDate]);

  useEffect(() => {
    if (!shared.tokenReady) return;
    void refreshAttendanceDayStatuses(shared.accessToken.trim(), workDate);
  }, [refreshAttendanceDayStatuses, shared.accessToken, shared.tokenReady, workDate]);

  const loadAttendance = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady) return;
    try {
      await shared.runGlobalAction(async () => {
        await refreshAttendanceLogs(shared.accessToken.trim());
        await refreshAttendanceDayStatuses(shared.accessToken.trim());
        shared.setOpsInfo('勤怠一覧を更新しました。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '勤怠一覧の取得に失敗しました');
    }
  }, [refreshAttendanceDayStatuses, refreshAttendanceLogs, shared]);

  const createAttendanceCorrection = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady || !correctionTargetLogId || !correctionReason.trim()) return;
    try {
      await shared.runGlobalAction(async () => {
        const item = await postJson<AttendanceCorrection>(
          '/attendance-corrections',
          {
            attendanceLogId: correctionTargetLogId,
            reason: correctionReason.trim(),
            requestedClockInAt: correctionClockInAt ? new Date(correctionClockInAt).toISOString() : undefined,
            requestedClockOutAt: correctionClockOutAt ? new Date(correctionClockOutAt).toISOString() : undefined,
          },
          shared.accessToken.trim(),
        );
        setAttendanceCorrections((prev) => updateAttendanceCorrectionCollection(prev, item));
        setApproveCorrectionId(item.id);
        setCorrectionReason('');
        setCorrectionClockInAt('');
        setCorrectionClockOutAt('');
        shared.setOpsInfo('勤怠修正申請を作成しました。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '勤怠修正申請の作成に失敗しました');
    }
  }, [correctionClockInAt, correctionClockOutAt, correctionReason, correctionTargetLogId, shared]);

  const runClockAction = useCallback(async (serviceUserId: string, action: 'clock-in' | 'clock-out') => {
    if (!shared.tokenReady) return;
    const userName = shared.serviceUsers.find((item) => item.id === serviceUserId)?.fullName || serviceUserId.slice(0, 8);
    setQuickClockLoadingByUser((prev) => ({ ...prev, [serviceUserId]: true }));
    setQuickClockErrorByUser((prev) => ({ ...prev, [serviceUserId]: '' }));
    try {
      await shared.runGlobalAction(async () => {
        const item = await postJson<AttendanceLog>(
          `/attendance/${action}`,
          {
            serviceUserId,
            ...(action === 'clock-in'
              ? {
                  method: clockMethod || 'web',
                  location: clockLocation.trim() || undefined,
                }
              : {}),
          },
          shared.accessToken.trim(),
        );
        setAttendanceLogs((prev) => updateAttendanceLogCollection(prev, item));
        setCorrectionTargetLogId((prev) => prev || item.id);
        shared.setOpsInfo(`「${userName}」の${action === 'clock-in' ? '出勤' : '退勤'}打刻を登録しました。`);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : `${action === 'clock-in' ? '出勤' : '退勤'}打刻に失敗しました`;
      setQuickClockErrorByUser((prev) => ({ ...prev, [serviceUserId]: message }));
      shared.setError(message);
    } finally {
      setQuickClockLoadingByUser((prev) => ({ ...prev, [serviceUserId]: false }));
    }
  }, [clockLocation, clockMethod, shared]);

  const upsertDayStatus = useCallback(async (serviceUserId: string) => {
    if (!shared.tokenReady) return;
    const status = dayStatusDraftByUser[serviceUserId] || 'present';
    const note = dayStatusNoteByUser[serviceUserId] || '';
    setDayStatusSavingByUser((prev) => ({ ...prev, [serviceUserId]: true }));
    setDayStatusErrorByUser((prev) => ({ ...prev, [serviceUserId]: '' }));
    try {
      await shared.runGlobalAction(async () => {
        const item = await postJson<AttendanceDayStatus>(
          '/attendance-statuses/upsert',
          {
            serviceUserId,
            workDate,
            status,
            note: note.trim() || undefined,
          },
          shared.accessToken.trim(),
        );
        setAttendanceDayStatuses((prev) => {
          const filtered = prev.filter((entry) => entry.serviceUserId !== serviceUserId);
          return [item, ...filtered];
        });
        shared.setOpsInfo('日別勤怠区分を更新しました。');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '日別勤怠区分の更新に失敗しました';
      setDayStatusErrorByUser((prev) => ({ ...prev, [serviceUserId]: message }));
      shared.setError(message);
    } finally {
      setDayStatusSavingByUser((prev) => ({ ...prev, [serviceUserId]: false }));
    }
  }, [dayStatusDraftByUser, dayStatusNoteByUser, shared, workDate]);

  const approveAttendanceCorrection = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady || !approveCorrectionId.trim()) return;
    try {
      await shared.runGlobalAction(async () => {
        const item = await postJson<AttendanceCorrection>(
          `/attendance-corrections/${approveCorrectionId.trim()}/approve`,
          {},
          shared.accessToken.trim(),
        );
        setAttendanceCorrections((prev) => updateAttendanceCorrectionCollection(prev, item));
        await refreshAttendanceLogs(shared.accessToken.trim());
        shared.setOpsInfo('勤怠修正申請を承認しました。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '勤怠修正申請の承認に失敗しました');
    }
  }, [approveCorrectionId, refreshAttendanceLogs, shared]);

  const selectCorrectionTarget = useCallback((serviceUserName: string, attendanceLogId: string) => {
    setCorrectionTargetLogId(attendanceLogId);
    shared.setOpsInfo(`「${serviceUserName}」の直近ログを修正申請対象に設定しました。`);
  }, [shared]);

  return {
    attendanceLogs,
    attendanceCorrections,
    attendanceDayStatuses,
    latestAttendanceByServiceUser,
    dayStatusByServiceUser,
    correctionTargetLogId,
    setCorrectionTargetLogId,
    correctionTargetSummary,
    correctionReason,
    setCorrectionReason,
    correctionClockInAt,
    setCorrectionClockInAt,
    correctionClockOutAt,
    setCorrectionClockOutAt,
    approveCorrectionId,
    setApproveCorrectionId,
    clockMethod,
    setClockMethod,
    clockLocation,
    setClockLocation,
    quickClockLoadingByUser,
    quickClockErrorByUser,
    workDate,
    setWorkDate,
    dayStatusDraftByUser,
    setDayStatusDraftByUser,
    dayStatusNoteByUser,
    setDayStatusNoteByUser,
    dayStatusSavingByUser,
    dayStatusErrorByUser,
    refreshAttendanceDayStatuses,
    loadAttendance,
    createAttendanceCorrection,
    runClockAction,
    upsertDayStatus,
    approveAttendanceCorrection,
    selectCorrectionTarget,
  };
}

export type UseAttendanceResult = ReturnType<typeof useAttendance>;
