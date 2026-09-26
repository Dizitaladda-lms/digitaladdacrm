import React from "react";
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  GraduationCap,
  User,
  Settings,
  LogOut,
  PanelLeftClose,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import "./EmployeeSidebar.css";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo/dizitaladda-logo.png";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/employee/dashboard",
  },
  {
    title: "My Leads",
    icon: Users,
    path: "/employee/leads",
  },
  {
    title: "My Follow-ups",
    icon: PhoneCall,
    path: "/employee/followups",
  },
  {
    title: "My Admissions",
    icon: GraduationCap,
    path: "/employee/admissions",
  },
  {
    title: "Profile",
    icon: User,
    path: "/employee/profile",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/employee/settings",
  },
];

const EmployeeSidebar = ({ isOpen = false, onToggle = () => {} }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
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
            style={{ background: "#1e293b", borderColor: "#334155", color: "#94a3b8" }}
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
                onClick={onToggle}
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
