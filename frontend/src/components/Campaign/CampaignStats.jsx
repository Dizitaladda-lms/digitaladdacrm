import {
  Megaphone,
  Activity,
  Users,
  TrendingUp,
} from "lucide-react";

const CampaignStats = ({
  stats = {},
  loading = false,
}) => {
  const cards = [
    {
      title: "Total Campaigns",
      value: stats.total_campaigns || 0,
      subtitle: "All created campaigns",
      icon: Megaphone,
      theme: "blue",
    },
    {
      title: "Active Campaigns",
      value: stats.active_campaigns || 0,
      subtitle: "Currently running",
      icon: Activity,
      theme: "green",
    },
    {
      title: "Total Leads",
      value: stats.total_leads || 0,
      subtitle: "Acquired via campaigns",
      icon: Users,
      theme: "orange",
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversion_rate || 0}%`,
      subtitle: "Lead to admission ratio",
      icon: TrendingUp,
      theme: "purple",
    },
  ];

  return (
    <section className="campaign-stats-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`campaign-stat-card ${card.theme}`}
          >
            <div className="stat-card-header">
              <span className="stat-card-title">{card.title}</span>
              <div className="stat-card-icon">
                <Icon size={18} />
              </div>
            </div>

            <div className="stat-card-body">
              <h2 className="stat-card-value">
                {loading ? "--" : card.value}
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