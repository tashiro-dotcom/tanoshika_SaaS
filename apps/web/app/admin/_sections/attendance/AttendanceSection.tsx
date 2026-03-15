'use client';

import CorrectionsTable from './components/CorrectionsTable';
import QuickClockTable from './components/QuickClockTable';
import type { UseAttendanceResult } from './useAttendance';
import type { ServiceUser } from '../../_lib/types';

type AttendanceSectionProps = {
  attendanceState: UseAttendanceResult;
  serviceUsers: ServiceUser[];
  tokenReady: boolean;
  loading: boolean;
  accessToken: string;
};

export default function AttendanceSection({
  attendanceState,
  serviceUsers,
  tokenReady,
  loading,
  accessToken,
}: AttendanceSectionProps) {
  return (
    <section className="card">
      <h2>3. 勤怠管理</h2>
      <p className="small">利用者行の「出勤/退勤」を押すだけで打刻できます。</p>
      <div className="grid-2">
        <label className="field">
          <span>勤務日</span>
          <input type="date" value={attendanceState.workDate} onChange={(event) => attendanceState.setWorkDate(event.target.value)} />
        </label>
        <div className="field">
          <span>日別区分の再取得</span>
          <button
            type="button"
            disabled={!tokenReady || loading}
            onClick={() => void attendanceState.refreshAttendanceDayStatuses(accessToken.trim())}
          >
            区分を再取得
          </button>
        </div>
      </div>
      <div className="grid-2">
        <label className="field">
          <span>打刻方法（行内打刻の共通値）</span>
          <select value={attendanceState.clockMethod} onChange={(event) => attendanceState.setClockMethod(event.target.value)}>
            <option value="web">web</option>
            <option value="qr">qr</option>
            <option value="proxy">proxy</option>
          </select>
        </label>
        <label className="field">
          <span>位置情報メモ（行内打刻の共通値）</span>
          <input
            value={attendanceState.clockLocation}
            onChange={(event) => attendanceState.setClockLocation(event.target.value)}
            placeholder="福岡市中央区"
          />
        </label>
      </div>
      <h3 style={{ margin: '8px 0' }}>ワンクリック打刻（利用者ごと）</h3>
      <QuickClockTable
        attendanceState={attendanceState}
        serviceUsers={serviceUsers}
        tokenReady={tokenReady}
        loading={loading}
      />
      <form onSubmit={attendanceState.loadAttendance}>
        <button disabled={!tokenReady || loading} type="submit">勤怠一覧を取得</button>
      </form>
      <form onSubmit={attendanceState.createAttendanceCorrection} style={{ marginTop: 12 }}>
        <h3 style={{ margin: '0 0 8px' }}>修正申請</h3>
        {attendanceState.correctionTargetSummary ? <p className="small">現在の対象: {attendanceState.correctionTargetSummary}</p> : null}
        <label className="field">
          <span>対象勤怠ログ</span>
          <select
            value={attendanceState.correctionTargetLogId}
            onChange={(event) => attendanceState.setCorrectionTargetLogId(event.target.value)}
            disabled={attendanceState.attendanceLogs.length === 0}
          >
            {attendanceState.attendanceLogs.length === 0 ? (
              <option value="">勤怠一覧を先に取得</option>
            ) : (
              attendanceState.attendanceLogs.map((log) => (
                <option key={log.id} value={log.id}>
                  {log.id.slice(0, 8)} / {log.serviceUserId.slice(0, 8)}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="field">
          <span>修正理由（必須）</span>
          <input value={attendanceState.correctionReason} onChange={(event) => attendanceState.setCorrectionReason(event.target.value)} placeholder="退勤時刻修正" />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>希望出勤時刻</span>
            <input type="datetime-local" value={attendanceState.correctionClockInAt} onChange={(event) => attendanceState.setCorrectionClockInAt(event.target.value)} />
          </label>
          <label className="field">
            <span>希望退勤時刻</span>
            <input type="datetime-local" value={attendanceState.correctionClockOutAt} onChange={(event) => attendanceState.setCorrectionClockOutAt(event.target.value)} />
          </label>
        </div>
        <button disabled={!tokenReady || loading || !attendanceState.correctionTargetLogId || !attendanceState.correctionReason.trim()} type="submit">
          修正申請を作成
        </button>
      </form>
      <form onSubmit={attendanceState.approveAttendanceCorrection} style={{ marginTop: 12 }}>
        <h3 style={{ margin: '0 0 8px' }}>修正承認</h3>
        <label className="field">
          <span>修正申請ID</span>
          <input
            value={attendanceState.approveCorrectionId}
            onChange={(event) => attendanceState.setApproveCorrectionId(event.target.value)}
            placeholder="UUIDを入力（下表から選択可）"
          />
        </label>
        <button disabled={!tokenReady || loading || !attendanceState.approveCorrectionId.trim()} type="submit">申請を承認</button>
      </form>
      <CorrectionsTable attendanceState={attendanceState} />
    </section>
  );
}
