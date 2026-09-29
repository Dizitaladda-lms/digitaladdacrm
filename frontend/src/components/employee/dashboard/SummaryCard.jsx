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
}) => {
  return (
    <div className={`summary-card ${color}`}>
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