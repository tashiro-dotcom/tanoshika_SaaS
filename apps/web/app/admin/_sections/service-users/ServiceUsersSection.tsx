'use client';

import EmptyState from '../../_components/EmptyState';
import { normalizeServiceUserStatus } from '../../_lib/helpers';
import { serviceUserStatuses, type ServiceUserStatus } from '../../_lib/types';
import type { UseServiceUsersResult } from './useServiceUsers';

type ServiceUsersSectionProps = {
  serviceUsersState: UseServiceUsersResult;
  tokenReady: boolean;
  loading: boolean;
};

export default function ServiceUsersSection({ serviceUsersState, tokenReady, loading }: ServiceUsersSectionProps) {
  return (
    <section className="card">
      <h2>2. 利用者管理</h2>
      <p className="small">登録した利用者は一覧行でそのままステータス更新できます。打刻対象にも自動セットされます。</p>
      <form onSubmit={serviceUsersState.loadServiceUsers}>
        <button disabled={!tokenReady || loading} type="submit">利用者一覧を取得</button>
      </form>
      <form onSubmit={serviceUsersState.createServiceUser} style={{ marginTop: 12 }}>
        <h3 style={{ margin: '0 0 8px' }}>新規登録</h3>
        <label className="field">
          <span>氏名（必須）</span>
          <input value={serviceUsersState.newFullName} onChange={(event) => serviceUsersState.setNewFullName(event.target.value)} placeholder="山田 太郎" />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>障害区分</span>
            <input
              value={serviceUsersState.newDisabilityCategory}
              onChange={(event) => serviceUsersState.setNewDisabilityCategory(event.target.value)}
              placeholder="身体"
            />
          </label>
          <label className="field">
            <span>契約日</span>
            <input type="date" value={serviceUsersState.newContractDate} onChange={(event) => serviceUsersState.setNewContractDate(event.target.value)} />
          </label>
        </div>
        <div className="grid-2">
          <label className="field">
            <span>電話</span>
            <input value={serviceUsersState.newPhone} onChange={(event) => serviceUsersState.setNewPhone(event.target.value)} placeholder="09012345678" />
          </label>
          <label className="field">
            <span>初期ステータス</span>
            <select value={serviceUsersState.newStatus} onChange={(event) => serviceUsersState.setNewStatus(event.target.value as ServiceUserStatus)}>
              {serviceUserStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>緊急連絡先</span>
          <input
            value={serviceUsersState.newEmergencyContact}
            onChange={(event) => serviceUsersState.setNewEmergencyContact(event.target.value)}
            placeholder="母 09000000000"
          />
        </label>
        <button disabled={!tokenReady || loading || !serviceUsersState.newFullName.trim()} type="submit">利用者を登録</button>
      </form>
      <p className="small" style={{ marginTop: 10 }}>下の一覧から「更新」またはクイック操作でステータス更新できます。</p>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>氏名</th>
            <th>ステータス</th>
            <th>組織</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {serviceUsersState.serviceUsers.map((user) => (
            <tr key={user.id} className={serviceUsersState.recentCreatedUserId === user.id ? 'row-highlight' : undefined}>
              <td>{user.id.slice(0, 8)}</td>
              <td>{user.fullName}</td>
              <td>
                <select
                  value={serviceUsersState.inlineStatusDrafts[user.id] || normalizeServiceUserStatus(user.status)}
                  onChange={(event) =>
                    serviceUsersState.setInlineStatusDrafts((prev) => ({
                      ...prev,
                      [user.id]: event.target.value as ServiceUserStatus,
                    }))
                  }
                >
                  {serviceUserStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td>{user.organizationId}</td>
              <td>
                <div className="actions compact-actions">
                  <button
                    type="button"
                    disabled={
                      !tokenReady ||
                      loading ||
                      serviceUsersState.updatingServiceUserId === user.id ||
                      (serviceUsersState.inlineStatusDrafts[user.id] || normalizeServiceUserStatus(user.status)) === user.status
                    }
                    onClick={() =>
                      void serviceUsersState.updateServiceUserStatusById(
                        user.id,
                        serviceUsersState.inlineStatusDrafts[user.id] || normalizeServiceUserStatus(user.status),
                      )
                    }
                  >
                    {serviceUsersState.updatingServiceUserId === user.id ? '更新中...' : '更新'}
                  </button>
                  <button
                    type="button"
                    disabled={!tokenReady || loading || serviceUsersState.updatingServiceUserId === user.id || user.status === 'active'}
                    onClick={() => {
                      void serviceUsersState.applyQuickStatus(user.id, 'active');
                    }}
                  >
                    稼働中へ
                  </button>
                  <button
                    type="button"
                    disabled={!tokenReady || loading || serviceUsersState.updatingServiceUserId === user.id || user.status === 'leaving'}
                    onClick={() => {
                      void serviceUsersState.applyQuickStatus(user.id, 'leaving');
                    }}
                  >
                    退所準備へ
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {serviceUsersState.serviceUsers.length === 0 ? <EmptyState colSpan={5} message="データ未取得" /> : null}
        </tbody>
      </table>
    </section>
  );
}
