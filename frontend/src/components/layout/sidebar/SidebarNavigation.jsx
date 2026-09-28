import {
  LayoutDashboard,
  Megaphone,
  UsersRound,
  BriefcaseBusiness,
  PhoneCall,
  GraduationCap,
  KeyRound,
  LogOut,
  Radio,
} from "lucide-react";

import { NavLink } from "react-router-dom";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    title: "Campaigns",
    icon: Megaphone,
    path: "/campaigns",
  },
  {
    title: "Lead Management",
    icon: UsersRound,
    path: "/leads",
  },
  {
    title: "Follow-ups",
    icon: PhoneCall,
    path: "/followups",
  },
  {
    title: "Admissions & Fees",
    icon: GraduationCap,
    path: "/admissions",
  },
  {
    title: "Employees",
    icon: BriefcaseBusiness,
    path: "/employees",
  },
  {
    title: "Call Recording",
    icon: Radio,
    path: "/telephony",
  },
];

const SidebarNavigation = ({ onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

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