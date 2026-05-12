import { promises as fs } from 'node:fs';
import path from 'node:path';

const SKILL_DIR = path.join(
  process.cwd(),
  '..',
  '..',
  '.claude',
  'skills',
  '大六壬判断思路',
);

let cached: string | null = null;
let cachedAt = 0;
const TTL_MS = 5 * 60 * 1000;

async function safeRead(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw err;
  }
}

async function listAvailableReferences(): Promise<string[]> {
  const refDir = path.join(SKILL_DIR, 'references');
  try {
    const entries = await fs.readdir(refDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
      .map((e) => e.name)
      .sort();
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return [];
    throw err;
  }
}

// 从 SKILL.md 中解析"已纳入资料"小节声明的引用文件名
// 仅加载用户在 SKILL 中明确列出的资料，避免把 references/ 里的全部内容塞给模型
function parseDeclaredReferences(skillText: string): Set<string> {
  const declared = new Set<string>();
  const marker = '**已纳入资料**';
  const start = skillText.indexOf(marker);
  if (start < 0) return declared;

  const tail = skillText.slice(start + marker.length);
  let endIdx = tail.length;
  const stopRegexes = [
    /\n\*\*[^\n*]+\*\*/, // 下一个 **xxx** 标题
    /\n##\s/, // 下一个二级标题
    /\n---\s*\n/, // 分隔线
  ];
  for (const re of stopRegexes) {
    const idx = tail.search(re);
    if (idx > 0 && idx < endIdx) endIdx = idx;
  }
  const block = tail.slice(0, endIdx);

  const lineRe = /^\s*[-*]\s+(.+?)\s*$/gm;
  const filenameRe = /([^\s/\[\]()`"]+\.md)/i;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(block))) {
    const item = m[1];
    const fm = filenameRe.exec(item);
    if (fm) declared.add(path.basename(fm[1]));
  }
  return declared;
}

export async function loadSkillKnowledge(force = false): Promise<string> {
  const now = Date.now();
  if (!force && cached && now - cachedAt < TTL_MS) return cached;

  const skillPath = path.join(SKILL_DIR, 'SKILL.md');
  const skillContent = await safeRead(skillPath);
  if (!skillContent) {
    throw new Error(`未能读取 SKILL 文件，路径：${skillPath}`);
  }

  const declared = parseDeclaredReferences(skillContent);
  const available = await listAvailableReferences();

  const refContents: string[] = [];
  const loaded: string[] = [];
  const skipped: string[] = [];

  for (const name of available) {
    if (declared.size > 0 && !declared.has(name)) {
      skipped.push(name);
      continue;
    }
    const filePath = path.join(SKILL_DIR, 'references', name);
    const content = await safeRead(filePath);
    if (!content) continue;
    refContents.push(
      `\n\n=========== 附加资料：${name} ===========\n\n${content}`,
    );
    loaded.push(name);
  }

  // 声明了但目录里没找到的文件
  const missing: string[] = [];
  for (const name of declared) {
    if (!available.includes(name)) missing.push(name);
  }

  cached = skillContent + refContents.join('');
  cachedAt = now;

  console.log(
    `[skill-loader] 已加载 SKILL.md（${skillContent.length} 字）+ ${loaded.length} 份附加资料`,
    {
      loaded,
      skipped: skipped.length ? skipped : undefined,
      missing: missing.length ? missing : undefined,
      totalChars: cached.length,
    },
  );

  return cached;
}

export async function getSystemInstruction(): Promise<string> {
  const knowledge = await loadSkillKnowledge();
  return [
    '你是一位精研大六壬的解读师。以下是你必须严格遵循的判断思路与知识参考，包含 SKILL 主文件与若干附加资料。',
    '请在每次回应前完整阅读这些资料，按 SKILL 文件中"AI 执行规则（必读）"的步骤分阶段输出，不允许跳步、不允许重排顺序。',
    '回答始终使用简体中文，保留原文术语（先锋门 / 值事门 / 发端门 / 移易门 / 归计门 / 变体门 / 类神 / 旺相休囚 等），切勿改写或意译。',
    '\n========== SKILL 与附加资料开始 ==========\n',
    knowledge,
    '\n========== SKILL 与附加资料结束 ==========\n',
  ].join('\n');
}
