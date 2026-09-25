import "./EmployeeTopbar.css";
import {
  Menu,
  Search,
  Bell,
} from "lucide-react";
import ProfileMenu from "../profile/ProfileMenu";

const EmployeeTopbar = ({ onMenuClick }) => {

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="employee-topbar">

      <div className="topbar-left">

        <button className="menu-toggle" onClick={onMenuClick}>
          <Menu size={22} />
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

        <div className="topbar-date">
          {today}
        </div>

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
