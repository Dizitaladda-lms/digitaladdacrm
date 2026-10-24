import { runScheduledAutoCheckout } from "../services/attendanceService.js";
import logger from "../utils/logger.js";

const CHECK_INTERVAL_MS = 60_000;

const executeAutoCheckout = async () => {
  try {
    const records = await runScheduledAutoCheckout();
    if (records.length > 0) {
      logger.info("Scheduled attendance auto-checkout completed.", {
        count: records.length,
        attendanceIds: records.map((record) => record.id),
      });
    }
  } catch (error) {
    logger.error("Scheduled attendance auto-checkout failed.", {
      error: error.message,
      stack: error.stack,
    });
  }
};

// Run once at startup for same-day recovery, then check every minute. This
// ensures a Render restart after 7 PM still closes today's open attendances.
export const startAttendanceAutoCheckoutJob = () => {
  void executeAutoCheckout();
  return setInterval(() => {
    void executeAutoCheckout();
  }, CHECK_INTERVAL_MS);
};

export const stopAttendanceAutoCheckoutJob = (intervalId) => {
  if (intervalId) clearInterval(intervalId);
};
