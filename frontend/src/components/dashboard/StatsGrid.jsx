import "../../styles/Dashboard/StatsGrid.css";

import {
  Users,
  GraduationCap,
  Megaphone,
  Briefcase,
} from "lucide-react";

const formatNumber = (val) => {
  if (val === null || val === undefined) return "0";
  const num = Number(val);
  return isNaN(num) ? val : num.toLocaleString("en-IN");
};

const StatsGrid = ({
  summary = {},
  loading = false,
}) => {
  const cards = [
    {
      title: "Total Leads",
      value: Number(summary.total_leads || 0),
      subtitle: `${formatNumber(summary.today_leads || 0)} added today`,
      icon: Users,
      color: "blue",
    },
    {
      title: "Admissions",
      value: Number(summary.total_admissions || 0),
      subtitle: "Confirmed admissions",
      icon: GraduationCap,
      color: "green",
    },
    {
      title: "Campaigns",
      value: Number(summary.total_campaigns || 0),
      subtitle: "Active campaigns",
      icon: Megaphone,
      color: "purple",
    },
    {
      title: "Employees",
      value: Number(summary.total_employees || 0),
      subtitle: "CRM team members",
      icon: Briefcase,
      color: "orange",
    },
  ];

  return (
    <section className="stats-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`stat-card ${card.color}`}
          >
            <div className="stat-header">
              <div>
                <p className="stat-title">{card.title}</p>
                <h2 className="stat-value">
                  {loading ? "--" : formatNumber(card.value)}
                </h2>
                <span className="stat-subtitle">{card.subtitle}</span>
              </div>

              <div className="stat-icon">
                <Icon size={20} />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default StatsGrid;