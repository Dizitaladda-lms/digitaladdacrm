import { Outlet } from "react-router-dom";
import { useState } from "react";

import Sidebar from "../components/layout/sidebar/Sidebar";
import Topbar from "../components/layout/Topbar/Topbar";
import PageContainer from "../components/PageContainer/PageContainer";
import "./MainLayout.css";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("crm_sidebar_open");
      if (saved !== null) return saved === "true";
      return window.innerWidth > 768;
    }
    return true;
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("crm_sidebar_open", String(next));
      return next;
    });
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    localStorage.setItem("crm_sidebar_open", "false");
  };

  return (
    <div className={`admin-layout ${!sidebarOpen ? "sidebar-collapsed" : ""}`}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        onClose={closeSidebar}
      />

      {/* Main Content */}
      <div className="admin-main">
        {/* Topbar */}
        <Topbar
          isSidebarOpen={sidebarOpen}
          onMenuClick={toggleSidebar}
        />

        {/* Page Content */}
        <div className="admin-content">
          <PageContainer>
            <Outlet />
          </PageContainer>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;