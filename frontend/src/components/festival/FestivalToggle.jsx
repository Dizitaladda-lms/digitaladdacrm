import { useTheme } from "../../context/ThemeContext";
import DiyaGlow from "./DiyaGlow";

const FestivalToggle = ({ className = "" }) => {
  const { festival, festivalActive, festivalModeLocked, toggleFestival } = useTheme();
  const description = `Diwali festival mode is ${festivalActive ? "on" : "off"}`;

  return (
    <button
      type="button"
      className={`diwali-toggle ${className}`.trim()}
      onClick={toggleFestival}
      disabled={festivalModeLocked}
      aria-label={description}
      aria-pressed={festivalActive}
      title={`Diwali mode ${festivalActive ? "on" : "off"} · preference: ${festival}${festivalModeLocked ? " (controlled by VITE_FESTIVAL_MODE)" : ""}`}
    >
      <DiyaGlow size={22} />
      <span className="diwali-toggle__label">Diwali</span>
    </button>
  );
};

export default FestivalToggle;
