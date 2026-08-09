const PLAN_WORDS = ["计划", "打算", "准备", "要", "需要", "安排", "todo", "待办", "明天", "今天我要"];
const DONE_WORDS = ["完成", "做了", "写完", "跑了", "吃了", "去了", "用了", "整理", "清理", "搭建", "debug", "记录", "总结"];
const CHAT_WORDS = ["焦虑", "难过", "烦", "累", "崩溃", "压力", "迷茫", "不开心", "害怕", "孤独", "低落"];

const CATEGORY_RULES = {
  research: ["论文", "实验", "科研", "阅读", "数据", "模型", "Introduction", "intro"],
  work: ["面试", "简历", "投递", "工作", "会议", "项目", "求职"],
  growth: ["学习", "练习", "复盘", "课程", "技能", "代码", "Codex", "Coze", "AI Studio", "机器人", "搭建", "debug", "调整"],
  happiness: ["开心", "幸福", "散步", "朋友", "好吃", "喜欢", "顺利", "绿豆汤", "酸辣粉", "牛肉饼", "里脊饼"],
  emotion: ["焦虑", "累", "难过", "平静", "开心", "压力", "低落", "兴奋", "干扰", "好快", "收费"]
};

export function detectIntent(text) {
  const hasFuture = PLAN_WORDS.some((word) => text.includes(word));
  const hasDone = DONE_WORDS.some((word) => text.includes(word));
  const hasChat = CHAT_WORDS.some((word) => text.includes(word));

  if (hasChat && !hasDone && !hasFuture) return "CHAT";
  if (hasDone || text.length > 80) return "SUMMARY";
  if (hasFuture) return "PLAN";
  return "CHAT";
}

export function buildPlan(text) {
  const tasks = splitTasks(text);
  const mainTask = chooseMainTask(tasks);

  return {
    type: "PLAN",
    main_goal: `高质量完成：${mainTask}`,
    tasks: tasks.map((task, index) => ({
      name: task,
      priority: task === mainTask ? "P0" : index <= 1 ? "P1" : "P2",
      reason:
        task === mainTask
          ? "这是今天最能推动长期目标的主线任务，需要优先保证深度和完成质量。"
          : "适合围绕主线任务安排，避免把一天切得太碎。",
      next_action: makeNextAction(task),
      estimated_time: task === mainTask ? "90-150分钟" : "30-60分钟"
    })),
    schedule: makeSchedule(mainTask, tasks),
    raw_query: text
  };
}

export function buildSummary(text, now, date = resolveEntryDate(now)) {
  const clauses = splitClauses(text);
  const classified = classifyClauses(clauses);
  const tomorrowHints = clauses.filter((clause) => /明天|明日|后天/.test(clause));

  return {
    type: "SUMMARY",
    date,
    raw_query: text,
    research: joinClauses(classified.research),
    work: joinClauses(classified.work),
    growth: joinClauses(classified.growth),
    happiness: joinClauses(classified.happiness),
    emotion: joinClauses(classified.emotion),
    others: joinClauses(classified.others),
    summary: buildSummaryText(classified),
    tomorrow_plan:
      tomorrowHints.length > 0
        ? `明天优先处理：${joinClauses(tomorrowHints)}`
        : "明天建议先选一个最重要的小目标，用 60-90 分钟推进到可见结果。"
  };
}

export function buildChatReply(text) {
  const emotion = CHAT_WORDS.find((word) => text.includes(word)) || "这种状态";
  return {
    type: "CHAT",
    reply: `听起来你现在有点${emotion}，这份感受可以先被认真看见。先不要急着把所有问题都解决，接下来 10 分钟只做一件事：写下“我最担心的具体是什么”和“我现在能控制的一步是什么”。`
  };
}

function splitTasks(text) {
  const cleaned = text
    .replace(/今天|明天|我要|我想|计划|打算|准备|需要|安排/g, "")
    .replace(/[。.!！?？]/g, "，");
  const parts = cleaned
    .split(/[，,、；;\n]|和|以及|然后/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.slice(0, 6) : [text];
}

function splitClauses(text) {
  return text
    .replace(/\r/g, "")
    .split(/[。；;\n]|(?<!\d)，|(?<!\d),/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function classifyClauses(clauses) {
  const result = { research: [], work: [], growth: [], happiness: [], emotion: [], others: [] };

  for (const clause of clauses) {
    const matched = [];
    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
      if (keywords.some((word) => clause.includes(word))) matched.push(category);
    }
    if (matched.length === 0) result.others.push(clause);
    for (const category of matched) result[category].push(clause);
  }

  return result;
}

function chooseMainTask(tasks) {
  const priorityHints = ["论文", "实验", "面试", "项目", "考试", "交付", "申请"];
  return tasks.find((task) => priorityHints.some((hint) => task.includes(hint))) || tasks[0];
}

function makeNextAction(task) {
  if (task.includes("论文") || task.toLowerCase().includes("intro")) return "先列出本段要回答的3个问题，再改第一版。";
  if (task.includes("实验")) return "先确认实验目标、参数和成功标准，再启动最小实验。";
  if (task.includes("面试")) return "先准备一个2分钟自我介绍和3个高频问题答案。";
  return "先定义完成标准，再做最小可推进的一步。";
}

function makeSchedule(mainTask, tasks) {
  const rest = tasks.filter((task) => task !== mainTask);
  return [
    `黄金专注段：${mainTask}`,
    rest[0] ? `短任务段：${rest[0]}` : "短任务段：整理今天的任务状态",
    rest[1] ? `收尾段：${rest[1]}` : "收尾段：记录结果和明日第一步"
  ];
}

function resolveEntryDate(now) {
  const date = new Date(now);
  if (date.getHours() >= 0 && date.getHours() < 3) date.setDate(date.getDate() - 1);
  return formatLocalDate(date);
}

function joinClauses(items) {
  return [...new Set(items)].join("；");
}

function buildSummaryText(classified) {
  const parts = [];
  if (classified.research.length) parts.push("科研学习有实质推进");
  if (classified.growth.length) parts.push("工具和能力建设有进展");
  if (classified.happiness.length) parts.push("生活里也有具体的愉快体验");
  if (classified.emotion.length) parts.push("你记录到了自己的情绪变化");
  return parts.length ? `${parts.join("，")}。` : "今天的记录已整理，当前版本只基于你提供的信息总结。";
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
