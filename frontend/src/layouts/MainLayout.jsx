import { Outlet } from "react-router-dom";
import { useState } from "react";

import Sidebar from "../components/layout/sidebar/Sidebar";
import Topbar from "../components/layout/Topbar/Topbar";
import PageContainer from "../components/PageContainer/PageContainer";
import "./MainLayout.css";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="admin-main">
        {/* Topbar */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

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