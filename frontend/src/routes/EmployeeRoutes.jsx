import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import EmployeeLayout from "../layouts/EmployeeLayout";
import UnderMaintenance from "../components/common/UnderMaintenance";
import { useAuth } from "../context/AuthContext";

const MyAttendance = lazy(() => import("../pages/employee/MyAttendance"));

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
          {/* Default employee landing page is Mobile Biometric Attendance */}
          <Route index element={<Navigate to="my-attendance" replace />} />
          <Route path="my-attendance" element={<MyAttendance />} />

          {/* Under Maintenance Modules */}
          <Route path="dashboard" element={<UnderMaintenance moduleName="Employee Dashboard" />} />
          <Route path="daily-report" element={<UnderMaintenance moduleName="Daily Work Report" />} />
          <Route path="performance" element={<UnderMaintenance moduleName="My Performance" />} />
          <Route path="team-reports" element={<UnderMaintenance moduleName="Team Reports" />} />
          <Route
            path="sales-report"
            element={
              isCounsellor ? (
                <Navigate to="/employee/my-attendance" replace />
              ) : (
                <UnderMaintenance moduleName="Sales Department Overview" />
              )
            }
          />
          <Route path="profile" element={<UnderMaintenance moduleName="Employee Profile" />} />
          <Route path="settings" element={<UnderMaintenance moduleName="Employee Settings" />} />
          <Route path="leads" element={<UnderMaintenance moduleName="My Leads" />} />
          <Route path="leads/:id" element={<UnderMaintenance moduleName="Lead Details" />} />
          <Route path="followups" element={<UnderMaintenance moduleName="My Follow-ups" />} />
          <Route path="admissions" element={<UnderMaintenance moduleName="My Admissions" />} />
          <Route path="*" element={<Navigate to="/employee/my-attendance" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default EmployeeRoutes;
