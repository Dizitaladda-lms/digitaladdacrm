import "./DashboardHeader.css";
import { CalendarDays } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

const DashboardHeader = () => {
  const { user } = useAuth();
  const userName = user?.full_name || user?.name || "Counsellor";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hour = new Date().getHours();
  let greeting = "Good Evening";
  if (hour < 12) {
    greeting = "Good Morning";
  } else if (hour < 17) {
    greeting = "Good Afternoon";
  }

  return (
    <div className="employee-dashboard-header">
      <div className="dashboard-header-left">
        <h1>
          {greeting},{" "}
          <span className="employee-name">{userName}</span> 👋
        </h1>
        <p>
          Welcome back! Monitor your assigned leads, follow-ups, and admissions.
        </p>
      </div>

      <div className="dashboard-date-card">
        <div className="dashboard-date-icon">
          <CalendarDays size={18} />
        </div>
        <div>
          <span className="dashboard-date-label">Today</span>
          <h3>{today}</h3>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;