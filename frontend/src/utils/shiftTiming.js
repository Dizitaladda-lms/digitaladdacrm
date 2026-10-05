/**
 * Shift Timing Utility for Dizital Adda CRM
 * 
 * Rules:
 * - Mon to Fri: 10:00 AM - 6:00 PM (Start: 10:00 AM)
 * - Saturday:    9:30 AM - 5:30 PM (Start: 9:30 AM)
 * - Sunday:      9:30 AM - 2:00 PM (Start: 9:30 AM)
 */

export const format12hTime = (timeStr) => {
  if (!timeStr) return "";
  const parts = String(timeStr).split(":");
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const minStr = m < 10 ? `0${m}` : m;
  return `${h}:${minStr} ${ampm}`;
};

export const calculateLateArrival = (checkInDateOrStr, shiftConfig = null) => {
  if (!checkInDateOrStr) return null;
  const d = new Date(checkInDateOrStr);
  if (isNaN(d.getTime())) return null;

  const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = istFormatter.formatToParts(d);
  const getPart = (type) => parts.find((p) => p.type === type)?.value;

  const weekday = getPart("weekday"); // "Mon", "Tue", ..., "Sun"
  let hour = parseInt(getPart("hour"), 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(getPart("minute"), 10);
  const checkInMins = hour * 60 + minute;

  let expectedStartHour = 10;
  let expectedStartMinute = 0;
  let expectedEndHour = 18;
  let expectedEndMinute = 0;
  let shiftLabel = "Mon-Fri (10:00 am - 6:00 pm)";

  const isCustom = shiftConfig?.shift_timing_type === "CUSTOM";
  const customTimings = typeof shiftConfig?.custom_shift_timings === "string"
    ? (() => { try { return JSON.parse(shiftConfig.custom_shift_timings); } catch (e) { return null; } })()
    : shiftConfig?.custom_shift_timings;

  if (isCustom) {
    let customStart = shiftConfig?.shift_start_time || "10:00";
    let customEnd = shiftConfig?.shift_end_time || "18:00";

    if (weekday === "Sat" && customTimings?.sat_start) {
      customStart = customTimings.sat_start;
      customEnd = customTimings.sat_end || "17:30";
    } else if (weekday === "Sun" && customTimings?.sun_start) {
      customStart = customTimings.sun_start;
      customEnd = customTimings.sun_end || "14:00";
    } else if (customTimings?.mon_fri_start) {
      customStart = customTimings.mon_fri_start;
      customEnd = customTimings.mon_fri_end || customEnd;
    }

    const [sH, sM] = String(customStart).split(":").map(Number);
    if (!isNaN(sH) && !isNaN(sM)) {
      expectedStartHour = sH;
      expectedStartMinute = sM;
    }
    const [eH, eM] = String(customEnd).split(":").map(Number);
    if (!isNaN(eH) && !isNaN(eM)) {
      expectedEndHour = eH;
      expectedEndMinute = eM;
    }

    const fmt = (h, m) => {
      const ampm = h >= 12 ? "pm" : "am";
      const dh = h % 12 || 12;
      const dm = m < 10 ? `0${m}` : m;
      return `${dh}:${dm} ${ampm}`;
    };

    shiftLabel = `Custom Shift (${fmt(expectedStartHour, expectedStartMinute)} - ${fmt(expectedEndHour, expectedEndMinute)})`;
  } else {
    // Default Office Schedule
    if (weekday === "Sat") {
      expectedStartHour = 9;
      expectedStartMinute = 30;
      expectedEndHour = 17;
      expectedEndMinute = 30;
      shiftLabel = "Saturday (9:30 am - 5:30 pm)";
    } else if (weekday === "Sun") {
      expectedStartHour = 9;
      expectedStartMinute = 30;
      expectedEndHour = 14;
      expectedEndMinute = 0;
      shiftLabel = "Sunday (9:30 am - 2:00 pm)";
    }
  }

  const fmt = (h, m) => {
    const ampm = h >= 12 ? "pm" : "am";
    const dh = h % 12 || 12;
    const dm = m < 10 ? `0${m}` : m;
    return `${dh}:${dm} ${ampm}`;
  };

  const expectedLabel = fmt(expectedStartHour, expectedStartMinute);
  const expectedStartMins = expectedStartHour * 60 + expectedStartMinute;
  const lateMinutes = checkInMins - expectedStartMins;

  if (lateMinutes > 0) {
    const lateH = Math.floor(lateMinutes / 60);
    const lateM = lateMinutes % 60;
    const formattedLate = lateH > 0 ? `${lateH}h ${lateM}m` : `${lateM}m`;
    return {
      isLate: true,
      lateMinutes,
      formattedLate,
      expectedLabel,
      shiftLabel,
      isCustom,
      text: `Late by ${formattedLate}`,
    };
  }

  return {
    isLate: false,
    lateMinutes: 0,
    formattedLate: "On Time",
    expectedLabel,
    shiftLabel,
    isCustom,
    text: "On Time",
  };
};

export const formatWorkHours = (hoursVal) => {
  const hNum = parseFloat(hoursVal) || 0;
  if (hNum <= 0) return "0h 0m";
  const totalMins = Math.round(hNum * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};
