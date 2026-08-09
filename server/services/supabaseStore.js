const TABLE = "daily_records";

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}

export async function listDailyRecords(userId = getUserId()) {
  ensureConfigured();
  const url = new URL(`${getSupabaseUrl()}/rest/v1/${TABLE}`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("order", "date.desc");
  const rows = await supabaseFetch(url, { method: "GET" });
  return Object.fromEntries((rows || []).map((row) => [row.date, fromRow(row)]));
}

export async function upsertDailyRecord(record, userId = getUserId()) {
  ensureConfigured();
  const payload = toRow(record, userId);
  const url = new URL(`${getSupabaseUrl()}/rest/v1/${TABLE}`);
  url.searchParams.set("on_conflict", "user_id,date");
  const rows = await supabaseFetch(url, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload)
  });
  return fromRow(rows?.[0] || payload);
}

async function supabaseFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: getSupabaseKey(),
      Authorization: `Bearer ${getSupabaseKey()}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Supabase ${response.status}: ${detail}`);
    error.statusCode = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

function toRow(record, userId) {
  const now = new Date().toISOString();
  const rawEntries = Array.isArray(record.raw_entries) ? record.raw_entries : [];
  return {
    user_id: userId,
    date: record.date,
    weekday: record.weekday || "",
    raw_entries: rawEntries,
    raw_query: record.raw_query || rawEntries.map((entry) => entry.text).join("\n") || "",
    research: record.research || "",
    work: record.work || "",
    growth: record.growth || "",
    happiness: record.happiness || "",
    emotion: record.emotion || "",
    others: record.others || "",
    summary: record.summary || "",
    tomorrow_plan: record.tomorrow_plan || "",
    entry_count: record.entry_count || rawEntries.length || 1,
    sync_status: "synced",
    sync_provider: "supabase",
    feishu_record_id: record.sync?.record_id || "",
    synced_at: record.sync?.synced_at || null,
    created_at: record.created_at || now,
    updated_at: record.updated_at || now
  };
}

function fromRow(row) {
  return {
    date: row.date,
    weekday: row.weekday || "",
    raw_entries: Array.isArray(row.raw_entries) ? row.raw_entries : [],
    raw_query: row.raw_query || "",
    research: row.research || "",
    work: row.work || "",
    growth: row.growth || "",
    happiness: row.happiness || "",
    emotion: row.emotion || "",
    others: row.others || "",
    summary: row.summary || "",
    tomorrow_plan: row.tomorrow_plan || "",
    entry_count: row.entry_count || 1,
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
    sync: {
      provider: row.sync_provider || "feishu",
      status: row.sync_status || "local",
      record_id: row.feishu_record_id || "",
      synced_at: row.synced_at || ""
    }
  };
}

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || "").replace(/\/$/, "");
}

function getSupabaseKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
}

function getUserId() {
  return process.env.APP_USER_ID || "single-user";
}

function ensureConfigured() {
  if (!isSupabaseConfigured()) {
    const error = new Error("Supabase is not configured");
    error.statusCode = 503;
    throw error;
  }
}
