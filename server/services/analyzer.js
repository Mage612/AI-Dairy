import { callLLM, classifyIntent } from "../llm/provider.js";
import { buildChatReply, buildPlan, buildSummary, detectIntent } from "./rules.js";
import { resolveSummaryDate } from "./dateResolver.js";
import { resolvePlanScope } from "./planResolver.js";

export async function analyzeInput({ text, mode = "AUTO", now = new Date() }) {
  if (!text) {
    return {
      type: "CHAT",
      reply: "我在。先写一句最真实的状态就好：你现在最想处理的是什么？"
    };
  }

  const forcedMode = ["PLAN", "SUMMARY", "CHAT"].includes(mode) ? mode : null;
  const intent = forcedMode || await resolveIntent({ text, now });

  if (intent === "SUMMARY") {
    const dateResult = resolveSummaryDate({ text, mode, now });
    if (dateResult.needsClarification) {
      return {
        type: "CLARIFY_DATE",
        reply: "这条总结想归到哪一天？可以回复“今天”“昨天”“8月7号”或“上周五”。",
        pending_summary: { raw_query: text, created_at: now.toISOString() }
      };
    }
    return analyzeSummary({ text, now, date: dateResult.date });
  }

  if (intent === "PLAN") {
    return analyzePlan({ text, now });
  }

  const llmResult = await callLLM({ text, intent, now });
  if (llmResult) return normalizeResult(llmResult, { intent, text, now });
  return buildChatReply(text);
}

export async function mergeSummaryEntries({ date, entries, now = new Date() }) {
  const rawText = entries.map((entry, index) => `${index + 1}. ${entry.text}`).join("\n");
  const prompt = [
    `请把以下同一天 ${date} 的多次原始记录合并成一条每日总结。`,
    "必须保留事实，不要虚构。分类字段只填写相关内容。",
    rawText
  ].join("\n\n");

  const llmResult = await callLLM({ text: prompt, intent: "SUMMARY", now });
  const summary = llmResult ? normalizeResult(llmResult, { intent: "SUMMARY", text: rawText, now, date }) : buildSummary(rawText, now, date);
  return { ...summary, date, raw_query: entries.map((entry) => entry.text).join("\n") };
}

async function resolveIntent({ text, now }) {
  const result = await classifyIntent({ text, now });
  const intent = result?.intent;
  const confidence = Number(result?.confidence || 0);
  if (["PLAN", "SUMMARY", "CHAT"].includes(intent) && confidence >= 0.55) return intent;
  return detectIntent(text);
}

async function analyzeSummary({ text, now, date }) {
  const llmResult = await callLLM({ text, intent: "SUMMARY", now });
  if (llmResult) return normalizeResult(llmResult, { intent: "SUMMARY", text, now, date });
  return buildSummary(text, now, date);
}

async function analyzePlan({ text, now }) {
  const planScope = resolvePlanScope({ text, now });
  const prompt = [
    "请把用户的计划输入整理成可执行行动计划。",
    "必须把想做转成要做，区分必须做、可推进、可暂缓。",
    "必须识别一个主线目标，不要平均罗列所有任务。",
    "priority_rationale 必须具体说明：当前阶段最重要目标、最应该先执行的行动、最低成本启动方式、应该暂缓的事项。",
    planScope.plan_kind === "week" ? "这是周计划，请更宏观，任务分配到日期，不强制具体几点。" : "这是日计划，请给出今日核心、完成标准、任务优先级和行程建议。",
    text
  ].join("\n");
  const llmResult = await callLLM({ text: prompt, intent: "PLAN", now });
  const fallback = buildPlan(text);
  return normalizePlan(llmResult || fallback, { text, now, planScope });
}

function normalizeResult(result, { intent, text, now, date }) {
  const normalized = { ...result, type: result.type || intent };

  if (intent === "SUMMARY" || normalized.type === "SUMMARY") {
    return {
      type: "SUMMARY",
      date: date || resolveDefaultEntryDate(now),
      raw_query: text,
      research: normalized.research || "",
      work: normalized.work || "",
      growth: normalized.growth || "",
      happiness: normalized.happiness || "",
      emotion: normalized.emotion || "",
      others: normalized.others || "",
      summary: normalized.summary || "",
      tomorrow_plan: normalized.tomorrow_plan || ""
    };
  }

  if (intent === "PLAN" || normalized.type === "PLAN") {
    return normalizePlan(normalized, { text, now, planScope: resolvePlanScope({ text, now }) });
  }

  return { type: "CHAT", reply: normalized.reply || String(result.reply || result.message || "") };
}

