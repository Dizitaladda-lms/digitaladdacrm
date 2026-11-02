export const FESTIVAL_PREF_KEY = "dizitaladda_festival_pref";
export const FESTIVAL_TIME_ZONE = "Asia/Kolkata";

export const DIWALI_DATE_RANGE = Object.freeze({
  start: "2026-11-01",
  end: "2026-11-10",
});

export const DIWALI_DATE = "2026-11-08";

const requestedMode = import.meta.env.VITE_FESTIVAL_MODE || "auto";
export const FESTIVAL_MODE = ["diwali", "off", "auto"].includes(requestedMode)
  ? requestedMode
  : "auto";

const getDateInFestivalTimeZone = (date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: FESTIVAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const isFestivalActive = (now = new Date()) => {
  const currentDate = getDateInFestivalTimeZone(now);
  return currentDate >= DIWALI_DATE_RANGE.start && currentDate <= DIWALI_DATE_RANGE.end;
};

export const getDiwaliStartTime = () => new Date(`${DIWALI_DATE}T00:00:00+05:30`);
