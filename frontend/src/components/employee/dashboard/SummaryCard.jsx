import "./SummaryCard.css";

const formatNumber = (val) => {
  if (val === null || val === undefined) return "0";
  const num = Number(val);
  return isNaN(num) ? val : num.toLocaleString("en-IN");
};

const SummaryCard = ({
  title,
  value,
  icon,
  color,
  onClick,
}) => {
  return (
    <div
      className={`summary-card ${color}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{ cursor: onClick ? "pointer" : undefined }}
      title={onClick ? `Click to view ${title}` : undefined}
    >
      <div className="summary-card-top">
        <div>
          <span className="summary-title">{title}</span>
          <h2 className="summary-value">{formatNumber(value)}</h2>
        </div>

        <div className={`summary-icon ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;