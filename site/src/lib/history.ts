'use client';

import type { CourseChart, SavedChart } from './types';

const STORAGE_KEY = 'daliuren.history.v1';
const MAX_ITEMS = 20;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

// 读取历史课盘列表（按 savedAt 降序）
export function loadHistory(): SavedChart[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((it): it is SavedChart =>
        it && typeof it === 'object' && typeof it.id === 'string' && it.chart,
      )
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch (err) {
    console.warn('[history] 读取历史课盘失败：', err);
    return [];
  }
}

function persist(list: SavedChart[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[history] 保存历史课盘失败：', err);
  }
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// 追加一条提交记录；超过 MAX_ITEMS 自动裁剪最旧的
export function saveSubmittedChart(chart: CourseChart): SavedChart[] {
  if (!isBrowser()) return [];
  const entry: SavedChart = {
    id: genId(),
    savedAt: Date.now(),
    chart: structuredCloneSafe(chart),
  };
  const next = [entry, ...loadHistory()].slice(0, MAX_ITEMS);
  persist(next);
  return next;
}

export function removeFromHistory(id: string): SavedChart[] {
  if (!isBrowser()) return [];
  const next = loadHistory().filter((it) => it.id !== id);
  persist(next);
  return next;
}

export function clearHistory(): SavedChart[] {
  if (!isBrowser()) return [];
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[history] 清空历史课盘失败：', err);
  }
  return [];
}

// 兼容老浏览器，缺失 structuredClone 时退化到 JSON 深拷贝
function structuredCloneSafe<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch {
      // ignore，走 JSON
    }
  }
  return JSON.parse(JSON.stringify(obj)) as T;
}
