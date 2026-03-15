'use client';

import EmptyState from '../../_components/EmptyState';
import type { WageRules } from '../../_lib/types';
import WageCalculationsTable from './components/WageCalculationsTable';
import WageRuleRequestsTable from './components/WageRuleRequestsTable';
import WageSlipTable from './components/WageSlipTable';
import type { UseWagesResult } from './useWages';

type WagesSectionProps = {
  wagesState: UseWagesResult;
  tokenReady: boolean;
  loading: boolean;
};

export default function WagesSection({ wagesState, tokenReady, loading }: WagesSectionProps) {
  return (
    <section className="card">
      <h2>4. 賃金管理</h2>
      <form onSubmit={wagesState.loadWageRules}>
        <h3 style={{ margin: '0 0 8px' }}>賃金計算ルール</h3>
        <button disabled={!tokenReady || loading} type="submit">ルールを取得</button>
      </form>
      <form onSubmit={wagesState.createWageRuleRequest} style={{ marginTop: 12 }}>
        <div className="grid-2">
          <label className="field">
            <span>標準日時間</span>
            <input
              type="number"
              min={1}
              max={12}
              step={0.5}
              value={wagesState.wageRules.standardDailyHours}
              onChange={(event) =>
                wagesState.setWageRules((prev) => ({ ...prev, standardDailyHours: Number(event.target.value) }))
              }
            />
          </label>
          <label className="field">
            <span>出勤(present)</span>
            <select
              value={wagesState.wageRules.presentPolicy}
              onChange={(event) =>
                wagesState.setWageRules((prev) => ({
                  ...prev,
                  presentPolicy: event.target.value as WageRules['presentPolicy'],
                }))
              }
            >
              <option value="actual_only">実績時間を使用</option>
              <option value="fixed_zero">0時間固定</option>
              <option value="fixed_standard">標準時間固定</option>
            </select>
          </label>
        </div>
        <div className="grid-2">
          <label className="field">
            <span>欠勤(absent)</span>
            <select
              value={wagesState.wageRules.absentPolicy}
              onChange={(event) =>
                wagesState.setWageRules((prev) => ({
                  ...prev,
                  absentPolicy: event.target.value as WageRules['absentPolicy'],
                }))
              }
            >
              <option value="actual_only">実績時間を使用</option>
              <option value="fixed_zero">0時間固定</option>
              <option value="fixed_standard">標準時間固定</option>
            </select>
          </label>
          <label className="field">
            <span>有給(paid_leave)</span>
            <select
              value={wagesState.wageRules.paidLeavePolicy}
              onChange={(event) =>
                wagesState.setWageRules((prev) => ({
                  ...prev,
                  paidLeavePolicy: event.target.value as WageRules['paidLeavePolicy'],
                }))
              }
            >
              <option value="actual_only">実績時間を使用</option>
              <option value="fixed_zero">0時間固定</option>
              <option value="fixed_standard">標準時間固定</option>
            </select>
          </label>
        </div>
        <div className="grid-2">
          <label className="field">
            <span>所定休日(scheduled_holiday)</span>
            <select
              value={wagesState.wageRules.scheduledHolidayPolicy}
              onChange={(event) =>
                wagesState.setWageRules((prev) => ({
                  ...prev,
                  scheduledHolidayPolicy: event.target.value as WageRules['scheduledHolidayPolicy'],
                }))
              }
            >
              <option value="actual_only">実績時間を使用</option>
              <option value="fixed_zero">0時間固定</option>
              <option value="fixed_standard">標準時間固定</option>
            </select>
          </label>
          <label className="field">
            <span>特休(special_leave)</span>
            <select
              value={wagesState.wageRules.specialLeavePolicy}
              onChange={(event) =>
                wagesState.setWageRules((prev) => ({
                  ...prev,
                  specialLeavePolicy: event.target.value as WageRules['specialLeavePolicy'],
                }))
              }
            >
              <option value="actual_only">実績時間を使用</option>
              <option value="fixed_zero">0時間固定</option>
              <option value="fixed_standard">標準時間固定</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>変更理由（監査ログ用・必須）</span>
          <input
            value={wagesState.wageRuleChangeReason}
            onChange={(event) => wagesState.setWageRuleChangeReason(event.target.value)}
            placeholder="例: 2026年4月運用見直しのため"
            required
          />
        </label>
        <button disabled={!tokenReady || loading} type="submit">変更申請を作成</button>
      </form>
      <form onSubmit={wagesState.loadWageRuleRequests} style={{ marginTop: 8 }}>
        <button disabled={!tokenReady || loading} type="submit">変更申請を取得</button>
      </form>
      <WageRuleRequestsTable wagesState={wagesState} tokenReady={tokenReady} loading={loading} />
      <form onSubmit={wagesState.saveWageRules} style={{ marginTop: 12 }}>
        <button disabled={!tokenReady || loading} type="submit">管理者が直接保存（互換）</button>
      </form>
      <form onSubmit={wagesState.calculateMonthlyWages}>
        <h3 style={{ margin: '0 0 8px' }}>月次賃金計算</h3>
        <div className="grid-2">
          <label className="field">
            <span>年</span>
            <input type="number" value={wagesState.wageYear} onChange={(event) => wagesState.setWageYear(Number(event.target.value))} min={2020} max={2100} />
          </label>
          <label className="field">
            <span>月</span>
            <input type="number" value={wagesState.wageMonth} onChange={(event) => wagesState.setWageMonth(Number(event.target.value))} min={1} max={12} />
          </label>
        </div>
        <button disabled={!tokenReady || loading} type="submit">月次賃金を計算</button>
      </form>
      <form onSubmit={wagesState.approveWageCalculation} style={{ marginTop: 12 }}>
        <h3 style={{ margin: '0 0 8px' }}>賃金承認</h3>
        <label className="field">
          <span>賃金計算ID</span>
          <input value={wagesState.approveWageId} onChange={(event) => wagesState.setApproveWageId(event.target.value)} placeholder="UUIDを入力（下表から選択可）" />
        </label>
        <button disabled={!tokenReady || loading || !wagesState.approveWageId.trim()} type="submit">賃金を承認</button>
      </form>
      <form onSubmit={wagesState.loadWageSlipJson} style={{ marginTop: 12 }}>
        <h3 style={{ margin: '0 0 8px' }}>賃金明細</h3>
        <label className="field">
          <span>対象賃金ID</span>
          <input value={wagesState.slipWageId} onChange={(event) => wagesState.setSlipWageId(event.target.value)} placeholder="UUIDを入力（下表から選択可）" />
        </label>
        <div className="actions">
          <button disabled={!tokenReady || loading || !wagesState.slipWageId.trim()} type="submit">明細(JSON)取得</button>
          <button disabled={!tokenReady || loading || !wagesState.slipWageId.trim()} type="button" onClick={() => void wagesState.downloadWageSlip('csv')}>
            明細CSV
          </button>
          <button disabled={!tokenReady || loading || !wagesState.slipWageId.trim()} type="button" onClick={() => void wagesState.downloadWageSlip('pdf')}>
            明細PDF
          </button>
        </div>
      </form>
      <form onSubmit={wagesState.loadWageTemplates} style={{ marginTop: 12 }}>
        <button disabled={!tokenReady || loading} type="submit">テンプレートを取得</button>
      </form>
      {wagesState.wageTemplates ? (
        <>
          <p>現在: {wagesState.wageTemplates.current.label} ({wagesState.wageTemplates.current.code})</p>
          <p className="small">注記: {wagesState.wageTemplates.current.note}</p>
          <ul>
            {wagesState.wageTemplates.available.map((item) => (
              <li key={item.code}>
                {item.label} ({item.code})
                <br />
                <span className="small">{item.note}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState message="データ未取得" />
      )}
      <WageCalculationsTable wagesState={wagesState} />
      {wagesState.wageSlip ? <WageSlipTable wageSlip={wagesState.wageSlip} /> : null}
    </section>
  );
}
