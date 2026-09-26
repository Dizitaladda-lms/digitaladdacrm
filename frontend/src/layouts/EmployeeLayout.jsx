import { useState } from "react";
import { Outlet } from "react-router-dom";
import EmployeeSidebar from "../components/employee/EmployeeSidebar";
import EmployeeTopbar from "../components/employee/EmployeeTopbar";
import EmployeeFooter from "../components/employee/EmployeeFooter";

import "./EmployeeLayout.css";

const EmployeeLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("crm_emp_sidebar_open");
      if (saved !== null) return saved === "true";
      return window.innerWidth > 992;
    }
    return true;
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("crm_emp_sidebar_open", String(next));
      return next;
    });
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    localStorage.setItem("crm_emp_sidebar_open", "false");
  };

  return (
    <div className={`employee-layout ${!sidebarOpen ? "sidebar-collapsed" : ""}`}>
      <EmployeeSidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        onClose={closeSidebar}
      />

      <div className="employee-main">
        <EmployeeTopbar
          isSidebarOpen={sidebarOpen}
          onMenuClick={toggleSidebar}
        />

        <main className="employee-content">
          <Outlet />
        </main>

        <EmployeeFooter />
      </div>
    </div>
  );
};

export default EmployeeLayout;