import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RoleProtectedRoute = ({ roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!roles.includes(user.role)) {

    if (["MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }

    if (user.role === "HR") {
      return <Navigate to="/reports" replace />;
    }

    if (["COUNSELLOR", "EMPLOYEE", "TRAINER", "INTERN", "TL"].includes(user.role)) {
      return <Navigate to="/employee/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RoleProtectedRoute;
