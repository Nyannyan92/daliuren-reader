'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type {
  Branch4Course,
  ChatMessage,
  CourseChart,
  SavedChart,
  ThreePassages,
} from '@/lib/types';
import {
  clearHistory,
  loadHistory,
  removeFromHistory,
  saveSubmittedChart,
} from '@/lib/history';
import { formatChartAsUserMessage } from '@/lib/prompts';

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const TWELVE_GODS = [
  '贵人',
  '螣蛇',
  '朱雀',
  '六合',
  '勾陈',
  '青龙',
  '天空',
  '白虎',
  '太常',
  '玄武',
  '太阴',
  '天后',
];

function emptyCourseRow(): Branch4Course {
  return { upperGod: '', upper: '', lower: '' };
}

function emptyPassages(): ThreePassages {
  return {
    first: { branch: '', god: '' },
    middle: { branch: '', god: '' },
    last: { branch: '', god: '' },
  };
}

function emptyChart(): CourseChart {
  return {
    pillars: { year: '', month: '', day: '', hour: '' },
    monthGeneral: '',
    hourBranch: '',
    sex: '男',
    course: {
      one: emptyCourseRow(),
      two: emptyCourseRow(),
      three: emptyCourseRow(),
      four: emptyCourseRow(),
    },
    passages: emptyPassages(),
    noblePalace: '',
    question: '',
    natalYear: '',
    currentYear: '',
    voidPalaces: '',
    notes: '',
  };
}

function sectionLabel(text: string) {
  return (
    <div className="mb-2 mt-5 border-l-2 border-primary pl-3 font-serif text-sm tracking-wide text-primary">
      {text}
    </div>
  );
}

function fieldLabel(text: string, required = false) {
  return (
    <label className="mb-1 block text-xs text-ink-secondary">
      {text}
      {required && <span className="ml-1 text-accent">*</span>}
    </label>
  );
}

function inputCls(extra = '') {
  return `w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-ink outline-none focus:border-primary ${extra}`;
}

function selectCls(extra = '') {
  return `w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-ink outline-none focus:border-primary ${extra}`;
}

interface ChartSummaryProps {
  chart: CourseChart;
  onReset: () => void;
}

function ChartSummary({ chart, onReset }: ChartSummaryProps) {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-4 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-serif text-primary">已提交课盘</div>
        <button
          onClick={onReset}
          className="text-xs text-ink-secondary hover:text-primary"
        >
          重置课盘
        </button>
      </div>
      <div className="space-y-1 text-ink-secondary">
        <div>
          <span className="text-ink-muted">所测：</span>
          {chart.question || '—'}
        </div>
        <div>
          <span className="text-ink-muted">四柱：</span>
          {chart.pillars.year} / {chart.pillars.month} / {chart.pillars.day} / {chart.pillars.hour}
        </div>
        <div>
          <span className="text-ink-muted">月将：</span>
          {chart.monthGeneral}
          <span className="ml-3 text-ink-muted">占时：</span>
          {chart.hourBranch}
          <span className="ml-3 text-ink-muted">性别：</span>
          {chart.sex}
        </div>
        <div>
          <span className="text-ink-muted">贵人天盘位：</span>
          {chart.noblePalace}
        </div>
        <div>
          <span className="text-ink-muted">三传：</span>
          {chart.passages.first.branch} / {chart.passages.middle.branch} /{' '}
          {chart.passages.last.branch}
        </div>
      </div>
    </div>
  );
}

