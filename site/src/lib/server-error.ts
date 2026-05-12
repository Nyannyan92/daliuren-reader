import { NextResponse } from 'next/server';
import { MissingApiKeyError } from './gemini';

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof MissingApiKeyError) {
    return NextResponse.json(
      { error: err.message, code: 'NO_API_KEY' },
      { status: 412 },
    );
  }
  const msg = err instanceof Error ? err.message : 'Unknown error';
  console.error('[API ERROR]', err);
  return NextResponse.json({ error: msg }, { status: 500 });
}