function normalizePlan(result, { text, now, planScope }) {
  const rawTasks = Array.isArray(result.tasks) ? result.tasks : Array.isArray(result.task_pool) ? result.task_pool : [];
  const tasks = rawTasks.map((task, index) => normalizeTask(task, index));
  const mainGoal = result.main_goal || result.core_focus || result.weekly_focus || "先确定一个主线任务";
  const successCriteria = normalizeCriteria(result.success_criteria, tasks);
  const schedule = normalizeSchedule(result.schedule || result.daily_allocation || []);
  const priorityRationale = normalizePriorityRationale(result.priority_rationale, { mainGoal, tasks });

  if (planScope.plan_kind === "week") {
    return {
      type: "PLAN",
      plan_kind: "week",
      scope: planScope.scope,
      week_start: planScope.week_start,
      week_end: planScope.week_end,
      weekly_focus: mainGoal,
      main_goal: mainGoal,
      success_criteria: successCriteria,
      task_pool: tasks,
      tasks,
      daily_allocation: schedule,
      schedule,
      priority_rationale: priorityRationale,
      explanation: result.explanation || buildExplanation(priorityRationale),
      raw_query: text,
      created_at: now.toISOString()
    };
  }

  return {
    type: "PLAN",
    plan_kind: "day",
    scope: planScope.scope,
    date: planScope.date,
    core_focus: mainGoal,
    main_goal: mainGoal,
    success_criteria: successCriteria,
    tasks,
    schedule,
    priority_rationale: priorityRationale,
    explanation: result.explanation || buildExplanation(priorityRationale),
    raw_query: text,
    created_at: now.toISOString()
  };
}

function normalizeTask(task, index) {
  return {
    id: task.id || `task_${Date.now()}_${index}`,
    name: task.name || task.task || `任务 ${index + 1}`,
    priority: ["P0", "P1", "P2"].includes(task.priority) ? task.priority : index === 0 ? "P0" : index <= 2 ? "P1" : "P2",
    reason: task.reason || "",
    next_action: task.next_action || task.next || "先做最小可推进的一步。",
    estimated_time: task.estimated_time || task.time || "30-60分钟",
    scheduled_start: task.scheduled_start || "",
    scheduled_end: task.scheduled_end || "",
    suggested_day: task.suggested_day || task.day || "",
    done: Boolean(task.done)
  };
}

function normalizePriorityRationale(rationale, { mainGoal, tasks }) {
  const p0 = tasks.find((task) => task.priority === "P0") || tasks[0];
  const p2 = tasks.find((task) => task.priority === "P2");
  return {
    stage_goal: rationale?.stage_goal || `当前阶段最重要的是：${mainGoal}`,
    first_action: rationale?.first_action || (p0 ? `最应该先执行：${p0.name}` : "先明确一个最小主线任务。"),
    low_cost_start: rationale?.low_cost_start || (p0 ? `最低成本启动：${p0.next_action}` : "先写下完成标准。"),
    defer: rationale?.defer || (p2 ? `可暂缓：${p2.name}` : "整理类、锦上添花类任务先不抢占主线时间。")
  };
}

function buildExplanation(rationale) {
  return [
    rationale.stage_goal,
    rationale.first_action,
    rationale.low_cost_start,
    rationale.defer
  ].filter(Boolean).join("\n");
}

function normalizeCriteria(criteria, tasks) {
  if (Array.isArray(criteria) && criteria.length > 0) return criteria.map(String).slice(0, 4);
  if (typeof criteria === "string" && criteria.trim()) return [criteria.trim()];
  return tasks.slice(0, 2).map((task) => `完成：${task.name}`);
}

function normalizeSchedule(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === "string") return { time: "", task: item };
    return {
      time: item.time || item.date || item.day || "",
      task: item.task || item.name || item.content || ""
    };
  }).filter((item) => item.task || item.time);
}

function resolveDefaultEntryDate(now) {
  const date = new Date(now);
  if (date.getHours() >= 0 && date.getHours() < 3) date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

