import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import ChangePassword from "../pages/auth/ChangePassword/ChangePassword";

import Dashboard from "../pages/dashboard/Dashboard";
import LeadManagement from "../pages/Lead/LeadManagement";
import LeadSources from "../pages/leadSources/LeadSources";
import AdminWorkspace from "../pages/admin/AdminWorkspace";
import AdminSettings from "../pages/admin/Settings";
import Employees from "../pages/admin/Employees";

// Lazy-loaded routes
const MyFollowups = lazy(() => import("../pages/employee/MyFollowups"));
const MyAdmissions = lazy(() => import("../pages/employee/MyAdmissions"));
const TelephonySettings = lazy(() => import("../pages/admin/TelephonySettings"));
const ManagerMyLeads = lazy(() => import("../pages/admin/ManagerMyLeads"));
const OperationsDashboard = lazy(() => import("../pages/admin/OperationsDashboard"));
const DailyReportForm = lazy(() => import("../pages/admin/DailyReportForm"));
const TeamReports = lazy(() => import("../pages/employee/TeamReports"));
const AgencyLeads = lazy(() => import("../pages/hr/AgencyLeads"));
const MyAttendance = lazy(() => import("../pages/employee/MyAttendance"));
const AttendanceReports = lazy(() => import("../pages/hr/AttendanceReports"));
const SalesDepartmentReport = lazy(() => import("../pages/hr/SalesDepartmentReport"));
const AdminWorkAssignments = lazy(() => import("../pages/admin/AdminWorkAssignments"));
const OrganizationTree = lazy(() => import("../pages/admin/OrganizationTree"));
const EmployeesRoster = lazy(() => import("../pages/hr/EmployeesRoster"));
const MyRoster = lazy(() => import("../pages/employee/MyRoster"));
const TeamChat = lazy(() => import("../pages/chat/TeamChat"));

import AuthLayout from "../layouts/AuthLayout";
import MainLayout from "../layouts/MainLayout";

import EmployeeRoutes from "./EmployeeRoutes";
import ProtectedRoute from "./ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";

import UnderMaintenance from "../pages/UnderMaintenance";
import { IS_MAINTENANCE_MODE } from "../config/maintenanceConfig";

const PageLoader = () => (
  <div style={{ padding: "40px", textAlign: "center", fontWeight: 600, color: "#64748B" }}>
    Loading...
  </div>
);

const renderPage = (Component) => {
  if (IS_MAINTENANCE_MODE) return <UnderMaintenance />;
  return <Component />;
};

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

            <Route path="/dashboard" element={renderPage(Dashboard)} />

            <Route path="/leads" element={renderPage(LeadManagement)} />

            <Route
              path="/my-leads"
              element={
                IS_MAINTENANCE_MODE ? (
                  <UnderMaintenance />
                ) : (
                  <Suspense fallback={<PageLoader />}>
                    <ManagerMyLeads />
                  </Suspense>
                )
              }
            />

            <Route path="/lead-sources" element={renderPage(LeadSources)} />

            <Route path="/employees" element={renderPage(Employees)} />

            <Route
              path="/followups"
              element={
                IS_MAINTENANCE_MODE ? (
                  <UnderMaintenance />
                ) : (
                  <Suspense fallback={<PageLoader />}>
                    <MyFollowups />
                  </Suspense>
                )
              }
            />

            <Route
              path="/admissions"
              element={
                IS_MAINTENANCE_MODE ? (
                  <UnderMaintenance />
                ) : (
                  <Suspense fallback={<PageLoader />}>
                    <MyAdmissions />
                  </Suspense>
                )
              }
            />

            <Route path="/students" element={renderPage(AdminWorkspace)} />

            <Route
              path="/reports"
              element={
                IS_MAINTENANCE_MODE ? (
                  <UnderMaintenance />
                ) : (
                  <Suspense fallback={<PageLoader />}>
                    <OperationsDashboard />
                  </Suspense>
                )
              }
            />

            <Route
              path="/work-assignments"
              element={
                IS_MAINTENANCE_MODE ? (
                  <UnderMaintenance />
                ) : (
                  <Suspense fallback={<PageLoader />}>
                    <AdminWorkAssignments />
                  </Suspense>
                )
              }
            />

            <Route path="/team-chat" element={renderPage(TeamChat)} />
            <Route path="/chat" element={renderPage(TeamChat)} />

            <Route element={<RoleProtectedRoute roles={["SUPER_ADMIN", "HR", "MANAGER", "TL", "ADMIN"]} />}>
              <Route
                path="/sales-department-report"
                element={
                  IS_MAINTENANCE_MODE ? (
                    <UnderMaintenance />
                  ) : (
                    <Suspense fallback={<PageLoader />}>
                      <SalesDepartmentReport />
                    </Suspense>
                  )
                }
              />
            </Route>

            <Route
              path="/daily-report"
              element={
                IS_MAINTENANCE_MODE ? (
                  <UnderMaintenance />
                ) : (
                  <Suspense fallback={<PageLoader />}>
                    <DailyReportForm />
                  </Suspense>
                )
              }
            />

            <Route
              path="/team-reports"
              element={
                IS_MAINTENANCE_MODE ? (
                  <UnderMaintenance />
                ) : (
                  <Suspense fallback={<PageLoader />}>
                    <TeamReports />
                  </Suspense>
                )
              }
            />

            <Route
              path="/agency-leads"
              element={
                IS_MAINTENANCE_MODE ? (
                  <UnderMaintenance />
                ) : (
                  <Suspense fallback={<PageLoader />}>
                    <AgencyLeads />
                  </Suspense>
                )
              }
            />

            {/* Attendance Page — ACTIVE & ACCESSIBLE FOR ALL EMPLOYEES */}
            <Route
              path="/my-attendance"
              element={
                <Suspense fallback={<PageLoader />}>
                  <MyAttendance />
                </Suspense>
              }
            />

            {/* Attendance Reports Page — ACCESSIBLE TO HR & SUPER ADMIN */}
            <Route
              path="/attendance-reports"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AttendanceReports />
                </Suspense>
              }
            />

            {/* Organization Hierarchy Tree — ACCESSIBLE TO HR, ADMIN, SUPER ADMIN, MANAGER */}
            <Route
              path="/org-tree"
              element={
                IS_MAINTENANCE_MODE ? (
                  <UnderMaintenance />
                ) : (
                  <Suspense fallback={<PageLoader />}>
                    <OrganizationTree />
                  </Suspense>
                )
              }
            />

            {/* Employees Roster — ACCESSIBLE TO HR & SUPER ADMIN */}
            <Route
              path="/employees-roster"
              element={
                <Suspense fallback={<PageLoader />}>
                  <EmployeesRoster />
                </Suspense>
              }
            />

            {/* My Personal Monthly Roster */}
            <Route
              path="/my-roster"
              element={
                <Suspense fallback={<PageLoader />}>
                  <MyRoster />
                </Suspense>
              }
            />

            <Route element={<RoleProtectedRoute roles={["SUPER_ADMIN"]} />}>
              <Route
                path="/telephony"
                element={
                  IS_MAINTENANCE_MODE ? (
                    <UnderMaintenance />
                  ) : (
                    <Suspense fallback={<PageLoader />}>
                      <TelephonySettings />
                    </Suspense>
                  )
                }
              />
            </Route>

            <Route path="/settings" element={renderPage(AdminSettings)} />

            <Route
              path="/change-password"
              element={renderPage(ChangePassword)}
            />

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
