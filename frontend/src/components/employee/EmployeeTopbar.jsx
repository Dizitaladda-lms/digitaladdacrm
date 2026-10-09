import "./EmployeeTopbar.css";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Calendar,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ProfileMenu from "../profile/ProfileMenu";

const EmployeeTopbar = ({ isSidebarOpen = true, onMenuClick }) => {
  const { user } = useAuth();
  const role = user?.role || "EMPLOYEE";
  const isCounsellor = role === "COUNSELLOR";

  const getWorkspaceTitle = () => {
    if (isCounsellor) return "Admissions & Sales Workspace";
    if (role === "TRAINER") return "Faculty & Academic Workspace";
    if (role === "INTERN") return "Intern Learning & Work Portal";
    if (role === "HR") return "Human Resources Workspace";
    if (role === "TL") return "Team Lead Operations Workspace";
    return user?.designation ? `${user.designation} Workspace` : "Academic & Operations Workspace";
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <header className="employee-topbar">
      <div className="topbar-left">
        <button
          className="menu-toggle"
          onClick={onMenuClick}
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>

        <div className="topbar-title-wrap">
          <h1 className="topbar-title">{getWorkspaceTitle()}</h1>
          <div className="topbar-status">
            <span className="status-indicator-dot"></span>
            <span>Connected & Active</span>
          </div>
        </div>
      </div>

      <div className="topbar-center">
        <div className="topbar-search">
          <Search size={16} />
          <input
            type="text"
            placeholder={isCounsellor ? "Search my leads, follow-ups..." : "Search tasks, reports, classes..."}
          />
          <kbd className="search-kbd">⌘K</kbd>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-date">
          <Calendar size={14} />
          <span>{today}</span>
        </div>

        <ProfileMenu />
      </div>
    </header>
  );
};

export default EmployeeTopbar;
