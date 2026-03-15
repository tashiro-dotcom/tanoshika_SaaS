'use client';

import { uatScenarioItems } from '../../_lib/types';
import type { UseUatResult } from './useUat';

export default function UatSection({ uatState }: { uatState: UseUatResult }) {
  return (
    <section className="card">
      <h2>UAT実施記録</h2>
      <p className="small">現場テストの進捗をこの画面で記録できます（ブラウザ保存）。</p>
      <div className="checklist">
        {uatScenarioItems.map((item) => (
          <label key={item} className="check-row">
            <input
              type="checkbox"
              checked={!!uatState.uatChecks[item]}
              onChange={(event) =>
                uatState.setUatChecks((prev) => ({
                  ...prev,
                  [item]: event.target.checked,
                }))
              }
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
      <div className="grid-2" style={{ marginTop: 10 }}>
        <label className="field">
          <span>実施者</span>
          <input value={uatState.uatExecutor} onChange={(event) => uatState.setUatExecutor(event.target.value)} placeholder="氏名" />
        </label>
        <label className="field">
          <span>対象環境</span>
          <input value={uatState.uatEnvironment} onChange={(event) => uatState.setUatEnvironment(event.target.value)} placeholder="staging / local など" />
        </label>
      </div>
      <label className="field">
        <span>不具合・要望メモ</span>
        <textarea
          rows={4}
          value={uatState.uatNotes}
          onChange={(event) => uatState.setUatNotes(event.target.value)}
          placeholder="再現手順・期待結果・実際結果を残す"
        />
      </label>
      <button type="button" onClick={() => void uatState.copyUatRecord()}>
        実施記録をコピー
      </button>
    </section>
  );
}