// 把毫秒时间戳格式化为相对/绝对时间，便于在历史卡片上展示
function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  const d = new Date(ts);
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface HistoryPanelProps {
  items: SavedChart[];
  onLoad: (chart: CourseChart) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

function HistoryPanel({ items, onLoad, onRemove, onClear }: HistoryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="mb-3 rounded-lg border border-border bg-bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm"
      >
        <span className="font-serif text-primary">
          历史课盘
          <span className="ml-1 text-ink-muted">（{items.length}）</span>
        </span>
        <span className="text-xs text-ink-muted">
          {expanded ? '收起' : '展开'}
        </span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-border p-3">
          {items.map((it) => {
            const c = it.chart;
            const rawQ = (c.question || '').trim();
            const summary = rawQ
              ? rawQ.length > 40
                ? `${rawQ.slice(0, 40)}…`
                : rawQ
              : '（未填问题）';
            const pillars = `${c.pillars.year || '—'} / ${c.pillars.month || '—'} / ${c.pillars.day || '—'} / ${c.pillars.hour || '—'}`;
            return (
              <div
                key={it.id}
                className="flex items-start gap-2 rounded border border-border bg-bg p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-ink">{summary}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {pillars}
                    <span className="mx-1">·</span>
                    月将 {c.monthGeneral || '—'}
                    <span className="mx-1">·</span>
                    占时 {c.hourBranch || '—'}
                    <span className="mx-1">·</span>
                    {formatRelativeTime(it.savedAt)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onLoad(it.chart)}
                    className="rounded border border-primary-muted px-2 py-1 text-xs text-primary hover:bg-primary-muted/40"
                    title="覆盖当前表单为此课盘"
                  >
                    载入
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(it.id)}
                    className="rounded border border-border px-2 py-1 text-xs text-ink-muted hover:text-danger"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.confirm('确认清空全部历史课盘？')) {
                  onClear();
                }
              }}
              className="text-xs text-ink-muted hover:text-danger"
            >
              清空全部
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ChartFormProps {
  chart: CourseChart;
  setChart: (c: CourseChart) => void;
  onSubmit: () => void;
  submitting: boolean;
}

function ChartForm({ chart, setChart, onSubmit, submitting }: ChartFormProps) {
  function update<K extends keyof CourseChart>(key: K, value: CourseChart[K]) {
    setChart({ ...chart, [key]: value });
  }

  function updatePillars(key: keyof CourseChart['pillars'], value: string) {
    setChart({ ...chart, pillars: { ...chart.pillars, [key]: value } });
  }

  function updateCourseRow(
    key: keyof CourseChart['course'],
    field: keyof Branch4Course,
    value: string,
  ) {
    setChart({
      ...chart,
      course: {
        ...chart.course,
        [key]: { ...chart.course[key], [field]: value },
      },
    });
  }

  function updatePassage(
    key: keyof ThreePassages,
    field: 'branch' | 'god',
    value: string,
  ) {
    setChart({
      ...chart,
      passages: {
        ...chart.passages,
        [key]: { ...chart.passages[key], [field]: value },
      },
    });
  }

  const COURSE_META: {
    rowKey: keyof CourseChart['course'];
    label: string;
    col2: string;
    col3: string;
    col3Hint: string;
  }[] = [
    { rowKey: 'one', label: '一课', col2: '干阳', col3: '日干', col3Hint: '取自日柱第一字' },
    { rowKey: 'two', label: '二课', col2: '干阴', col3: '干阳', col3Hint: '同一课的干阳' },
    { rowKey: 'three', label: '三课', col2: '支阳', col3: '日支', col3Hint: '取自日柱第二字' },
    { rowKey: 'four', label: '四课', col2: '支阴', col3: '支阳', col3Hint: '同三课的支阳' },
  ];

  const passageRow = (
    label: string,
    rowKey: keyof ThreePassages,
  ) => {
    const p = chart.passages[rowKey];
    return (
      <div className="grid grid-cols-[60px_1fr_1fr] items-center gap-2">
        <span className="text-xs text-ink-muted">{label}</span>
        <select
          value={p.branch}
          onChange={(e) => updatePassage(rowKey, 'branch', e.target.value)}
          className={selectCls()}
        >
          <option value="">支辰</option>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={p.god || ''}
          onChange={(e) => updatePassage(rowKey, 'god', e.target.value)}
          className={selectCls()}
        >
          <option value="">天将（可选）</option>
          {TWELVE_GODS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-border bg-bg-card p-5">
      {sectionLabel('所测之事')}
      <textarea
        rows={2}
        value={chart.question}
        onChange={(e) => update('question', e.target.value)}
        placeholder="例如：测求职面试，今日已得通知，下周二复试是否能通过？"
        className={inputCls('resize-y')}
      />

      {sectionLabel('四柱')}
      <div className="grid grid-cols-4 gap-2">
        {(['year', 'month', 'day', 'hour'] as const).map((k) => (
          <div key={k}>
            {fieldLabel(
              { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' }[k],
              true,
            )}
            <input
              value={chart.pillars[k]}
              onChange={(e) => updatePillars(k, e.target.value)}
              placeholder="如 甲子"
              className={inputCls()}
            />
          </div>
        ))}
      </div>

      {sectionLabel('月将 / 占时 / 性别 / 贵人天盘位')}
      <div className="grid grid-cols-4 gap-2">
        <div>
          {fieldLabel('月将', true)}
          <select
            value={chart.monthGeneral}
            onChange={(e) => update('monthGeneral', e.target.value)}
            className={selectCls()}
          >
            <option value="">支辰</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          {fieldLabel('占时', true)}
          <select
            value={chart.hourBranch}
            onChange={(e) => update('hourBranch', e.target.value)}
            className={selectCls()}
          >
            <option value="">支辰</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          {fieldLabel('性别', true)}
          <select
            value={chart.sex}
            onChange={(e) => update('sex', e.target.value as CourseChart['sex'])}
            className={selectCls()}
          >
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </div>
        <div>
          {fieldLabel('贵人天盘位', true)}
          <select
            value={chart.noblePalace}
            onChange={(e) => update('noblePalace', e.target.value)}
            className={selectCls()}
          >
            <option value="">支辰</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sectionLabel('四课（选填，自右至左：一二三四）')}
      <p className="mb-2 text-[11px] text-ink-muted">
        提示：每课第三列「日干 / 干阳 / 日支 / 支阳」会根据日柱与上一课自动同步，无需手填。如已知四课请填入；不填则由 AI 在对话中追问或推算。
      </p>
      <div className="space-y-3">
        {COURSE_META.map((meta) => {
          const row = chart.course[meta.rowKey];
          return (
            <div
              key={meta.rowKey}
              className="grid grid-cols-[40px_1fr_1fr_1fr] items-end gap-2"
            >
              <span className="pb-2 text-xs text-ink-muted">{meta.label}</span>
              <div>
                <div className="mb-1 text-[10px] text-ink-muted">天将</div>
                <select
                  value={row.upperGod}
                  onChange={(e) => updateCourseRow(meta.rowKey, 'upperGod', e.target.value)}
                  className={selectCls()}
                >
                  <option value="">请选择</option>
                  {TWELVE_GODS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[10px] text-ink-muted">{meta.col2}</div>
                <select
                  value={row.upper}
                  onChange={(e) => updateCourseRow(meta.rowKey, 'upper', e.target.value)}
                  className={selectCls()}
                >
                  <option value="">请选择</option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[10px] text-ink-muted">
                  {meta.col3}
                  <span className="ml-1 text-ink-muted/70">（{meta.col3Hint}）</span>
                </div>
                <input
                  readOnly
                  value={row.lower}
                  placeholder="自动同步"
                  className={inputCls('cursor-not-allowed bg-bg-card text-ink-secondary')}
                />
              </div>
            </div>
          );
        })}
      </div>

      {sectionLabel('三传（选填）')}
      <div className="space-y-2">
        {passageRow('初传', 'first')}
        {passageRow('中传', 'middle')}
        {passageRow('末传', 'last')}
      </div>

      {sectionLabel('年命 / 行年 / 旬空')}
      <div className="grid grid-cols-3 gap-2">
        <div>
          {fieldLabel('年命', true)}
          <input
            value={chart.natalYear || ''}
            onChange={(e) => update('natalYear', e.target.value)}
            placeholder="如 戊午"
            className={inputCls()}
          />
        </div>
        <div>
          {fieldLabel('行年', true)}
          <input
            value={chart.currentYear || ''}
            onChange={(e) => update('currentYear', e.target.value)}
            placeholder="如 庚申"
            className={inputCls()}
          />
        </div>
        <div>
          {fieldLabel('旬空 / 空亡位', true)}
          <input
            value={chart.voidPalaces || ''}
            onChange={(e) => update('voidPalaces', e.target.value)}
            placeholder="如 戌亥"
            className={inputCls()}
          />
        </div>
      </div>

      {sectionLabel('补充信息（选填）')}
      <textarea
        rows={2}
        value={chart.notes || ''}
        onChange={(e) => update('notes', e.target.value)}
        placeholder="如：见生气、闭口；课式为知一课……"
        className={inputCls('resize-y')}
      />

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="mt-6 w-full rounded bg-primary py-2.5 font-serif text-bg hover:bg-primary-light"
      >
        {submitting ? '排盘中…' : '提交课盘并请求解读'}
      </button>
    </div>
  );
}

interface ChatPanelProps {
  history: ChatMessage[];
  onSend: (msg: string) => void;
  loading: boolean;
  enabled: boolean;
}

function ChatPanel({ history, onSend, loading, enabled }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history.length, loading]);

  function handleSend() {
    const text = draft.trim();
    if (!text || loading || !enabled) return;
    onSend(text);
    setDraft('');
  }

  function quickAction(text: string) {
    if (loading || !enabled) return;
    onSend(text);
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-bg-card">
      <div
        ref={scrollRef}
        className="scroll-area flex-1 overflow-y-auto p-4"
        style={{ minHeight: 360 }}
      >
        {!enabled && (
          <div className="flex h-full items-center justify-center text-sm text-ink-muted">
            请先在左侧填写并提交课盘
          </div>
        )}

        {enabled && history.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-ink-muted">
            正在等待 AI 输出"待确认课盘"…
          </div>
        )}

        <div className="space-y-4">
          {history.map((m, i) => {
            const isLast = i === history.length - 1;
            const isStreamingPlaceholder =
              m.role === 'assistant' && !m.content && loading && isLast;
            return (
              <div
                key={i}
                className={`rounded-lg border p-3 text-sm ${
                  m.role === 'assistant'
                    ? 'border-primary-muted bg-primary-muted/30'
                    : 'border-border bg-bg'
                }`}
              >
                <div className="mb-1 text-xs text-ink-muted">
                  {m.role === 'assistant' ? '解读师' : '我'}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed text-ink">
                  {isStreamingPlaceholder ? (
                    <span className="text-ink-muted">解读师正在思考…（流式输出，首段最长约 90 秒）</span>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            );
          })}
          {/* 仅在末尾不是 assistant 占位时，才显示独立 loading 条 */}
          {loading &&
            (history.length === 0 ||
              history[history.length - 1].role !== 'assistant') && (
              <div className="rounded-lg border border-primary-muted bg-primary-muted/30 p-3 text-sm text-ink-muted">
                解读师正在思考…
              </div>
            )}
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => quickAction('确认，请按六步法解读。')}
            disabled={!enabled || loading || history.length === 0}
            className="rounded border border-primary-muted px-3 py-1 text-xs text-primary hover:bg-primary-muted/40"
          >
            确认课盘并解读
          </button>
          <button
            type="button"
            onClick={() => quickAction('请单独说明应期。')}
            disabled={!enabled || loading || history.length === 0}
            className="rounded border border-primary-muted px-3 py-1 text-xs text-primary hover:bg-primary-muted/40"
          >
            看应期
          </button>
        </div>
        <div className="flex gap-2">
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={!enabled || loading}
            placeholder={
              enabled
                ? '回复"确认"或纠错；也可继续追问，例：申金作鬼是否需提防小人？（Cmd/Ctrl + Enter 发送）'
                : '请先提交课盘'
            }
            className="flex-1 resize-y rounded border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
          <button
            onClick={handleSend}
            disabled={!enabled || loading || !draft.trim()}
            className="self-stretch rounded bg-primary px-4 text-sm text-bg hover:bg-primary-light"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomeClient() {
  const [chart, setChart] = useState<CourseChart>(emptyChart());
  const [submittedChart, setSubmittedChart] = useState<CourseChart | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHistory, setSavedHistory] = useState<SavedChart[]>([]);

  // 仅在浏览器挂载后从 localStorage 载入；SSR 阶段访问 window 会报错
  useEffect(() => {
    setSavedHistory(loadHistory());
  }, []);

  useEffect(() => {
    setChart((prev) => {
      const day = (prev.pillars.day || '').trim();
      const dayStem = day[0] || '';
      const dayBranch = day[1] || '';
      const oneTarget = dayStem;
      const threeTarget = dayBranch;
      const twoTarget = prev.course.one.upper;
      const fourTarget = prev.course.three.upper;
      const c = prev.course;
      if (
        c.one.lower === oneTarget &&
        c.three.lower === threeTarget &&
        c.two.lower === twoTarget &&
        c.four.lower === fourTarget
      ) {
        return prev;
      }
      return {
        ...prev,
        course: {
          one: { ...prev.course.one, lower: oneTarget },
          two: { ...prev.course.two, lower: twoTarget },
          three: { ...prev.course.three, lower: threeTarget },
          four: { ...prev.course.four, lower: fourTarget },
        },
      };
    });
  }, [chart.pillars.day, chart.course.one.upper, chart.course.three.upper]);

  const missingFields = useMemo(() => {
    const c = chart;
    const missing: string[] = [];
    if (!c.question.trim()) missing.push('所测之事');
    if (!c.pillars.year.trim()) missing.push('年柱');
    if (!c.pillars.month.trim()) missing.push('月柱');
    if (!c.pillars.day.trim()) missing.push('日柱');
    if (!c.pillars.hour.trim()) missing.push('时柱');
    if (c.pillars.day.trim().length > 0 && c.pillars.day.trim().length < 2) {
      missing.push('日柱（需要"天干+地支"两字，如「甲子」）');
    }
    if (!c.monthGeneral) missing.push('月将');
    if (!c.hourBranch) missing.push('占时');
    if (!c.noblePalace) missing.push('贵人天盘位');
    if (!c.natalYear?.trim()) missing.push('年命');
    if (!c.currentYear?.trim()) missing.push('行年');
    if (!c.voidPalaces?.trim()) missing.push('旬空 / 空亡位');
    return missing;
  }, [chart]);
  const requiredOk = missingFields.length === 0;

  // 调用 /api/chat 的流式版本：边读边把累计文本回调给 onPartial
  // 保留原 callChat 的语义：维护 loading、统一错误信息、API Key 缺失提示
  // openingChart：非空时表示是后续轮次，前端会把首条课盘 user 消息重建到 history 最前，
  // 以满足 Gemini SDK "history 第一条必须为 user 角色" 的硬性要求。
  async function callChatStream(
    payloadHistory: ChatMessage[],
    userMessage: string,
    useChart: CourseChart | null,
    onPartial: (accumulated: string) => void,
    openingChart?: CourseChart | null,
  ): Promise<string> {
    setLoading(true);
    setError(null);
    try {
      // 后续轮次 (history 非空) 必须前置课盘 user 消息，否则 SDK 会抛
      // "First content should be with role 'user', got model"
      const sentHistory: ChatMessage[] =
        openingChart && payloadHistory.length > 0
          ? [
              { role: 'user', content: formatChartAsUserMessage(openingChart) },
              ...payloadHistory,
            ]
          : payloadHistory;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chart: useChart,
          history: sentHistory,
          userMessage,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        if (data.code === 'NO_API_KEY') {
          throw new Error('API Key 未配置，请前往「设置」页填写 GEMINI_API_KEY。');
        }
        throw new Error(data.error || '请求失败');
      }

      if (!res.body) {
        throw new Error('服务器未返回响应体');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let assembled = '';
      let serverError: string | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            const evt = JSON.parse(line) as {
              type: 'chunk' | 'done' | 'error';
              text?: string;
              message?: string;
            };
            if (evt.type === 'chunk' && evt.text) {
              assembled += evt.text;
              onPartial(assembled);
            } else if (evt.type === 'error') {
              serverError = evt.message || '解读失败';
            }
            // 'done' 仅作结束标记，无需处理
          } catch {
            // 容错：忽略解析失败行
          }
        }
      }

      if (serverError) throw new Error(serverError);
      return assembled;
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitChart() {
    if (!requiredOk) {
      setError(`以下必填项尚未完成：${missingFields.join('、')}`);
      return;
    }
    setSubmittedChart(chart);
    // 课盘通过校验即视为一次有效提交，写入本地历史，刷新后可快速复用
    setSavedHistory(saveSubmittedChart(chart));
    // 先插入空的 assistant 占位，流式 chunk 到达时持续更新其内容
    setHistory([{ role: 'assistant', content: '' }]);
    try {
      await callChatStream([], '', chart, (acc) => {
        setHistory([{ role: 'assistant', content: acc }]);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '请求失败';
      setError(msg);
      // 出错时清空占位消息
      setHistory((prev) => prev.filter((m) => m.content));
    }
  }

  async function onSendMessage(text: string) {
    if (!submittedChart) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    // 本轮 user 消息进入 UI，紧随其后是空 assistant 占位
    const uiHistoryWithUser = [...history, userMsg];
    setHistory([...uiHistoryWithUser, { role: 'assistant', content: '' }]);
    try {
      // API：传给后端的 history 是"本轮之前"的对话（不含本轮 userMsg），
      // 本轮 userMsg 通过 userMessage 字段单独发送给 SDK，避免重复
      await callChatStream(
        history,
        text,
        null,
        (acc) => {
          setHistory([...uiHistoryWithUser, { role: 'assistant', content: acc }]);
        },
        submittedChart,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : '请求失败';
      setError(msg);
      // 出错时回退到包含本轮 user 消息但无 assistant 占位的状态
      setHistory(uiHistoryWithUser);
    }
  }

  function onResetChart() {
    setSubmittedChart(null);
    setHistory([]);
    setError(null);
  }

  // 把历史课盘载入到表单（深拷贝避免与已存对象共享引用）
  function onLoadFromHistory(saved: CourseChart) {
    const cloned: CourseChart =
      typeof structuredClone === 'function'
        ? structuredClone(saved)
        : (JSON.parse(JSON.stringify(saved)) as CourseChart);
    setChart(cloned);
    setError(null);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-primary">大六壬解读</h1>
          <p className="text-xs text-ink-muted">
            录入课盘 → AI 排贵神并输出待确认课盘 → 用户确认 → 按六步法解读
          </p>
        </div>
        <Link
          href="/settings"
          className="text-sm text-ink-secondary hover:text-primary"
        >
          设置
        </Link>
      </header>

      {error && (
        <div className="mb-4 rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          {!submittedChart ? (
            <>
              <HistoryPanel
                items={savedHistory}
                onLoad={onLoadFromHistory}
                onRemove={(id) => setSavedHistory(removeFromHistory(id))}
                onClear={() => setSavedHistory(clearHistory())}
              />
              <ChartForm
                chart={chart}
                setChart={setChart}
                onSubmit={onSubmitChart}
                submitting={loading}
              />
            </>
          ) : (
            <ChartSummary chart={submittedChart} onReset={onResetChart} />
          )}
        </section>

        <section className="min-h-[480px]">
          <ChatPanel
            history={history}
            onSend={onSendMessage}
            loading={loading}
            enabled={!!submittedChart}
          />
        </section>
      </div>

      <footer className="mt-6 text-center text-xs text-ink-muted">
        本工具仅作传统术数学习与研究之用，结果不构成任何医疗、法律、财务建议。
      </footer>
    </main>
  );
}
