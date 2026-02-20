import AdminConsole from './admin-console';

export default function AdminPage() {
  return (
    <main className="container">
      <h1>管理ダッシュボード（MVP）</h1>
      <p className="small">
        スタッフ向けの運用画面。現時点では API連携確認を優先した土台UIです。
      </p>
      <AdminConsole />
    </main>
  );
}
