import "./EmployeeTopbar.css";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Calendar,
} from "lucide-react";
import ProfileMenu from "../profile/ProfileMenu";
import NotificationsPopover from "../common/NotificationsPopover/NotificationsPopover";

const EmployeeTopbar = ({ isSidebarOpen = true, onMenuClick }) => {
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
          <h1 className="topbar-title">Counsellor Workspace</h1>
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
            placeholder="Search my leads, follow-ups..."
          />
          <kbd className="search-kbd">⌘K</kbd>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-date">
          <Calendar size={14} />
          <span>{today}</span>
        </div>

        <NotificationsPopover isEmployee />

        <ProfileMenu />
      </div>
    </header>
  );
};

export default EmployeeTopbar;
