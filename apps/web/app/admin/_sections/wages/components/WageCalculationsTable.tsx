'use client';

import EmptyState from '../../../_components/EmptyState';
import type { UseWagesResult } from '../useWages';

export default function WageCalculationsTable({ wagesState }: { wagesState: UseWagesResult }) {
  return (
    <table className="table" style={{ marginTop: 12 }}>
      <thead>
        <tr>
          <th>計算ID</th>
          <th>対象</th>
          <th>時間</th>
          <th>支給額</th>
          <th>区分反映内訳</th>
          <th>状態</th>
        </tr>
      </thead>
      <tbody>
        {wagesState.wageCalculations.map((item) => (
          <tr key={item.id}>
            <td>
              <button type="button" className="link-button" onClick={() => wagesState.selectWageCalculation(item.id)}>
                {item.id.slice(0, 8)}
              </button>
            </td>
            <td>{item.year}-{String(item.month).padStart(2, '0')} / {item.serviceUserId.slice(0, 8)}</td>
            <td>{item.totalHours}h</td>
            <td>{item.netAmount.toLocaleString('ja-JP')}円</td>
            <td className="small">
              {item.dayStatusSummary ? (
                <>
                  実績{item.dayStatusSummary.actualWorkedHours}h → 反映{item.dayStatusSummary.adjustedHours}h
                  <br />
                  Δ{item.dayStatusSummary.deltaHours >= 0 ? '+' : ''}
                  {item.dayStatusSummary.deltaHours}h
                  <br />
                  欠勤:{item.dayStatusSummary.counts.absent} / 有給:{item.dayStatusSummary.counts.paid_leave} / 休日:
                  {item.dayStatusSummary.counts.scheduled_holiday}
                </>
              ) : (
                '-'
              )}
            </td>
            <td>{item.status}</td>
          </tr>
        ))}
        {wagesState.wageCalculations.length === 0 ? <EmptyState colSpan={6} message="計算データ未作成" /> : null}
      </tbody>
    </table>
  );
}
