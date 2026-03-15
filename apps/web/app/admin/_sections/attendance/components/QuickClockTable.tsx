'use client';

import EmptyState from '../../../_components/EmptyState';
import { formatDateTime, isLeaveLikeStatus, labelForDayStatus } from '../../../_lib/helpers';
import { attendanceDayStatusOptions, type AttendanceDayStatusValue, type ServiceUser } from '../../../_lib/types';
import type { UseAttendanceResult } from '../useAttendance';

type QuickClockTableProps = {
  attendanceState: UseAttendanceResult;
  serviceUsers: ServiceUser[];
  tokenReady: boolean;
  loading: boolean;
};

export default function QuickClockTable({ attendanceState, serviceUsers, tokenReady, loading }: QuickClockTableProps) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>利用者</th>
          <th>直近ログ</th>
          <th>直近状態</th>
          <th>日別区分</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        {serviceUsers.map((user) => {
          const latest = attendanceState.latestAttendanceByServiceUser.get(user.id);
          const isClocking = !!attendanceState.quickClockLoadingByUser[user.id];
          const quickError = attendanceState.quickClockErrorByUser[user.id] || '';
          const dayStatus = attendanceState.dayStatusByServiceUser.get(user.id);
          const isWorking = !!latest && !latest.clockOutAt;
          const dayStatusDraft = attendanceState.dayStatusDraftByUser[user.id] || (dayStatus?.status as AttendanceDayStatusValue) || 'present';
          const leaveLike = isLeaveLikeStatus(dayStatusDraft);
          const statusText = isWorking
            ? '勤務中'
            : latest?.clockOutAt
              ? '退勤済'
              : dayStatus
                ? labelForDayStatus(dayStatus.status)
                : '未打刻';
          const statusClassName = isWorking
            ? 'status-badge status-working'
            : latest?.clockOutAt
              ? 'status-badge status-done'
              : dayStatus
                ? 'status-badge status-leave'
                : 'status-badge status-missing';

          return (
            <tr key={`quick-clock-${user.id}`}>
              <td>
                {user.fullName}
                <br />
                <span className="small">{user.id.slice(0, 8)}</span>
                {quickError ? (
                  <>
                    <br />
                    <span className="error">{quickError}</span>
                  </>
                ) : null}
              </td>
              <td>
                {latest ? (
                  <>
                    <span>{latest.id.slice(0, 8)}</span>
                    <br />
                    <span className="small">{formatDateTime(latest.clockInAt)}</span>
                    {latest.clockOutAt ? (
                      <>
                        <br />
                        <span className="small">{formatDateTime(latest.clockOutAt)}</span>
                      </>
                    ) : null}
                  </>
                ) : (
                  '-'
                )}
              </td>
              <td><span className={statusClassName}>{statusText}</span></td>
              <td>
                <div className="field" style={{ marginBottom: 0 }}>
                  <select
                    value={dayStatusDraft}
                    onChange={(event) =>
                      attendanceState.setDayStatusDraftByUser((prev) => ({
                        ...prev,
                        [user.id]: event.target.value as AttendanceDayStatusValue,
                      }))
                    }
                    disabled={!tokenReady || loading}
                  >
                    {attendanceDayStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={attendanceState.dayStatusNoteByUser[user.id] || ''}
                    onChange={(event) =>
                      attendanceState.setDayStatusNoteByUser((prev) => ({
                        ...prev,
                        [user.id]: event.target.value,
                      }))
                    }
                    placeholder="区分メモ（任意）"
                    disabled={!tokenReady || loading}
                  />
                  <button
                    type="button"
                    disabled={!tokenReady || loading || !!attendanceState.dayStatusSavingByUser[user.id]}
                    onClick={() => void attendanceState.upsertDayStatus(user.id)}
                  >
                    {attendanceState.dayStatusSavingByUser[user.id] ? '保存中...' : '区分を保存'}
                  </button>
                  {attendanceState.dayStatusErrorByUser[user.id] ? (
                    <span className="error">{attendanceState.dayStatusErrorByUser[user.id]}</span>
                  ) : null}
                </div>
              </td>
              <td>
                <div className="actions compact-actions">
                  <button
                    type="button"
                    disabled={!tokenReady || loading || isClocking || isWorking || leaveLike}
                    onClick={() => {
                      void attendanceState.runClockAction(user.id, 'clock-in');
                    }}
                  >
                    {isClocking ? '処理中...' : '出勤'}
                  </button>
                  <button
                    type="button"
                    disabled={!tokenReady || loading || isClocking || !isWorking || leaveLike}
                    onClick={() => {
                      void attendanceState.runClockAction(user.id, 'clock-out');
                    }}
                  >
                    {isClocking ? '処理中...' : '退勤'}
                  </button>
                  <button
                    type="button"
                    disabled={!latest}
                    onClick={() => {
                      if (!latest) return;
                      attendanceState.selectCorrectionTarget(user.fullName, latest.id);
                    }}
                  >
                    修正対象にする
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
        {serviceUsers.length === 0 ? <EmptyState colSpan={5} message="利用者一覧を先に取得してください" /> : null}
      </tbody>
    </table>
  );
}
