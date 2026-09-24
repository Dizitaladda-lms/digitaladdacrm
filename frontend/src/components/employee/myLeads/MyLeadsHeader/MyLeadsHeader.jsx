import React from "react";
import "./MyLeadsHeader.css";
import { Calendar, GraduationCap, Award, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MyLeadsHeader = ({ onExport = () => {} }) => {
  const navigate = useNavigate();

  return (
    <div className="my-leads-header">
      <div className="header-left">
        <h2>My Leads Pipeline</h2>
        <p>
          Manage, track, and counsel all assigned student leads from one place.
        </p>
      </div>

      <div className="header-right" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>

        <button
          type="button"
          className="export-btn"
          onClick={onExport}
          title="Export My Leads to CSV/Excel"
          style={{ backgroundColor: "#F1F5F9", color: "#334155" }}
        >
          <Download size={18} />
          <span>Export CSV</span>
        </button>

        <button
          type="button"
          className="export-btn"
          onClick={() => navigate("/employee/followups")}
          title="Open Follow-up Planner"
        >
          <Calendar size={18} />
          <span>Follow-up Planner</span>
        </button>

        <button
          type="button"
          className="export-btn"
          onClick={() => navigate("/employee/admissions")}
          title="Open Admissions Ledger"
        >
          <GraduationCap size={18} />
          <span>My Admissions</span>
        </button>

        <button
          type="button"
          className="followup-btn"
          onClick={() => navigate("/employee/profile")}
          title="View Performance Scorecard"
        >
          <Award size={18} />
          <span>My Scorecard</span>
        </button>
      </div>
    </div>
  );
};

export default MyLeadsHeader;