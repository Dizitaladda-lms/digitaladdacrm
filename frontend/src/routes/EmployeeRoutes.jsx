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

const LoadingFallback = () => (
  <div style={{ padding: "40px", textAlign: "center", fontWeight: 600, color: "#64748B" }}>
    Loading Page...
  </div>
);

const EmployeeRoutes = () => {
  const { user } = useAuth();
  const isCounsellor = user?.role === "COUNSELLOR";

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<EmployeeLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="my-attendance" element={<MyAttendance />} />
          <Route path="daily-report" element={<MyDailyReport />} />
          <Route path="performance" element={<MyPerformance />} />
          <Route path="team-reports" element={<TeamReports />} />
          <Route path="sales-report" element={<SalesDepartmentReport />} />
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
