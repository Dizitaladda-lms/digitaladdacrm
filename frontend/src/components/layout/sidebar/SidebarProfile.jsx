import { ShieldCheck } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

const SidebarProfile = () => {
  const { user } = useAuth();
  const roleLabel = user?.role === "SUPER_ADMIN" ? "Super Admin" : "Manager Admin";
  const initials = (user?.full_name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (

    <div className="profile-card">

      <div className="profile-avatar">

        {initials}

      </div>

      <div className="profile-content">

        <h3>{user?.full_name || "CRM User"}</h3>

        <p>{user?.designation || roleLabel}</p>

        <span className="profile-status">

          <span className="status-dot"></span>

          Online

        </span>

      </div>

    </div>

  );

};

export default SidebarProfile;
