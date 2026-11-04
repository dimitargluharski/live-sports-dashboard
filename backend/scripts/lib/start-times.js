// Converts the scraped "4 November" + "14:00" labels into one absolute ISO UTC timestamp (`startsAt`),
// so consumers never have to guess the year or the source time zone.

// The source site publishes times in UTC+1.
const SOURCE_UTC_OFFSET_HOURS = 1;
const HOUR_MS = 60 * 60 * 1000;
const HALF_YEAR_MS = 183 * 24 * HOUR_MS;
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function parseDayAndMonth(dateLabel) {
  const text = String(dateLabel || "").trim().toLowerCase();
  const dayFirst = text.match(/^(\d{1,2})\s+([a-z]+)$/);
  const monthFirst = text.match(/^([a-z]+)\s+(\d{1,2})$/);
  const [day, monthName] = dayFirst ? [dayFirst[1], dayFirst[2]] : monthFirst ? [monthFirst[2], monthFirst[1]] : [];
  const month = MONTHS.findIndex((name) => name === monthName || (monthName?.length >= 3 && name.startsWith(monthName)));
  return day && month >= 0 ? { day: Number(day), month } : null;
}

function computeStartsAt(dateLabel, timeLabel, referenceIso) {
  const date = parseDayAndMonth(dateLabel);
  const time = String(timeLabel || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!date || !time) return null;

  const reference = new Date(referenceIso);
  const referenceMs = Number.isNaN(reference.getTime()) ? Date.now() : reference.getTime();
  const referenceYear = new Date(referenceMs).getUTCFullYear();
  const build = (year) => Date.UTC(year, date.month, date.day, Number(time[1]) - SOURCE_UTC_OFFSET_HOURS, Number(time[2]));

  let startMs = build(referenceYear);
  // Labels carry no year: pick the year that lands closest to the scrape time (handles Dec -> Jan).
  if (startMs - referenceMs > HALF_YEAR_MS) startMs = build(referenceYear - 1);
  else if (referenceMs - startMs > HALF_YEAR_MS) startMs = build(referenceYear + 1);

  // Reject impossible dates such as "31 February" that Date.UTC silently rolls over.
  const sourceLocal = new Date(startMs + SOURCE_UTC_OFFSET_HOURS * HOUR_MS);
  if (sourceLocal.getUTCMonth() !== date.month || sourceLocal.getUTCDate() !== date.day) return null;
  return new Date(startMs).toISOString();
}

function stampStartsAt(matches, referenceIso) {
  return matches.map((match) => {
    const startsAt = computeStartsAt(match.dateLabel, match.timeLabel, referenceIso);
    return startsAt ? { ...match, startsAt } : match;
  });
}

module.exports = { computeStartsAt, stampStartsAt };
