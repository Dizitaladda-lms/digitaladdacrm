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
  activeFilter = "ALL",
  onCardClick,
}) => {
  const cards = [
    {
      id: "ALL",
      title: "Total Leads",
      value: Number(stats.total_leads || 0),
      subtitle: activeFilter === "ALL" ? "Showing all captured enquiries" : "Click to view all enquiries",
      icon: Users,
      color: "blue",
    },
    {
      id: "TODAY",
      title: "Today's Leads",
      value: Number(stats.today_leads || 0),
      subtitle: activeFilter === "TODAY" ? "● Active filter (Today)" : "Captured today (Click to filter)",
      icon: UserPlus,
      color: "green",
    },
    {
      id: "ASSIGNED",
      title: "Assigned Leads",
      value: Number(stats.assigned_leads || 0),
      subtitle: activeFilter === "ASSIGNED" ? "● Active filter (Assigned)" : "Assigned to counsellors (Click to filter)",
      icon: UserCheck,
      color: "purple",
    },
    {
      id: "UNASSIGNED",
      title: "Unassigned Leads",
      value: Number(stats.unassigned_leads || 0),
      subtitle: activeFilter === "UNASSIGNED" ? "● Active filter (Unassigned)" : "Action required (Click to filter)",
      icon: UserX,
      color: "orange",
    },
  ];

  return (
    <section className="lead-stats">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;
        return (
          <div
            key={card.title}
            className={`lead-stat-card ${card.color} ${isActive ? "is-active" : ""}`}
            onClick={() => onCardClick && onCardClick(isActive && card.id !== "ALL" ? "ALL" : card.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && onCardClick) {
                e.preventDefault();
                onCardClick(isActive && card.id !== "ALL" ? "ALL" : card.id);
              }
            }}
            title={`Click to filter: ${card.title}`}
          >
            <div className="lead-stat-top">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{card.title}</span>
                  {isActive && card.id !== "ALL" && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "8px",
                        background: "#eef2ff",
                        color: "#4f46e5",
                      }}
                    >
                      FILTERED
                    </span>
                  )}
                </div>
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