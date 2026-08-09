const WEEKDAY_MAP = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 7,
  天: 7,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7
};

export function resolveSummaryDate({ text, mode = "AUTO", now = new Date() }) {
  const explicit = parseExplicitDate(text, now);
  if (explicit) return { date: explicit, needsClarification: false };

  if (isAmbiguousBackfill(text)) return { date: "", needsClarification: true };

  const date = new Date(now);
  if (date.getHours() >= 0 && date.getHours() < 3) date.setDate(date.getDate() - 1);

  if (mode === "SUMMARY" || /今天|今日|今晚|晚上|早上|上午|下午|中午/.test(text)) {
    return { date: formatLocalDate(date), needsClarification: false };
  }

  return { date: "", needsClarification: true };
}

function parseExplicitDate(text, now) {
  const base = new Date(now);

  const fullDate = text.match(/(20\d{2})\s*(?:年|[.\/-])\s*(\d{1,2})\s*(?:月|[.\/-])\s*(\d{1,2})\s*[日号]?/);
  if (fullDate) return formatLocalDate(new Date(Number(fullDate[1]), Number(fullDate[2]) - 1, Number(fullDate[3])));

  const monthDay = text.match(/(?:^|[^\d])(\d{1,2})\s*(?:月|[.\/])\s*(\d{1,2})\s*[日号]?/);
  if (monthDay) return formatLocalDate(new Date(base.getFullYear(), Number(monthDay[1]) - 1, Number(monthDay[2])));

  const lastWeekday = text.match(/(?:上周|上星期|上礼拜)([一二三四五六日天1-7])/);
  if (lastWeekday) return resolveWeekday(base, WEEKDAY_MAP[lastWeekday[1]], "last");

  const thisWeekday = text.match(/(?:这周|本周|这星期|本星期|这礼拜)([一二三四五六日天1-7])/);
  if (thisWeekday) return resolveWeekday(base, WEEKDAY_MAP[thisWeekday[1]], "this");

  const bareWeekday = text.match(/(?:周|星期|礼拜)([一二三四五六日天1-7])/);
  if (bareWeekday) return resolveWeekday(base, WEEKDAY_MAP[bareWeekday[1]], "recentPast");

  if (/前天|前日/.test(text)) return addDays(base, -2);
  if (/昨天|昨日|昨晚/.test(text)) return addDays(base, -1);
  if (/今天|今日|今晚/.test(text)) return formatLocalDate(base);

  return "";
}

function isAmbiguousBackfill(text) {
  return /补一下|补记|补录|那天|前几天|上次|某天|之前/.test(text) && !/今天|昨天|前天|周|星期|礼拜|\d{1,2}\s*(?:月|[.\/])/.test(text);
}

function resolveWeekday(base, targetDay, mode) {
  const date = new Date(base);
  const currentDay = toMondayWeekday(date);
  let diff = targetDay - currentDay;

  if (mode === "last") diff -= 7;
  if (mode === "recentPast" && diff > 0) diff -= 7;

  date.setDate(date.getDate() + diff);
  return formatLocalDate(date);
}

function toMondayWeekday(date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function addDays(base, days) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
