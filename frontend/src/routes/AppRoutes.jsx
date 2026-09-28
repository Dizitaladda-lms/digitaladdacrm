import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import ChangePassword from "../pages/auth/ChangePassword/ChangePassword";

import Dashboard from "../pages/dashboard/Dashboard";
import LeadManagement from "../pages/Lead/LeadManagement";
import CampaignManagement from "../pages/campaign/CampaignManagement";
import CampaignForm from "../pages/campaign/CampaignForm";
import LeadSources from "../pages/leadSources/LeadSources";
import AdminWorkspace from "../pages/admin/AdminWorkspace";
import AdminSettings from "../pages/admin/Settings";
import Employees from "../pages/admin/Employees";
import MyFollowups from "../pages/employee/MyFollowups";
import MyAdmissions from "../pages/employee/MyAdmissions";

import AuthLayout from "../layouts/AuthLayout";
import MainLayout from "../layouts/MainLayout";

import EmployeeRoutes from "./EmployeeRoutes";
import ProtectedRoute from "./ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";

const AppRoutes = () => {
  return (
    <Routes>

      {/* Public */}
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Login />} />
      </Route>

      {/* ================= ADMIN ================= */}

      <Route element={<ProtectedRoute />}>

        <Route element={<RoleProtectedRoute roles={["ADMIN"]} />}>

          <Route element={<MainLayout />}>

            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/leads" element={<LeadManagement />} />

            <Route path="/campaigns" element={<CampaignManagement />} />

            <Route path="/lead-sources" element={<LeadSources />} />

            <Route path="/employees" element={<Employees />} />

            <Route path="/followups" element={<MyFollowups />} />

            <Route path="/admissions" element={<MyAdmissions />} />

            <Route path="/students" element={<AdminWorkspace page="students" />} />

            <Route path="/reports" element={<AdminWorkspace page="reports" />} />

            <Route path="/settings" element={<AdminSettings />} />

            <Route path="/campaigns/new" element={<CampaignForm />} />

            <Route path="/campaigns/edit/:id" element={<CampaignForm />} />

            <Route
              path="/change-password"
              element={<ChangePassword />}
            />

          </Route>

        </Route>

      </Route>

      {/* ================= COUNSELLOR ================= */}

      <Route element={<ProtectedRoute />}>

        <Route element={<RoleProtectedRoute roles={["COUNSELLOR"]} />}>

          <Route
            path="/employee/*"
            element={<EmployeeRoutes />}
          />

        </Route>
      </Route>

    </Routes>
  );
};

export default AppRoutes;
