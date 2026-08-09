export async function classifyIntent({ text, now }) {
  return callLLM({ text, intent: "INTENT", now });
}

export async function callLLM({ text, intent, now }) {
  const provider = (process.env.LLM_PROVIDER || "mock").toLowerCase();
  if (provider === "mock") return null;

  const messages = [
    { role: "system", content: buildSystemPrompt(intent, now) },
    { role: "user", content: text }
  ];

  try {
    if (provider === "openai") {
      return callOpenAICompatible({
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        messages
      });
    }

    if (provider === "deepseek") {
      return callOpenAICompatible({
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
        messages
      });
    }

    if (provider === "gemini") {
      return callGemini({
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
        systemPrompt: messages[0].content,
        text
      });
    }
  } catch (error) {
    console.error(`LLM provider failed: ${error.message}`);
  }

  return null;
}

function buildSystemPrompt(intent, now) {
  if (intent === "INTENT") {
    return [
      "你是 AI&Dairy 的意图识别器。",
      `当前时间：${now.toISOString()}`,
      "只输出 JSON，不要 Markdown。",
      "判断用户输入最符合哪一种：PLAN / SUMMARY / CHAT。",
      "PLAN：用户表达未来想做、打算做、需要安排、希望拆解的事情，即使措辞是‘我想做...’也算计划。",
      "SUMMARY：用户主要在记录已经发生的事情、复盘今天/昨天/某天。",
      "CHAT：用户主要表达情绪、困惑、需要陪伴或讨论。",
      "如果用户同时表达情绪和待办，但核心是在安排未来行动，应判为 PLAN。",
      "输出结构：{\"intent\":\"PLAN|SUMMARY|CHAT\",\"confidence\":0.0,\"reason\":\"一句话说明\"}"
    ].join("\n");
  }

  return [
    "你是 AI&Dairy 的个人成长管理助手。",
    `当前意图：${intent}`,
    `当前时间：${now.toISOString()}`,
    "请只基于用户输入，不要虚构。",
    "PLAN：只输出 JSON，结构为 {\"type\":\"PLAN\",\"main_goal\":\"\",\"success_criteria\":[\"\"],\"tasks\":[{\"name\":\"\",\"priority\":\"P0/P1/P2\",\"reason\":\"\",\"next_action\":\"\",\"estimated_time\":\"\",\"scheduled_start\":\"\",\"scheduled_end\":\"\"}],\"schedule\":[{\"time\":\"\",\"task\":\"\"}],\"priority_rationale\":{\"stage_goal\":\"\",\"first_action\":\"\",\"low_cost_start\":\"\",\"defer\":\"\"},\"explanation\":\"\"}。必须识别一个主线任务，不要平均罗列。",
    "SUMMARY：只输出 JSON，结构为 {\"type\":\"SUMMARY\",\"date\":\"\",\"raw_query\":\"\",\"research\":\"\",\"work\":\"\",\"growth\":\"\",\"happiness\":\"\",\"emotion\":\"\",\"others\":\"\",\"summary\":\"\",\"tomorrow_plan\":\"\"}。分类字段只放相关内容，未提及则为空字符串。",
    "CHAT：输出 JSON，结构为 {\"type\":\"CHAT\",\"reply\":\"\"}。像温暖但理性的朋友：先理解情绪，不鸡汤，给一个具体下一步，不否定感受，不编造经历。",
    "输出必须是可解析 JSON，不要 Markdown。"
  ].join("\n");
}

async function callOpenAICompatible({ apiKey, model, baseUrl, messages }) {
  if (!apiKey) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

  const data = await response.json();
  return parseJsonContent(data.choices?.[0]?.message?.content);
}

async function callGemini({ apiKey, model, systemPrompt, text }) {
  if (!apiKey) return null;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text }] }]
      })
    }
  );

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

  const data = await response.json();
  return parseJsonContent(data.candidates?.[0]?.content?.parts?.[0]?.text);
}

function parseJsonContent(content) {
  if (!content) return null;
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  return JSON.parse(cleaned);
}
