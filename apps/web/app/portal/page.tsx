export default function PortalPage() {
  return (
    <main className="container">
      <h1>利用者ポータル（閲覧専用）</h1>
      <p className="small">MVPでは出勤状況、賃金実績、支援サマリのみ参照可能。</p>
      <div className="grid">
        <section className="card">
          <h2>出勤サマリ</h2>
          <p>API: GET /me/attendance-summary</p>
        </section>
        <section className="card">
          <h2>賃金サマリ</h2>
          <p>API: GET /me/wage-summary</p>
        </section>
        <section className="card">
          <h2>支援サマリ</h2>
          <p>API: GET /me/support-summary</p>
        </section>
      </div>
    </main>
  );
}
