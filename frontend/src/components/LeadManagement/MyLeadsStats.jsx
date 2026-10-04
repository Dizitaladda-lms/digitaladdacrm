import React from "react";
import "../../styles/LeadManagement/LeadStats.css";
import { UserCheck, Sparkles, PhoneCall, GraduationCap } from "lucide-react";

const formatNumber = (val) => {
  if (val === null || val === undefined) return "0";
  const num = Number(val);
  return isNaN(num) ? val : num.toLocaleString("en-IN");
};

const MyLeadsStats = ({ leads = [], loading = false }) => {
  const totalAssigned = leads.length;

  const freshLeads = leads.filter((l) => {
    const s = (l.status || "").toUpperCase();
    return s === "NEW" || s === "FRESH" || s === "UNTOUCHED" || s === "ASSIGNED";
  }).length;

  const inFollowup = leads.filter((l) => {
    const s = (l.status || "").toUpperCase();
    return (
      s === "FOLLOW_UP" ||
      s === "INTERESTED" ||
      s === "CONNECTED" ||
      s === "HOT" ||
      s === "WARM" ||
      s === "CALLBACK" ||
      s === "PENDING"
    );
  }).length;

  const admissions = leads.filter((l) => {
    const s = (l.status || "").toUpperCase();
    return (
      s === "ENROLLED" ||
      s === "ADMISSION" ||
      s === "CLOSED" ||
      s === "CONVERTED" ||
      s === "JOINED" ||
      s === "REGISTERED"
    );
  }).length;

  const cards = [
    {
      title: "Total Assigned to Me",
      value: totalAssigned,
      subtitle: "Active leads in my pipeline",
      icon: UserCheck,
      color: "blue",
    },
    {
      title: "New / Fresh Leads",
      value: freshLeads,
      subtitle: "Requires initial contact",
      icon: Sparkles,
      color: "green",
    },
    {
      title: "In Follow-up",
      value: inFollowup,
      subtitle: "Active counseling conversations",
      icon: PhoneCall,
      color: "purple",
    },
    {
      title: "Admissions Closed",
      value: admissions,
      subtitle: "Successfully enrolled students",
      icon: GraduationCap,
      color: "orange",
    },
  ];

  return (
    <section className="lead-stats">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.title} className={`lead-stat-card ${card.color}`}>
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

export default MyLeadsStats;
