import { lazy, Suspense } from "react";
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

// Lazy-loaded so they share the same chunk as EmployeeRoutes (no INEFFECTIVE_DYNAMIC_IMPORT warning)
const MyFollowups = lazy(() => import("../pages/employee/MyFollowups"));
const MyAdmissions = lazy(() => import("../pages/employee/MyAdmissions"));
const TelephonySettings = lazy(() => import("../pages/admin/TelephonySettings"));
const ManagerMyLeads = lazy(() => import("../pages/admin/ManagerMyLeads"));

import AuthLayout from "../layouts/AuthLayout";
import MainLayout from "../layouts/MainLayout";

import EmployeeRoutes from "./EmployeeRoutes";
import ProtectedRoute from "./ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";

const PageLoader = () => (
  <div style={{ padding: "40px", textAlign: "center", fontWeight: 600, color: "#64748B" }}>
    Loading...
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>

      {/* Public */}
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Login />} />
      </Route>

      {/* ================= ADMIN ================= */}

      <Route element={<ProtectedRoute />}>

        <Route element={<RoleProtectedRoute roles={["MANAGER", "SUPER_ADMIN"]} />}>

          <Route element={<MainLayout />}>

            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/leads" element={<LeadManagement />} />

            <Route
              path="/my-leads"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManagerMyLeads />
                </Suspense>
              }
            />

            <Route path="/campaigns" element={<CampaignManagement />} />

            <Route path="/lead-sources" element={<LeadSources />} />

            <Route path="/employees" element={<Employees />} />

            <Route
              path="/followups"
              element={
                <Suspense fallback={<PageLoader />}>
                  <MyFollowups />
                </Suspense>
              }
            />

            <Route
              path="/admissions"
              element={
                <Suspense fallback={<PageLoader />}>
                  <MyAdmissions />
                </Suspense>
              }
            />

            <Route path="/students" element={<AdminWorkspace page="students" />} />

            <Route element={<RoleProtectedRoute roles={["SUPER_ADMIN"]} />}>
              <Route path="/reports" element={<AdminWorkspace page="reports" />} />
              <Route
                path="/telephony"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <TelephonySettings />
                  </Suspense>
                }
              />
            </Route>

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
