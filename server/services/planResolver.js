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

export function resolvePlanScope({ text, now = new Date() }) {
  const base = new Date(now);

  if (/下周|下星期|下礼拜/.test(text)) {
    const start = startOfWeek(addDaysDate(base, 7));
    return weekResult(start, "next_week");
  }

  if (/本周|这周|这星期|本星期|这礼拜/.test(text)) {
    return weekResult(startOfWeek(base), "this_week");
  }

  const explicit = parseDay(text, base);
  if (explicit) return { plan_kind: "day", scope: explicit.scope, date: explicit.date };

  return { plan_kind: "day", scope: "today", date: formatLocalDate(base) };
}

function parseDay(text, base) {
  if (/后天/.test(text)) return { scope: "day", date: addDays(base, 2) };
  if (/明天|明日/.test(text)) return { scope: "tomorrow", date: addDays(base, 1) };
  if (/今天|今日|今晚/.test(text)) return { scope: "today", date: formatLocalDate(base) };

  const fullDate = text.match(/(20\d{2})\s*(?:年|[.\/-])\s*(\d{1,2})\s*(?:月|[.\/-])\s*(\d{1,2})\s*[日号]?/);
  if (fullDate) {
    return { scope: "day", date: formatLocalDate(new Date(Number(fullDate[1]), Number(fullDate[2]) - 1, Number(fullDate[3]))) };
  }

  const monthDay = text.match(/(?:^|[^\d])(\d{1,2})\s*(?:月|[.\/])\s*(\d{1,2})\s*[日号]?/);
  if (monthDay) {
    return { scope: "day", date: formatLocalDate(new Date(base.getFullYear(), Number(monthDay[1]) - 1, Number(monthDay[2]))) };
  }

  const weekday = text.match(/(?:周|星期|礼拜)([一二三四五六日天1-7])/);
  if (weekday) {
    return { scope: "day", date: resolveUpcomingWeekday(base, WEEKDAY_MAP[weekday[1]]) };
  }

  return null;
}

function weekResult(start, scope) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    plan_kind: "week",
    scope,
    week_start: formatLocalDate(start),
    week_end: formatLocalDate(end)
  };
}

function startOfWeek(date) {
  const start = new Date(date);
  const day = start.getDay() === 0 ? 7 : start.getDay();
  start.setDate(start.getDate() - day + 1);
  return start;
}

function resolveUpcomingWeekday(base, targetDay) {
  const date = new Date(base);
  const currentDay = date.getDay() === 0 ? 7 : date.getDay();
  let diff = targetDay - currentDay;
  if (diff < 0) diff += 7;
  date.setDate(date.getDate() + diff);
  return formatLocalDate(date);
}

function addDays(base, days) {
  return formatLocalDate(addDaysDate(base, days));
}

function addDaysDate(base, days) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
