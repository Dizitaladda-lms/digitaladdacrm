import "./EmployeeTopbar.css";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
} from "lucide-react";
import ProfileMenu from "../profile/ProfileMenu";

const EmployeeTopbar = ({ isSidebarOpen = true, onMenuClick }) => {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="employee-topbar">
      <div className="topbar-left">
        <button
          className="menu-toggle"
          onClick={onMenuClick}
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>

        <div className="topbar-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search leads, admissions, follow-ups..."
          />
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-date">{today}</div>

        <button className="notification-btn">
          <Bell size={21} />
          <span className="notification-badge">0</span>
        </button>

        <ProfileMenu />
      </div>
    </header>
  );
};

export default EmployeeTopbar;
