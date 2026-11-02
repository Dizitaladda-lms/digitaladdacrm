import { Outlet } from "react-router-dom";
import FestivalToggle from "../components/festival/FestivalToggle";

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <Outlet />
      <FestivalToggle className="diwali-auth-toggle" />
    </div>
  );
};

export default AuthLayout;