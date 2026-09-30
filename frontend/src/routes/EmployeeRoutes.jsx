import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import EmployeeLayout from "../layouts/EmployeeLayout";

const Dashboard = lazy(() => import("../pages/employee/Dashboard"));
const MyLeads = lazy(() => import("../pages/employee/MyLeads"));
const LeadDetails = lazy(() => import("../pages/employee/LeadDetails"));
const MyFollowups = lazy(() => import("../pages/employee/MyFollowups"));
const MyAdmissions = lazy(() => import("../pages/employee/MyAdmissions"));
const Profile = lazy(() => import("../pages/employee/Profile"));
const Settings = lazy(() => import("../pages/employee/Settings"));
const MyDailyReport = lazy(() => import("../pages/employee/MyDailyReport"));
const TeamReports = lazy(() => import("../pages/employee/TeamReports"));

const LoadingFallback = () => (
  <div style={{ padding: "40px", textAlign: "center", fontWeight: 600, color: "#64748B" }}>
    Loading Page...
  </div>
);

const EmployeeRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<EmployeeLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leads" element={<MyLeads />} />
          <Route path="leads/:id" element={<LeadDetails />} />
          <Route path="followups" element={<MyFollowups />} />
          <Route path="admissions" element={<MyAdmissions />} />
          <Route path="daily-report" element={<MyDailyReport />} />
          <Route path="team-reports" element={<TeamReports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default EmployeeRoutes;
