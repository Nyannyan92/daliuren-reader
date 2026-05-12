'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [hasKey, setHasKey] = useState(false);
  const [masked, setMasked] = useState<string | null>(null);
  const [model, setModel] = useState('gemini-3-pro');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: { hasKey: boolean; masked: string | null; model: string }) => {
        setHasKey(d.hasKey);
        setMasked(d.masked);
        setModel(d.model || 'gemini-3-pro');
      })
      .catch(() => undefined);
  }, []);

  async function onSave() {
    setMsg(null);
    if (!apiKey.trim() && !model.trim()) {
      setMsg({ kind: 'err', text: '请至少填写 API Key 或 模型名称' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          model: model.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || '保存失败');
      setMsg({ kind: 'ok', text: '已保存。' });
      setApiKey('');
      const r2 = await fetch('/api/settings');
      const d2 = (await r2.json()) as { hasKey: boolean; masked: string | null; model: string };
      setHasKey(d2.hasKey);
      setMasked(d2.masked);
      setModel(d2.model || 'gemini-3-pro');
    } catch (e) {
      const text = e instanceof Error ? e.message : '保存失败';
      setMsg({ kind: 'err', text });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-primary">设置</h1>
        <Link
          href="/"
          className="text-sm text-ink-secondary hover:text-primary"
        >
          ← 返回主页
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-bg-card p-6">
        <h2 className="mb-4 font-serif text-lg text-primary">Gemini API 配置</h2>

        <div className="mb-5 rounded border border-border bg-primary-muted/40 p-3 text-sm text-ink-secondary">
          <div>
            当前 Key 状态：
            <span className={hasKey ? 'text-success' : 'text-warning'}>
              {hasKey ? `已配置（${masked}）` : '未配置'}
            </span>
          </div>
          <div className="mt-1">当前模型：{model}</div>
        </div>

        <label className="mb-2 block text-sm text-ink-secondary">
          GEMINI_API_KEY
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="粘贴 Google AI Studio 密钥（留空则保留原值）"
          className="mb-4 w-full rounded border border-border bg-bg px-3 py-2 text-ink outline-none focus:border-primary"
        />

        <label className="mb-2 block text-sm text-ink-secondary">
          GEMINI_MODEL
        </label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="例如：gemini-3-pro / gemini-2.5-pro"
          className="mb-5 w-full rounded border border-border bg-bg px-3 py-2 text-ink outline-none focus:border-primary"
        />

        <button
          onClick={onSave}
          disabled={saving}
          className="rounded bg-primary px-5 py-2 text-bg hover:bg-primary-light"
        >
          {saving ? '保存中…' : '保存'}
        </button>

        {msg && (
          <div
            className={`mt-4 text-sm ${
              msg.kind === 'ok' ? 'text-success' : 'text-danger'
            }`}
          >
            {msg.text}
          </div>
        )}

        <p className="mt-6 text-xs text-ink-muted">
          密钥会写入 <code>.env.local</code>，仅在本地使用，不会上传到任何远端。
        </p>
      </section>
    </main>
  );
}
