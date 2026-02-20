const endpointGroups = [
  {
    title: '認証',
    items: ['POST /auth/login', 'POST /auth/mfa/verify', 'POST /auth/refresh', 'POST /auth/logout'],
  },
  {
    title: '利用者・支援',
    items: ['GET/POST/PATCH /service-users', 'PATCH /service-users/:id/status', 'GET/POST/PATCH /support-plans', 'GET/POST/PATCH /support-records'],
  },
  {
    title: '勤怠・工賃',
    items: ['POST /attendance/clock-in', 'POST /attendance/clock-out', 'POST /attendance-corrections', 'POST /wages/calculate-monthly'],
  },
];

export default function HomePage() {
  return (
    <main className="container">
      <h1>A型事業所向け支援管理アプリ（MVP）</h1>
      <p className="small">スタッフ運用を優先した最小構成。利用者ポータルは閲覧機能のみ。</p>

      <div className="grid">
        {endpointGroups.map((group) => (
          <section className="card" key={group.title}>
            <h2>{group.title}</h2>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>主要画面</h2>
        <ul>
          <li>スタッフダッシュボード（この画面）</li>
          <li><a href="/admin">管理ダッシュボード（実運用UI）</a></li>
          <li><a href="/portal">利用者ポータル（閲覧）</a></li>
        </ul>
      </section>
    </main>
  );
}
