import {
  Megaphone,
  Activity,
  Users,
  TrendingUp,
} from "lucide-react";

const formatNumber = (val) => {
  if (val === null || val === undefined) return "0";
  if (typeof val === "string" && val.includes("%")) return val;
  const num = Number(val);
  return isNaN(num) ? val : num.toLocaleString("en-IN");
};

const CampaignStats = ({
  stats = {},
  loading = false,
  activeStatus = "",
  onCardClick,
}) => {
  const cards = [
    {
      title: "Total Campaigns",
      value: stats.total_campaigns || 0,
      subtitle: "All created campaigns",
      icon: Megaphone,
      theme: "blue",
      filterStatus: "",
    },
    {
      title: "Active Campaigns",
      value: stats.active_campaigns || 0,
      subtitle: "Currently running",
      icon: Activity,
      theme: "green",
      filterStatus: "ACTIVE",
    },
    {
      title: "Total Leads",
      value: stats.total_leads || 0,
      subtitle: "Acquired via campaigns",
      icon: Users,
      theme: "orange",
      filterStatus: "LEADS",
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversion_rate || 0}%`,
      subtitle: "Lead to admission ratio",
      icon: TrendingUp,
      theme: "purple",
      filterStatus: "COMPLETED",
    },
  ];

  return (
    <section className="campaign-stats-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive =
          card.filterStatus === ""
            ? activeStatus === ""
            : activeStatus === card.filterStatus;
        return (
          <div
            key={card.title}
            className={`campaign-stat-card ${card.theme} ${isActive ? "is-active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => onCardClick && onCardClick(card.filterStatus)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && onCardClick) {
                e.preventDefault();
                onCardClick(card.filterStatus);
              }
            }}
            style={{
              cursor: "pointer",
              outline: isActive ? "2px solid #2563eb" : undefined,
            }}
          >
            <div className="stat-card-header">
              <span className="stat-card-title">{card.title}</span>
              <div className="stat-card-icon">
                <Icon size={18} />
              </div>
            </div>

            <div className="stat-card-body">
              <h2 className="stat-card-value">
                {loading ? "--" : formatNumber(card.value)}
              </h2>
              <span className="stat-card-subtitle">{card.subtitle}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default CampaignStats;