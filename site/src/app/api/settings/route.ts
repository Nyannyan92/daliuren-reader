import { NextRequest, NextResponse } from 'next/server';
import {
  getGeminiKeyMasked,
  getGeminiModel,
  hasGeminiKey,
  writeEnvLocal,
} from '@/lib/settings';

export const runtime = 'nodejs';

export async function GET() {
  const has = await hasGeminiKey();
  const masked = has ? await getGeminiKeyMasked() : null;
  const model = await getGeminiModel();
  return NextResponse.json({ hasKey: has, masked, model });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    apiKey?: string;
    model?: string;
  };
  const apiKey = body.apiKey?.trim();
  const model = body.model?.trim();

  const updates: Record<string, string> = {};
  if (apiKey) updates.GEMINI_API_KEY = apiKey;
  if (model) updates.GEMINI_MODEL = model;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'apiKey 或 model 至少需要一个' },
      { status: 400 },
    );
  }

  await writeEnvLocal(updates);
  if (updates.GEMINI_API_KEY) process.env.GEMINI_API_KEY = updates.GEMINI_API_KEY;
  if (updates.GEMINI_MODEL) process.env.GEMINI_MODEL = updates.GEMINI_MODEL;
  return NextResponse.json({ ok: true });
}
