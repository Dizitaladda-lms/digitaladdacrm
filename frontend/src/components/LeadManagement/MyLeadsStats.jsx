import React from "react";
import "../../styles/LeadManagement/LeadStats.css";
import { UserCheck, Sparkles, PhoneCall, GraduationCap } from "lucide-react";

const formatNumber = (val) => {
  if (val === null || val === undefined) return "0";
  const num = Number(val);
  return isNaN(num) ? val : num.toLocaleString("en-IN");
};

export const matchesMyLeadsBucket = (lead, bucket = "ALL") => {
  if (!bucket || bucket === "ALL") return true;
  const s = (lead?.status || "").toUpperCase();
  if (bucket === "FRESH") {
    return s === "NEW" || s === "FRESH" || s === "UNTOUCHED" || s === "ASSIGNED";
  }
  if (bucket === "FOLLOW_UP") {
    return (
      s === "FOLLOW_UP" ||
      s === "INTERESTED" ||
      s === "CONNECTED" ||
      s === "HOT" ||
      s === "WARM" ||
      s === "CALLBACK" ||
      s === "PENDING"
    );
  }
  if (bucket === "ADMISSIONS") {
    return (
      s === "ENROLLED" ||
      s === "ADMISSION" ||
      s === "CLOSED" ||
      s === "CONVERTED" ||
      s === "JOINED" ||
      s === "REGISTERED"
    );
  }
  return true;
};

const MyLeadsStats = ({
  leads = [],
  loading = false,
  activeBucket = "ALL",
  onCardClick,
}) => {
  const totalAssigned = leads.length;
  const freshLeads = leads.filter((l) => matchesMyLeadsBucket(l, "FRESH")).length;
  const inFollowup = leads.filter((l) => matchesMyLeadsBucket(l, "FOLLOW_UP")).length;
  const admissions = leads.filter((l) => matchesMyLeadsBucket(l, "ADMISSIONS")).length;

  const cards = [
    {
      id: "ALL",
      title: "Total Assigned to Me",
      value: totalAssigned,
      subtitle: activeBucket === "ALL" ? "Showing all active leads" : "Click to show all leads",
      icon: UserCheck,
      color: "blue",
    },
    {
      id: "FRESH",
      title: "New / Fresh Leads",
      value: freshLeads,
      subtitle: activeBucket === "FRESH" ? "● Active filter (New / Fresh)" : "Requires initial contact (Click to filter)",
      icon: Sparkles,
      color: "green",
    },
    {
      id: "FOLLOW_UP",
      title: "In Follow-up",
      value: inFollowup,
      subtitle: activeBucket === "FOLLOW_UP" ? "● Active filter (In Follow-up)" : "Active counseling conversations (Click to filter)",
      icon: PhoneCall,
      color: "purple",
    },
    {
      id: "ADMISSIONS",
      title: "Admissions Closed",
      value: admissions,
      subtitle: activeBucket === "ADMISSIONS" ? "● Active filter (Admissions)" : "Successfully enrolled students (Click to filter)",
      icon: GraduationCap,
      color: "orange",
    },
  ];

  return (
    <section className="lead-stats">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeBucket === card.id;
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

export default MyLeadsStats;
