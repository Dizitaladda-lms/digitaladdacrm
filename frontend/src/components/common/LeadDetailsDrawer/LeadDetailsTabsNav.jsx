import React from "react";
import { User, GraduationCap, MessageSquareText, History, PhoneCall } from "lucide-react";
import "./LeadDetailsDrawer.css";

/**
 * LeadDetailsTabsNav Component
 * 4-Step Guided Counselling Navigation Tabs.
 */
const LeadDetailsTabsNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      id: "personal",
      label: "Personal Contact",
      icon: <User size={16} />,
    },
    {
      id: "academic",
      label: "Academic Profile",
      icon: <GraduationCap size={16} />,
    },
    {
      id: "counselling",
      label: "Guided Counselling",
      icon: <MessageSquareText size={16} />,
    },
    {
      id: "calls",
      label: "Call Recordings",
      icon: <PhoneCall size={16} />,
    },
    {
      id: "timeline",
      label: "Audit Timeline & Notes",
      icon: <History size={16} />,
    },
  ];

  return (
    <div className="crm-tabs-container">
      <nav className="crm-tabs-nav">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`crm-tab-button ${isActive ? "active" : ""}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default LeadDetailsTabsNav;
