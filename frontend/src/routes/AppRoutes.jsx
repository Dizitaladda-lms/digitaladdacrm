import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import ChangePassword from "../pages/auth/ChangePassword/ChangePassword";

import UnderMaintenance from "../components/common/UnderMaintenance";

const MyAttendance = lazy(() => import("../pages/employee/MyAttendance"));
const AttendanceReports = lazy(() => import("../pages/hr/AttendanceReports"));

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

      {/* ================= ADMIN / MANAGER / HR WORKSPACE ================= */}

      <Route element={<ProtectedRoute />}>

        <Route element={<RoleProtectedRoute roles={["MANAGER", "SUPER_ADMIN", "ADMIN", "HR"]} />}>

          <Route element={<MainLayout />}>

            {/* Attendance Modules — LIVE & ACTIVE */}
            <Route
              path="/my-attendance"
              element={
                <Suspense fallback={<PageLoader />}>
                  <MyAttendance />
                </Suspense>
              }
            />

            <Route
              path="/attendance-reports"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AttendanceReports />
                </Suspense>
              }
            />

            <Route
              path="/change-password"
              element={<ChangePassword />}
            />

            {/* Under Maintenance Modules */}
            <Route path="/dashboard" element={<UnderMaintenance moduleName="Admin Dashboard" />} />
            <Route path="/leads" element={<UnderMaintenance moduleName="Lead Management" />} />
            <Route path="/my-leads" element={<UnderMaintenance moduleName="My Leads" />} />
            <Route path="/lead-sources" element={<UnderMaintenance moduleName="Lead Sources" />} />
            <Route path="/employees" element={<UnderMaintenance moduleName="Employees Directory" />} />
            <Route path="/followups" element={<UnderMaintenance moduleName="My Follow-ups" />} />
            <Route path="/admissions" element={<UnderMaintenance moduleName="Admissions Management" />} />
            <Route path="/students" element={<UnderMaintenance moduleName="Students Portal" />} />
            <Route path="/reports" element={<UnderMaintenance moduleName="Operations Dashboard" />} />
            <Route path="/sales-department-report" element={<UnderMaintenance moduleName="Sales Department Overview" />} />
            <Route path="/daily-report" element={<UnderMaintenance moduleName="Daily Work Report" />} />
            <Route path="/team-reports" element={<UnderMaintenance moduleName="Team Reports" />} />
            <Route path="/agency-leads" element={<UnderMaintenance moduleName="Agency Leads" />} />
            <Route path="/telephony" element={<UnderMaintenance moduleName="Call Recording & Telephony" />} />
            <Route path="/settings" element={<UnderMaintenance moduleName="Admin Settings" />} />

          </Route>

        </Route>

      </Route>

      {/* ================= COUNSELLOR / EMPLOYEE / TRAINER / INTERN / TL ================= */}

      <Route element={<ProtectedRoute />}>

        <Route element={<RoleProtectedRoute roles={["COUNSELLOR", "EMPLOYEE", "TRAINER", "INTERN", "TL", "HR"]} />}>

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
