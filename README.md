# AI&Dairy V0.1

个人成长管理助手 MVP：自然语言输入 -> 意图判断 -> 结构化结果 -> 网页卡片展示。

## 当前状态

- 默认模式：`LLM_PROVIDER=mock`，使用本地规则兜底，不调用任何外部模型。
- 推荐模式：配置 OpenAI / Gemini / DeepSeek 的 API key 后，后端会通过 `/api/chat` 调真实 LLM。
- 兜底策略：真实 LLM 调用失败时自动回退本地规则，保证页面仍然可用。

## 功能范围

- PLAN：识别未来任务，抓当天主线任务，输出任务优先级、原因、下一步和时间安排。
- SUMMARY：整理日总结，保留原始记录，不虚构；凌晨 00:00-03:00 自动归入昨天。
- CHAT：朋友模式，先理解情绪，再给一个具体下一步。
- 数据：V0.1 使用浏览器 localStorage 保存聊天记录。

## 技术方案

- Frontend：React + Vite，简洁聊天界面，三种快捷模式按钮。
- Backend：Node.js 原生 HTTP 服务，接口为 `POST /api/chat`。
- LLM 扩展：`server/llm/provider.js` 支持 OpenAI / Gemini / DeepSeek。
- 未来扩展：飞书多维表格同步、长期 Memory、语音输入、Chrome 插件。

## 运行

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:5173
```

API 健康检查：

```text
http://localhost:8787/api/health
```

## 接入真实 LLM

方式一：复制 `.env.example` 为 `.env`，填写其中一个 provider 的 key，然后运行 `npm run dev`。

方式二：直接在 PowerShell 里设置环境变量。

PowerShell 示例：

```powershell
$env:LLM_PROVIDER="openai"
$env:OPENAI_API_KEY="你的 key"
$env:OPENAI_MODEL="gpt-4o-mini"
npm run dev
```

DeepSeek 示例：

```powershell
$env:LLM_PROVIDER="deepseek"
$env:DEEPSEEK_API_KEY="你的 key"
$env:DEEPSEEK_MODEL="deepseek-chat"
npm run dev
```

Gemini 示例：

```powershell
$env:LLM_PROVIDER="gemini"
$env:GEMINI_API_KEY="你的 key"
$env:GEMINI_MODEL="gemini-1.5-flash"
npm run dev
```
