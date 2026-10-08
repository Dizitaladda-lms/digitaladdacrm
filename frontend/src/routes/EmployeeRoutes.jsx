import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import EmployeeLayout from "../layouts/EmployeeLayout";
import { useAuth } from "../context/AuthContext";

const Dashboard = lazy(() => import("../pages/employee/Dashboard"));
const MyLeads = lazy(() => import("../pages/employee/MyLeads"));
const LeadDetails = lazy(() => import("../pages/employee/LeadDetails"));
const MyFollowups = lazy(() => import("../pages/employee/MyFollowups"));
const MyAdmissions = lazy(() => import("../pages/employee/MyAdmissions"));
const Profile = lazy(() => import("../pages/employee/Profile"));
const Settings = lazy(() => import("../pages/employee/Settings"));
const MyDailyReport = lazy(() => import("../pages/employee/MyDailyReport"));
const TeamReports = lazy(() => import("../pages/employee/TeamReports"));
const MyPerformance = lazy(() => import("../pages/employee/MyPerformance"));
const MyAttendance = lazy(() => import("../pages/employee/MyAttendance"));
const CompanyPresence = lazy(() => import("../pages/employee/CompanyPresence"));
const SalesDepartmentReport = lazy(() => import("../pages/hr/SalesDepartmentReport"));
const MyAssignedWork = lazy(() => import("../pages/employee/MyAssignedWork"));
const MyRoster = lazy(() => import("../pages/employee/MyRoster"));
const TeamChat = lazy(() => import("../pages/chat/TeamChat"));
const ReadOnlyLeadOverview = lazy(() => import("../pages/employee/ReadOnlyLeadOverview"));

import UnderMaintenance from "../pages/UnderMaintenance";
import { IS_MAINTENANCE_MODE } from "../config/maintenanceConfig";

const LoadingFallback = () => (
  <div style={{ padding: "40px", textAlign: "center", fontWeight: 600, color: "#64748B" }}>
    Loading Page...
  </div>
);

const renderEmpPage = (Component) => {
  if (IS_MAINTENANCE_MODE) return <UnderMaintenance />;
  return <Component />;
};

const EmployeeRoutes = () => {
  const { user } = useAuth();
  const role = user?.role || "";
  const isCounsellor = role === "COUNSELLOR";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isHR = role === "HR";
  const canSeeSalesReport = isSuperAdmin || isHR;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<EmployeeLayout />}>
          <Route index element={<Navigate to={IS_MAINTENANCE_MODE ? "my-attendance" : "dashboard"} replace />} />
          <Route path="dashboard" element={renderEmpPage(Dashboard)} />
          
          {/* Active Attendance & Monthly Roster Routes */}
          <Route path="my-attendance" element={<MyAttendance />} />
          <Route path="company-presence" element={<CompanyPresence />} />
          <Route path="roster" element={<MyRoster />} />
          <Route path="my-roster" element={<MyRoster />} />

          <Route path="daily-report" element={renderEmpPage(MyDailyReport)} />
          <Route path="assigned-work" element={renderEmpPage(MyAssignedWork)} />
          <Route path="performance" element={renderEmpPage(MyPerformance)} />
          <Route path="team-reports" element={renderEmpPage(TeamReports)} />
          <Route path="team-chat" element={renderEmpPage(TeamChat)} />
          <Route path="chat" element={renderEmpPage(TeamChat)} />
          
          {/* Sales Report */}
          <Route
            path="sales-report"
            element={
              IS_MAINTENANCE_MODE ? (
                <UnderMaintenance />
              ) : canSeeSalesReport ? (
                <SalesDepartmentReport />
              ) : (
                <Navigate to="/employee/dashboard" replace />
              )
            }
          />

          <Route path="profile" element={renderEmpPage(Profile)} />
          <Route path="settings" element={renderEmpPage(Settings)} />

          <Route
            path="lead-overview"
            element={
              user?.lead_overview_read_only
                ? renderEmpPage(ReadOnlyLeadOverview)
                : <Navigate to="/employee/dashboard" replace />
            }
          />

          {/* Sales Only Routes */}
          <Route
            path="leads"
            element={
              user?.lead_overview_read_only
                ? <Navigate to="/employee/lead-overview" replace />
                : renderEmpPage(MyLeads)
            }
          />
          <Route
            path="leads/:id"
            element={
              user?.lead_overview_read_only
                ? <Navigate to="/employee/lead-overview" replace />
                : renderEmpPage(LeadDetails)
            }
          />
          <Route path="followups" element={renderEmpPage(MyFollowups)} />
          <Route path="admissions" element={renderEmpPage(MyAdmissions)} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default EmployeeRoutes;
