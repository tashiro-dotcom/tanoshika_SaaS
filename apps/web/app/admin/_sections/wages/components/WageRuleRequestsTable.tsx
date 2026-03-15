'use client';

import EmptyState from '../../../_components/EmptyState';
import type { UseWagesResult } from '../useWages';

type WageRuleRequestsTableProps = {
  wagesState: UseWagesResult;
  tokenReady: boolean;
  loading: boolean;
};

export default function WageRuleRequestsTable({ wagesState, tokenReady, loading }: WageRuleRequestsTableProps) {
  return (
    <table className="table" style={{ marginTop: 8 }}>
      <thead>
        <tr>
          <th>申請ID</th>
          <th>理由</th>
          <th>標準時間</th>
          <th>申請者</th>
          <th>状態</th>
          <th>却下理由</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        {wagesState.wageRuleRequests.map((item) => (
          <tr key={item.id}>
            <td>{item.id.slice(0, 8)}</td>
            <td>{item.changeReason}</td>
            <td>{item.standardDailyHours}</td>
            <td>{item.requestedBy.slice(0, 8)}</td>
            <td>{item.status}</td>
            <td>
              <input
                value={wagesState.wageRuleReviewCommentById[item.id] || ''}
                onChange={(event) =>
                  wagesState.setWageRuleReviewCommentById((prev) => ({
                    ...prev,
                    [item.id]: event.target.value,
                  }))
                }
                placeholder="却下時のみ必須"
              />
            </td>
            <td>
              <button disabled={!tokenReady || loading || item.status !== 'pending'} type="button" onClick={() => void wagesState.approveWageRuleRequest(item.id)}>
                承認
              </button>
              <button
                style={{ marginLeft: 8 }}
                disabled={!tokenReady || loading || item.status !== 'pending'}
                type="button"
                onClick={() => void wagesState.rejectWageRuleRequest(item.id)}
              >
                却下
              </button>
            </td>
          </tr>
        ))}
        {wagesState.wageRuleRequests.length === 0 ? <EmptyState colSpan={7} message="申請データ未取得" /> : null}
      </tbody>
    </table>
  );
}
