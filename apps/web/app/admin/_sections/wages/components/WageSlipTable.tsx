'use client';

import type { WageSlip } from '../../../_lib/types';

export default function WageSlipTable({ wageSlip }: { wageSlip: WageSlip }) {
  return (
    <table className="table" style={{ marginTop: 12 }}>
      <tbody>
        <tr><th>利用者</th><td>{wageSlip.serviceUserName}</td></tr>
        <tr><th>対象月</th><td>{wageSlip.month}</td></tr>
        <tr><th>総時間</th><td>{wageSlip.totalHours}h</td></tr>
        <tr><th>時給</th><td>{wageSlip.hourlyRate.toLocaleString('ja-JP')}円</td></tr>
        <tr><th>支給額</th><td>{wageSlip.netAmount.toLocaleString('ja-JP')}円</td></tr>
        <tr><th>実績時間</th><td>{wageSlip.dayStatusSummary.actualWorkedHours}h</td></tr>
        <tr><th>反映時間</th><td>{wageSlip.dayStatusSummary.adjustedHours}h</td></tr>
        <tr><th>時間差分</th><td>{wageSlip.dayStatusSummary.deltaHours >= 0 ? '+' : ''}{wageSlip.dayStatusSummary.deltaHours}h</td></tr>
        <tr>
          <th>区分件数</th>
          <td>
            欠勤:{wageSlip.dayStatusSummary.counts.absent} /
            有給:{wageSlip.dayStatusSummary.counts.paid_leave} /
            所定休日:{wageSlip.dayStatusSummary.counts.scheduled_holiday} /
            特休:{wageSlip.dayStatusSummary.counts.special_leave}
          </td>
        </tr>
        <tr><th>状態</th><td>{wageSlip.statusLabel}</td></tr>
      </tbody>
    </table>
  );
}
