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
  CalendarDays,
  CheckSquare,
  Globe,
  Fingerprint,
  ShieldCheck,
  TrendingUp,
  ClipboardList,
  Network,
  MessageSquare,
} from "lucide-react";

import { NavLink } from "react-router-dom";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const SidebarNavigation = ({ onClose }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const role = user?.role || "";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isHR = role === "HR";
  const isTL = role === "TL" || (user?.designation && user.designation.toLowerCase().includes("team lead"));
  const isHead = Boolean(user?.is_department_head || user?.is_head || isTL || role === "MANAGER" || (user?.designation && /head|manager|team lead/i.test(user.designation)));
  const isOperationsDept = isHR || (user?.department_name && /operation|hr|academic|training/i.test(user.department_name));
  const canSeeSalesReport = isSuperAdmin || isHR;

  // Build clean role-specific menu
  let menuItems = [];

  if (isHR) {
    // Operations & HR Department ONLY — Dedicated Agency Leads, Sales Dept Overview & Company Attendance
    menuItems = [
      { title: "Team Chat", icon: MessageSquare, path: "/team-chat" },
      { title: "Operations Dashboard", icon: FileBarChart2, path: "/reports" },
      { title: "Work Assigned by Admin", icon: ClipboardList, path: "/work-assignments" },
      { title: "Sales Dept Overview", icon: TrendingUp, path: "/sales-department-report" },
      { title: "Agency Leads", icon: Globe, path: "/agency-leads" },
      { title: "Company Attendance", icon: ShieldCheck, path: "/attendance-reports" },
      { title: "My Attendance", icon: Fingerprint, path: "/my-attendance" },
      { title: "My Monthly Roster", icon: CalendarDays, path: "/my-roster" },
      { title: "Employees & Roster", icon: BriefcaseBusiness, path: "/employees" },
      { title: "Organization Tree", icon: Network, path: "/org-tree" },
      { title: "My Daily Report", icon: CalendarCheck, path: "/daily-report" },
      { title: "Team Reports", icon: CheckSquare, path: "/team-reports" },
    ];
  } else if (isSuperAdmin) {
    // Super Admin: Master Executive Control across Sales, Operations, HR, & Attendance
    menuItems = [
      { title: "Team Chat", icon: MessageSquare, path: "/team-chat" },
      { title: "Sales Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { title: "Work Assigned to Employees", icon: ClipboardList, path: "/work-assignments" },
      { title: "Sales Dept Overview", icon: TrendingUp, path: "/sales-department-report" },
      { title: "Lead Management", icon: UsersRound, path: "/leads" },
      { title: "Agency Leads", icon: Globe, path: "/agency-leads" },
      { title: "Company Attendance", icon: ShieldCheck, path: "/attendance-reports" },
      { title: "Employees & Roster", icon: BriefcaseBusiness, path: "/employees" },
      { title: "Organization Tree", icon: Network, path: "/org-tree" },
      { title: "Operations & HR Dashboard", icon: FileBarChart2, path: "/reports" },
      { title: "Company Work Reports", icon: CheckSquare, path: "/team-reports" },
      { title: "Call Recording", icon: Radio, path: "/telephony" },
    ];
  } else if (isTL || isHead) {
    // Team Lead (TL) & Department Head / Manager Dedicated Sales Menu
    menuItems = [
      { title: "Team Chat", icon: MessageSquare, path: "/team-chat" },
      { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { title: "Team Reports", icon: CheckSquare, path: "/team-reports" },
      { title: "Employee Presence", icon: UsersRound, path: "/company-presence" },
      { title: "Work Assigned by Admin", icon: ClipboardList, path: "/work-assignments" },
      { title: "Employees Roster", icon: CalendarDays, path: "/employees-roster" },
      { title: "My Daily Report", icon: CalendarCheck, path: "/daily-report" },
      { title: "My Attendance", icon: Fingerprint, path: "/my-attendance" },
      { title: "My Monthly Roster", icon: CalendarDays, path: "/my-roster" },
      { title: "Lead Management", icon: UsersRound, path: "/leads" },
      { title: "My Leads", icon: UserCircle, path: "/my-leads" },
    ];
  } else if (isOperationsDept) {
    // Operations / HR Staff
    menuItems = [
      { title: "Team Chat", icon: MessageSquare, path: "/team-chat" },
      { title: "Operations Dashboard", icon: FileBarChart2, path: "/reports" },
      { title: "Work Assigned by Admin", icon: ClipboardList, path: "/work-assignments" },
      { title: "Company Attendance", icon: ShieldCheck, path: "/attendance-reports" },
      { title: "My Attendance", icon: Fingerprint, path: "/my-attendance" },
      { title: "My Monthly Roster", icon: CalendarDays, path: "/my-roster" },
      { title: "Employees & Roster", icon: BriefcaseBusiness, path: "/employees" },
      { title: "Organization Tree", icon: Network, path: "/org-tree" },
      { title: "Daily Work Report", icon: CalendarCheck, path: "/daily-report" },
      { title: "Team Reports", icon: CheckSquare, path: "/team-reports" },
    ];
  } else {
    // Sales Counsellors & Staff
    menuItems = [
      { title: "Team Chat", icon: MessageSquare, path: "/team-chat" },
      { title: "Sales Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { title: "Employee Presence", icon: UsersRound, path: "/company-presence" },
      { title: "Work Assigned by Admin", icon: ClipboardList, path: "/work-assignments" },
      { title: "Lead Management", icon: UsersRound, path: "/leads" },
      { title: "My Leads", icon: UserCircle, path: "/my-leads" },
      { title: "My Attendance", icon: Fingerprint, path: "/my-attendance" },
      { title: "My Monthly Roster", icon: CalendarDays, path: "/my-roster" },
      { title: "My Daily Report", icon: CalendarCheck, path: "/daily-report" },
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
