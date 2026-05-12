# 大六壬解盘助手

输入课象，AI 按六步判断法给出结构化解读的辅助工具。

AI 在解读前会先输出待确认课盘（四柱、四课、三传、十二贵神），经用户确认后再逐步完成六步解读，最后单独给出应期判断。

## 功能

- 自动排天盘、十二贵神，输出四课三传
- 按六步顺序逐步解读，不跳步、不乱序
- 解读前输出待确认课盘，支持用户纠错
- 应期单独成段，按需输出
- 内置 Claude Code Skill，可在本地 Claude Code 中直接调用

## 技术栈

- Next.js 15 + TypeScript
- Tailwind CSS
- Google Gemini API（gemini-2.5-pro）

## 快速开始

```bash
cd site
npm install
cp .env.local.example .env.local
```

编辑 `.env.local` 填入 Gemini API Key 和代理配置，然后启动：

```bash
npm run dev
```

打开 http://localhost:3100 开始使用。

## 环境变量

```
GEMINI_API_KEY=          # Google AI Studio 获取（必填）
GEMINI_MODEL=gemini-2.5-pro
HTTPS_PROXY=             # 中国大陆访问 Google 必填，如 http://127.0.0.1:7890
```

详细说明见 `site/.env.local.example`。

## 项目结构

```
site/
  src/app/          # Next.js 路由与 API
  src/lib/          # Gemini 调用、历史记录、Skill 加载
skill/
  SKILL.md          # Claude Code Skill，本地 Claude Code 可直接调用
```

## Claude Code Skill 使用方法

将 `skill/` 目录复制到你的项目 `.claude/skills/大六壬判断思路/`，重启 Claude Code 后即可在对话中调用六步判断法解读课象。
