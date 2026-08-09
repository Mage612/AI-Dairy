import { analyzeInput, mergeSummaryEntries } from "./services/analyzer.js";
import { listDailyRecords, upsertDailyRecord, isSupabaseConfigured } from "./services/supabaseStore.js";

export function getHealth() {
  const provider = (process.env.LLM_PROVIDER || "mock").toLowerCase();
  return {
    ok: true,
    service: "AI&Diary API",
    llm_provider: provider,
    llm_enabled: hasProviderKey(provider),
    supabase_enabled: isSupabaseConfigured()
  };
}

export async function handleChat(body = {}) {
  const text = String(body.text || "").trim();
  let result = await analyzeInput({ text, mode: body.mode || "AUTO", now: new Date() });

  if (result.type === "SUMMARY" && Array.isArray(body.existing_entries)) {
    const entries = [
      ...body.existing_entries,
      { text, created_at: new Date().toISOString() }
    ].filter((entry) => entry.text);
    result = await mergeSummaryEntries({ date: result.date, entries, now: new Date() });
  }

  return result;
}

export async function handleDailyRecords({ method = "GET", body = {} } = {}) {
  if (method === "GET") return listDailyRecords();
  if (method === "POST") return upsertDailyRecord(body.record || body);
  const error = new Error("Method not allowed");
  error.statusCode = 405;
  throw error;
}

function hasProviderKey(provider) {
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  if (provider === "deepseek") return Boolean(process.env.DEEPSEEK_API_KEY);
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  return false;
}
