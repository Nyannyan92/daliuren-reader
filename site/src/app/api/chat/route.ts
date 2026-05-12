import { NextRequest, NextResponse } from 'next/server';
import { buildGeminiModel, MissingApiKeyError } from '@/lib/gemini';
import { formatChartAsUserMessage } from '@/lib/prompts';
import type { ChatRequestBody } from '@/lib/types';

export const runtime = 'nodejs';

// 首字等待上限：用来拦截 Gemini 长时间不出第一个 chunk 的"干挂"
// 一旦开始流式输出，就改用更宽松的总超时，避免长解读被腰斩
const FIRST_CHUNK_TIMEOUT_MS = Number(
  process.env.GEMINI_FIRST_CHUNK_TIMEOUT_MS || 90_000,
);
const TOTAL_TIMEOUT_MS = Number(
  process.env.GEMINI_TOTAL_TIMEOUT_MS || 300_000,
);

export async function POST(req: NextRequest) {
  // 入参校验：失败仍走 JSON 错误响应（非流式）
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.history)) {
    return NextResponse.json(
      { error: '参数缺失：history 必须为数组' },
      { status: 400 },
    );
  }

  const isFirstTurn = body.history.length === 0;
  if (isFirstTurn && !body.chart) {
    return NextResponse.json(
      { error: '首轮对话必须提交课盘 chart' },
      { status: 400 },
    );
  }

  // 拼装首轮提示或使用历史会话
  const chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  let userMessage: string;

  if (isFirstTurn && body.chart) {
    userMessage = formatChartAsUserMessage(body.chart);
  } else {
    for (const msg of body.history) {
      chatHistory.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
    userMessage = (body.userMessage || '').trim();
    if (!userMessage) {
      return NextResponse.json(
        { error: 'userMessage 不能为空' },
        { status: 400 },
      );
    }
  }

  // 构建模型；缺 key / 加载失败时返回 JSON 错误
  let model;
  try {
    model = await buildGeminiModel();
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return NextResponse.json(
        { error: err.message, code: 'NO_API_KEY' },
        { status: 412 },
      );
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API ERROR] buildGeminiModel 失败：', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const abort = new AbortController();
      let firstChunkReceived = false;

      // 首字超时：还没拿到第一个 chunk 之前生效，触发后中断请求
      const firstChunkTimer = setTimeout(() => {
        if (!firstChunkReceived) {
          abort.abort(
            new Error(
              `Gemini 首字响应超时（${FIRST_CHUNK_TIMEOUT_MS / 1000} 秒未返回任何内容）。可能是模型超载或网络拥塞，可稍后重试，或在设置页改用 gemini-2.5-pro。`,
            ),
          );
        }
      }, FIRST_CHUNK_TIMEOUT_MS);

      // 总超时：兜底，防止个别情况下流也卡住吐字
      const totalTimer = setTimeout(() => {
        abort.abort(
          new Error(`Gemini 总响应超时（${TOTAL_TIMEOUT_MS / 1000} 秒）`),
        );
      }, TOTAL_TIMEOUT_MS);

      const writeLine = (obj: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
        } catch {
          // controller 可能已关闭，忽略即可
        }
      };

      try {
        const chat = model.startChat({ history: chatHistory });
        const startedAt = Date.now();
        const sdkResult = await chat.sendMessageStream(userMessage, {
          // SDK 同时支持 timeout 和 signal；signal 在长流中也能强制中断
          timeout: TOTAL_TIMEOUT_MS,
          signal: abort.signal,
        });

        let totalChars = 0;
        let firstChunkAt = 0;
        for await (const chunk of sdkResult.stream) {
          if (abort.signal.aborted) break;
          const text = chunk.text();
          if (text) {
            if (!firstChunkReceived) {
              firstChunkReceived = true;
              firstChunkAt = Date.now();
              clearTimeout(firstChunkTimer);
            }
            totalChars += text.length;
            writeLine({ type: 'chunk', text });
          }
        }
        writeLine({ type: 'done' });
        console.log(
          `[chat] 流式完成：首字 ${firstChunkAt ? firstChunkAt - startedAt : '-'}ms，总用时 ${Date.now() - startedAt}ms，输出 ${totalChars} 字`,
        );
      } catch (err) {
        // 如果是我们主动 abort，使用 abort.signal.reason 给出更友好的提示
        let msg = err instanceof Error ? err.message : '解读失败';
        if (abort.signal.aborted) {
          const reason = abort.signal.reason;
          if (reason instanceof Error) msg = reason.message;
          else if (typeof reason === 'string') msg = reason;
        }
        console.error('[API ERROR] sendMessageStream 失败：', err);
        writeLine({ type: 'error', message: msg });
      } finally {
        clearTimeout(firstChunkTimer);
        clearTimeout(totalTimer);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
