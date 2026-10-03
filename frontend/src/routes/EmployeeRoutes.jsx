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
const SalesDepartmentReport = lazy(() => import("../pages/hr/SalesDepartmentReport"));
const MyAssignedWork = lazy(() => import("../pages/employee/MyAssignedWork"));

const LoadingFallback = () => (
  <div style={{ padding: "40px", textAlign: "center", fontWeight: 600, color: "#64748B" }}>
    Loading Page...
  </div>
);

const EmployeeRoutes = () => {
  const { user } = useAuth();
  const role = user?.role || "";
  const isCounsellor = role === "COUNSELLOR";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isHR = role === "HR";
  const isHead = Boolean(user?.is_department_head || user?.is_head || role === "MANAGER" || role === "TL" || (user?.designation && /head|manager|team lead/i.test(user.designation)));
  const canSeeSalesReport = isSuperAdmin || isHR || isHead;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<EmployeeLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="my-attendance" element={<MyAttendance />} />
          <Route path="daily-report" element={<MyDailyReport />} />
          <Route path="assigned-work" element={<MyAssignedWork />} />
          <Route path="performance" element={<MyPerformance />} />
          <Route path="team-reports" element={<TeamReports />} />
          
          {/* Sales Report restricted to HR, Super Admin & Department Heads/TLs */}
          <Route
            path="sales-report"
            element={
              canSeeSalesReport ? (
                <SalesDepartmentReport />
              ) : (
                <Navigate to="/employee/dashboard" replace />
              )
            }
          />

          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />

          {/* Sales Only Routes (Counsellors only) */}
          {isCounsellor ? (
            <>
              <Route path="leads" element={<MyLeads />} />
              <Route path="leads/:id" element={<LeadDetails />} />
              <Route path="followups" element={<MyFollowups />} />
              <Route path="admissions" element={<MyAdmissions />} />
            </>
          ) : (
            <>
              <Route path="leads/*" element={<Navigate to="/employee/dashboard" replace />} />
              <Route path="followups" element={<Navigate to="/employee/dashboard" replace />} />
              <Route path="admissions" element={<Navigate to="/employee/dashboard" replace />} />
            </>
          )}
        </Route>
      </Routes>
    </Suspense>
  );
};

export default EmployeeRoutes;
