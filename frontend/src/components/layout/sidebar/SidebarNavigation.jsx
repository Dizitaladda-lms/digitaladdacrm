import {
  LayoutDashboard,
  Megaphone,
  UsersRound,
  BriefcaseBusiness,
  KeyRound,
  LogOut,
  Radio,
  FileBarChart2,
  UserCircle,
  CalendarCheck,
  CheckSquare,
} from "lucide-react";

import { NavLink } from "react-router-dom";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const managerMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    title: "Lead Management",
    icon: UsersRound,
    path: "/leads",
  },
  {
    title: "My Leads",
    icon: UserCircle,
    path: "/my-leads",
  },
  {
    title: "Employees",
    icon: BriefcaseBusiness,
    path: "/employees",
  },
];

const SidebarNavigation = ({ onClose }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const role = user?.role || "";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isHR = role === "HR";
  const isOperationsDept = isHR || (user?.department_name && /operation|hr|academic|training/i.test(user.department_name));

  // Build clean role-specific menu
  let menuItems = [];

  if (isHR) {
    // Operations & HR Department ONLY — NO LEADS
    menuItems = [
      { title: "Operations Dashboard", icon: FileBarChart2, path: "/reports" },
      { title: "Employees", icon: BriefcaseBusiness, path: "/employees" },
      { title: "My Daily Report", icon: CalendarCheck, path: "/daily-report" },
      { title: "Team Reports", icon: CheckSquare, path: "/team-reports" },
    ];
  } else if (isSuperAdmin) {
    // Super Admin: Has access to both Sales and Operations (No Campaigns)
    menuItems = [
      { title: "Sales Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { title: "Lead Management", icon: UsersRound, path: "/leads" },
      { title: "My Leads", icon: UserCircle, path: "/my-leads" },
      { title: "Employees", icon: BriefcaseBusiness, path: "/employees" },
      { title: "Operations & HR", icon: FileBarChart2, path: "/reports" },
      { title: "Daily Work Report", icon: CalendarCheck, path: "/daily-report" },
      { title: "Team Reports", icon: CheckSquare, path: "/team-reports" },
      { title: "Call Recording", icon: Radio, path: "/telephony" },
    ];
  } else if (isOperationsDept) {
    // Operations / HR Staff
    menuItems = [
      { title: "Operations Dashboard", icon: FileBarChart2, path: "/reports" },
      { title: "Employees", icon: BriefcaseBusiness, path: "/employees" },
      { title: "Daily Work Report", icon: CalendarCheck, path: "/daily-report" },
      { title: "Team Reports", icon: CheckSquare, path: "/team-reports" },
    ];
  } else {
    // Sales Manager: ONLY Leads Management & Sales Team Reports
    menuItems = [
      { title: "Sales Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { title: "Lead Management", icon: UsersRound, path: "/leads" },
      { title: "My Leads", icon: UserCircle, path: "/my-leads" },
      { title: "Sales Team Reports", icon: CheckSquare, path: "/team-reports" },
    ];
  }

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      <p className="menu-title">
        MAIN MENU
      </p>

      {menuItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.title}
            to={item.path}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
          >
            <Icon size={20} />
            <span>{item.title}</span>
          </NavLink>
        );
      })}

      <div className="sidebar-divider" />

      <p className="menu-title">
        ACCOUNT
      </p>

      <NavLink
        to="/change-password"
        onClick={handleNavClick}
        className={({ isActive }) =>
          `sidebar-item ${isActive ? "active" : ""}`
        }
      >
        <KeyRound size={20} />
        <span>Change Password</span>
      </NavLink>

      <button

    className="sidebar-item logout-btn"

    onClick={handleLogout}

>

        <LogOut size={20} />

        <span>

          Logout

        </span>

      </button>

    </>

  );

};

export default SidebarNavigation;
