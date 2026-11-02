import { useEffect, useState } from "react";
import { getDiwaliStartTime } from "../../config/festivalConfig";

const getRemainingTime = () => Math.max(0, getDiwaliStartTime().getTime() - Date.now());

const formatUnit = (value) => String(value).padStart(2, "0");

const DiwaliCountdown = () => {
  const [remaining, setRemaining] = useState(getRemainingTime);
  const countdownComplete = remaining === 0;

  useEffect(() => {
    if (countdownComplete) return undefined;
    const intervalId = window.setInterval(() => {
      const nextRemaining = getRemainingTime();
      setRemaining(nextRemaining);
      if (nextRemaining === 0) window.clearInterval(intervalId);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [countdownComplete]);

  if (remaining === 0) {
    return <span className="diwali-countdown" role="status">Shubh Deepawali! 🪔</span>;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <span
      className="diwali-countdown"
      aria-label={`Diwali mein ${days} din, ${hours} ghante, ${minutes} minute aur ${seconds} second baaki`}
    >
      <span className="diwali-countdown__label">Diwali mein</span>
      <span className="diwali-countdown__time" aria-hidden="true">
        {days}d {formatUnit(hours)}:{formatUnit(minutes)}:{formatUnit(seconds)}
      </span>
    </span>
  );
};

export default DiwaliCountdown;
