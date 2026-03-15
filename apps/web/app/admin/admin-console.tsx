'use client';

import LoadingIndicator from './_components/LoadingIndicator';
import AttendanceSection from './_sections/attendance/AttendanceSection';
import { useAttendance } from './_sections/attendance/useAttendance';
import AuthSection from './_sections/auth/AuthSection';
import { useAuth } from './_sections/auth/useAuth';
import ServiceUsersSection from './_sections/service-users/ServiceUsersSection';
import { useServiceUsers } from './_sections/service-users/useServiceUsers';
import UatSection from './_sections/uat/UatSection';
import { useUat } from './_sections/uat/useUat';
import WagesSection from './_sections/wages/WagesSection';
import { useWages } from './_sections/wages/useWages';

export default function AdminConsole() {
  const auth = useAuth();
  const serviceUsersState = useServiceUsers({
    accessToken: auth.accessToken,
    tokenReady: auth.tokenReady,
    loading: auth.loading,
    setError: auth.setError,
    setOpsInfo: auth.setOpsInfo,
    runGlobalAction: auth.runGlobalAction,
  });
  const attendanceState = useAttendance({
    accessToken: auth.accessToken,
    tokenReady: auth.tokenReady,
    loading: auth.loading,
    setError: auth.setError,
    setOpsInfo: auth.setOpsInfo,
    runGlobalAction: auth.runGlobalAction,
    serviceUsers: serviceUsersState.serviceUsers,
  });
  const wagesState = useWages({
    accessToken: auth.accessToken,
    tokenReady: auth.tokenReady,
    setError: auth.setError,
    setOpsInfo: auth.setOpsInfo,
    runGlobalAction: auth.runGlobalAction,
  });
  const uatState = useUat(auth.setOpsInfo, auth.setError);

  return (
    <div className="grid">
      <section className="card guide-card">
        <h2>最短手順ガイド（現場向け）</h2>
        <ol className="guide-list">
          <li>「ログイン」でMFA認証を完了する</li>
          <li>「利用者一覧を取得」で対象利用者を読み込む</li>
          <li>当日運用は「勤怠管理」で出勤/退勤を打刻する</li>
          <li>打刻ミス時は「修正申請」を作成し、管理者が承認する</li>
          <li>月末は「賃金管理」で計算→承認→明細出力する</li>
        </ol>
        <p className="small">操作結果は画面上部のメッセージ欄に表示されます。</p>
        {auth.loading ? <LoadingIndicator /> : null}
      </section>

      <UatSection uatState={uatState} />
      <AuthSection auth={auth} />
      <ServiceUsersSection serviceUsersState={serviceUsersState} tokenReady={auth.tokenReady} loading={auth.loading} />
      <AttendanceSection
        attendanceState={attendanceState}
        serviceUsers={serviceUsersState.serviceUsers}
        tokenReady={auth.tokenReady}
        loading={auth.loading}
        accessToken={auth.accessToken}
      />
      <WagesSection wagesState={wagesState} tokenReady={auth.tokenReady} loading={auth.loading} />
    </div>
  );
}
