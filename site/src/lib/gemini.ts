import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { ensureEnvLoaded, getGeminiModel } from './settings';
import { getSystemInstruction } from './skill-loader';

export class MissingApiKeyError extends Error {
  constructor() {
    super('GEMINI_API_KEY 未配置，请前往 /settings 页面设置');
    this.name = 'MissingApiKeyError';
  }
}

let proxyConfigured = false;

function configureProxyFromEnv() {
  if (proxyConfigured) return;
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy;
  if (proxyUrl) {
    try {
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
      console.log('[gemini] 已启用代理：', proxyUrl);
    } catch (err) {
      console.warn('[gemini] 代理初始化失败：', err);
    }
  }
  proxyConfigured = true;
}

export async function buildGeminiModel(): Promise<GenerativeModel> {
  await ensureEnvLoaded();
  configureProxyFromEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();

  const modelName = await getGeminiModel();
  const systemInstruction = await getSystemInstruction();

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature: 0.6,
      topP: 0.9,
    },
  });
}
