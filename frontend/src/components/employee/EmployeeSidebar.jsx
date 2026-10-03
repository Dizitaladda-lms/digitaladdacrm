import {
  LayoutDashboard,
  Users,
  PhoneCall,
  GraduationCap,
  User,
  Settings,
  LogOut,
  PanelLeftClose,
  CalendarCheck,
  UsersRound,
  TrendingUp,
  Fingerprint,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import "./EmployeeSidebar.css";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo/dizitaladda-logo.png";

const EmployeeSidebar = ({ isOpen = false, onToggle = () => {} }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const role = user?.role || "EMPLOYEE";
  const isCounsellor = role === "COUNSELLOR";
  const isTL = role === "TL";

  let menuItems = [];

  if (isCounsellor) {
    // Sales Department Counsellor
    menuItems = [
      { title: "Dashboard", icon: LayoutDashboard, path: "/employee/dashboard" },
      { title: "My Attendance", icon: Fingerprint, path: "/employee/my-attendance" },
      { title: "My Leads", icon: Users, path: "/employee/leads" },
      { title: "My Follow-ups", icon: PhoneCall, path: "/employee/followups" },
      { title: "My Admissions", icon: GraduationCap, path: "/employee/admissions" },
      { title: "Daily Work Report", icon: CalendarCheck, path: "/employee/daily-report" },
      { title: "Profile", icon: User, path: "/employee/profile" },
      { title: "Settings", icon: Settings, path: "/employee/settings" },
    ];
  } else if (isTL) {
    // Team Lead (TL) Portal — Dashboard, My Report, TL Team & Intern Reports, Attendance, Profile, Settings
    menuItems = [
      { title: "Dashboard", icon: LayoutDashboard, path: "/employee/dashboard" },
      { title: "My Daily Report", icon: CalendarCheck, path: "/employee/daily-report" },
      { title: "TL Team & Intern Reports", icon: UsersRound, path: "/employee/team-reports" },
      { title: "My Attendance", icon: Fingerprint, path: "/employee/my-attendance" },
      { title: "Profile", icon: User, path: "/employee/profile" },
      { title: "Settings", icon: Settings, path: "/employee/settings" },
    ];
  } else {
    // Operations & Training Department (TRAINER, EMPLOYEE, INTERN)
    menuItems = [
      { title: "Dashboard", icon: LayoutDashboard, path: "/employee/dashboard" },
      { title: "My Attendance", icon: Fingerprint, path: "/employee/my-attendance" },
      { title: "Daily Work Report", icon: CalendarCheck, path: "/employee/daily-report" },
      { title: "My Performance", icon: TrendingUp, path: "/employee/performance" },
      { title: "Profile", icon: User, path: "/employee/profile" },
      { title: "Settings", icon: Settings, path: "/employee/settings" },
    ];
  }

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 992) {
      onToggle();
    }
  };

  return (
    <>
      <div
        className={`employee-sidebar-overlay ${isOpen ? "show" : ""}`}
        onClick={onToggle}
      />
      <aside className={`employee-sidebar ${isOpen ? "open" : ""}`}>
        <div className="employee-sidebar-logo">
          <img
            src={logo}
            alt="DizitalAdda — India's Most Recommended Digital Marketing Institute"
            style={{ maxWidth: "170px" }}
          />
          <button
            type="button"
            onClick={onToggle}
            className="sidebar-collapse-btn"
            title="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <nav className="employee-sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  isActive ? "sidebar-link active" : "sidebar-link"
                }
                onClick={handleNavClick}
              >
                <Icon size={20} />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="employee-sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default EmployeeSidebar;
