import "../../styles/LeadManagement/LeadStats.css";

import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
} from "lucide-react";

const formatNumber = (val) => {
  if (val === null || val === undefined) return "0";
  const num = Number(val);
  return isNaN(num) ? val : num.toLocaleString("en-IN");
};

const LeadStats = ({
  stats = {},
  loading = false,
}) => {
  const cards = [
    {
      title: "Total Leads",
      value: Number(stats.total_leads || 0),
      subtitle: "Total captured enquiries",
      icon: Users,
      color: "blue",
    },
    {
      title: "Today's Leads",
      value: Number(stats.today_leads || 0),
      subtitle: "Captured today",
      icon: UserPlus,
      color: "green",
    },
    {
      title: "Assigned Leads",
      value: Number(stats.assigned_leads || 0),
      subtitle: "Assigned to counsellors",
      icon: UserCheck,
      color: "purple",
    },
    {
      title: "Unassigned Leads",
      value: Number(stats.unassigned_leads || 0),
      subtitle: "Action required",
      icon: UserX,
      color: "orange",
    },
  ];

  return (
    <section className="lead-stats">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`lead-stat-card ${card.color}`}
          >
            <div className="lead-stat-top">
              <div>
                <span>{card.title}</span>
                <h2>{loading ? "--" : formatNumber(card.value)}</h2>
                <p>{card.subtitle}</p>
              </div>

              <div className="lead-stat-icon">
                <Icon size={20} />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default LeadStats;