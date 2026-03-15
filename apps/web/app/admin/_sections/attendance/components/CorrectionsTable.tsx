'use client';

import EmptyState from '../../../_components/EmptyState';
import { formatDateTime } from '../../../_lib/helpers';
import type { UseAttendanceResult } from '../useAttendance';

export default function CorrectionsTable({ attendanceState }: { attendanceState: UseAttendanceResult }) {
  return (
    <table className="table" style={{ marginTop: 12 }}>
      <thead>
        <tr>
          <th>申請ID</th>
          <th>対象ログ</th>
          <th>状態</th>
          <th>理由</th>
          <th>希望時刻</th>
        </tr>
      </thead>
      <tbody>
        {attendanceState.attendanceCorrections.map((corr) => (
          <tr key={corr.id}>
            <td>
              <button
                type="button"
                className="link-button"
                onClick={() => attendanceState.setApproveCorrectionId(corr.id)}
                title={corr.id}
              >
                {corr.id.slice(0, 8)}
              </button>
            </td>
            <td>{corr.attendanceLogId.slice(0, 8)}</td>
            <td>{corr.status}</td>
            <td>{corr.reason}</td>
            <td>
              {formatDateTime(corr.requestedClockInAt)} {' / '} {formatDateTime(corr.requestedClockOutAt)}
            </td>
          </tr>
        ))}
        {attendanceState.attendanceCorrections.length === 0 ? <EmptyState colSpan={5} message="申請データ未作成" /> : null}
      </tbody>
    </table>
  );
}
