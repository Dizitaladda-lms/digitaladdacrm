import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  const cards = [
    {
      title: "Total Leads",
      value: Number(summary.total_leads || 0),
      subtitle: `${formatNumber(summary.today_leads || 0)} added today`,
      icon: Users,
      color: "blue",
      path: "/leads",
    },
    {
      title: "Admissions",
      value: Number(summary.total_admissions || 0),
      subtitle: "Confirmed admissions",
      icon: GraduationCap,
      color: "green",
      path: "/admissions",
    },
    {
      title: "Campaigns",
      value: Number(summary.total_campaigns || 0),
      subtitle: "Active campaigns",
      icon: Megaphone,
      color: "purple",
      path: "/lead-sources",
    },
    {
      title: "Employees",
      value: Number(summary.total_employees || 0),
      subtitle: "CRM team members",
      icon: Briefcase,
      color: "orange",
      path: "/employees",
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
            onClick={() => navigate(card.path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(card.path);
              }
            }}
            style={{ cursor: "pointer" }}
            title={`Click to view ${card.title}`}
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