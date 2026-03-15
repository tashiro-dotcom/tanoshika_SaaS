'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { fetchJson, patchJson, postJson } from '../../_lib/api-client';
import { normalizeServiceUserStatus } from '../../_lib/helpers';
import type { GlobalActionRunner, ServiceUser, ServiceUserStatus } from '../../_lib/types';

export type ServiceUsersSharedContext = {
  accessToken: string;
  tokenReady: boolean;
  loading: boolean;
  setError: (value: string) => void;
  setOpsInfo: (value: string) => void;
  runGlobalAction: GlobalActionRunner;
};

export function useServiceUsers(shared: ServiceUsersSharedContext) {
  const [serviceUsers, setServiceUsers] = useState<ServiceUser[]>([]);
  const [newFullName, setNewFullName] = useState('');
  const [newDisabilityCategory, setNewDisabilityCategory] = useState('');
  const [newContractDate, setNewContractDate] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmergencyContact, setNewEmergencyContact] = useState('');
  const [newStatus, setNewStatus] = useState<ServiceUserStatus>('active');
  const [inlineStatusDrafts, setInlineStatusDrafts] = useState<Record<string, ServiceUserStatus>>({});
  const [updatingServiceUserId, setUpdatingServiceUserId] = useState('');
  const [recentCreatedUserId, setRecentCreatedUserId] = useState('');

  const refreshServiceUsers = useCallback(async (token: string) => {
    const data = await fetchJson<ServiceUser[]>('/service-users?page=1&limit=20', token.trim());
    setServiceUsers(data);
    setInlineStatusDrafts((prev) => {
      const next: Record<string, ServiceUserStatus> = {};
      for (const user of data) {
        next[user.id] = prev[user.id] || normalizeServiceUserStatus(user.status);
      }
      return next;
    });
  }, []);

  const loadServiceUsers = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady) return;
    try {
      await shared.runGlobalAction(async () => {
        await refreshServiceUsers(shared.accessToken.trim());
        shared.setOpsInfo('利用者一覧を更新しました。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '利用者一覧の取得に失敗しました');
    }
  }, [refreshServiceUsers, shared]);

  const createServiceUser = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shared.tokenReady || !newFullName.trim()) return;
    try {
      await shared.runGlobalAction(async () => {
        const created = await postJson<ServiceUser>(
          '/service-users',
          {
            fullName: newFullName.trim(),
            disabilityCategory: newDisabilityCategory.trim() || undefined,
            contractDate: newContractDate || undefined,
            phone: newPhone.trim() || undefined,
            emergencyContact: newEmergencyContact.trim() || undefined,
            status: newStatus,
          },
          shared.accessToken.trim(),
        );
        await refreshServiceUsers(shared.accessToken.trim());
        setRecentCreatedUserId(created.id);
        setNewFullName('');
        setNewDisabilityCategory('');
        setNewContractDate('');
        setNewPhone('');
        setNewEmergencyContact('');
        setNewStatus('active');
        shared.setOpsInfo(`利用者を登録しました。次は勤怠管理の行内ボタンから「${created.fullName}」を打刻できます。`);
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : '利用者登録に失敗しました');
    }
  }, [newContractDate, newDisabilityCategory, newEmergencyContact, newFullName, newPhone, newStatus, refreshServiceUsers, shared]);

  const updateServiceUserStatusById = useCallback(async (serviceUserId: string, status: ServiceUserStatus) => {
    if (!shared.tokenReady) return;
    setUpdatingServiceUserId(serviceUserId);
    try {
      await shared.runGlobalAction(async () => {
        await patchJson<ServiceUser>(`/service-users/${serviceUserId}/status`, { status }, shared.accessToken.trim());
        await refreshServiceUsers(shared.accessToken.trim());
        shared.setOpsInfo('利用者ステータスを更新しました。');
      });
    } catch (err) {
      shared.setError(err instanceof Error ? err.message : 'ステータス更新に失敗しました');
    } finally {
      setUpdatingServiceUserId('');
    }
  }, [refreshServiceUsers, shared]);

  const applyQuickStatus = useCallback(async (serviceUserId: string, status: ServiceUserStatus) => {
    setInlineStatusDrafts((prev) => ({ ...prev, [serviceUserId]: status }));
    await updateServiceUserStatusById(serviceUserId, status);
  }, [updateServiceUserStatusById]);

  return {
    serviceUsers,
    newFullName,
    setNewFullName,
    newDisabilityCategory,
    setNewDisabilityCategory,
    newContractDate,
    setNewContractDate,
    newPhone,
    setNewPhone,
    newEmergencyContact,
    setNewEmergencyContact,
    newStatus,
    setNewStatus,
    inlineStatusDrafts,
    setInlineStatusDrafts,
    updatingServiceUserId,
    recentCreatedUserId,
    loadServiceUsers,
    createServiceUser,
    updateServiceUserStatusById,
    applyQuickStatus,
  };
}

export type UseServiceUsersResult = ReturnType<typeof useServiceUsers>;
