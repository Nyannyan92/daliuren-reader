import { promises as fs } from 'node:fs';
import path from 'node:path';

const ENV_PATH = path.join(process.cwd(), '.env.local');

export async function readEnvLocal(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(ENV_PATH, 'utf-8');
    const out: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      out[k] = v;
    }
    return out;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw err;
  }
}

export async function writeEnvLocal(updates: Record<string, string>): Promise<void> {
  const current = await readEnvLocal();
  const merged = { ...current, ...updates };
  const lines = Object.entries(merged)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${v}`);
  await fs.writeFile(ENV_PATH, lines.join('\n') + '\n', 'utf-8');
}

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

export async function hasGeminiKey(): Promise<boolean> {
  if (process.env.GEMINI_API_KEY) return true;
  const env = await readEnvLocal();
  return Boolean(env.GEMINI_API_KEY);
}

export async function getGeminiKeyMasked(): Promise<string | null> {
  const fromProc = process.env.GEMINI_API_KEY;
  if (fromProc) return maskKey(fromProc);
  const env = await readEnvLocal();
  return env.GEMINI_API_KEY ? maskKey(env.GEMINI_API_KEY) : null;
}

export async function getGeminiModel(): Promise<string> {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  const env = await readEnvLocal();
  return env.GEMINI_MODEL || 'gemini-3-pro';
}

export async function ensureEnvLoaded(): Promise<void> {
  const env = await readEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
}
