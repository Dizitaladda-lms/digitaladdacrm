import { useState } from "react";
import { ClipboardList, UsersRound } from "lucide-react";
import AttendanceReports from "./AttendanceReports";
import CompanyPresence from "../employee/CompanyPresence";
import WorkspaceTabs from "../../components/common/WorkspaceTabs";
import { useAuth } from "../../context/AuthContext";

const CompanyAttendanceWorkspace = ({ initialTab = "reports" }) => {
  const { user } = useAuth();
  const canViewReports = ["HR", "ADMIN", "MANAGER", "SUPER_ADMIN"].includes(
    String(user?.role || "").toUpperCase()
  );
  const [activeTab, setActiveTab] = useState(
    initialTab === "reports" && !canViewReports ? "presence" : initialTab
  );
  const tabs = [
    ...(canViewReports ? [{ id: "reports", label: "Attendance reports", icon: ClipboardList }] : []),
    { id: "presence", label: "Employee presence", icon: UsersRound },
  ];
  const currentTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : tabs[0].id;

  return (
    <main>
      <header className="workspace-heading">
        <h1>Company Attendance</h1>
        <p>Review attendance reports and see today&apos;s employee presence, leave, and work mode.</p>
      </header>
      <WorkspaceTabs tabs={tabs} activeTab={currentTab} onChange={setActiveTab} />
      <section id="workspace-tab-panel" role="tabpanel" aria-labelledby={`workspace-tab-${currentTab}`}>
        {currentTab === "reports" ? <AttendanceReports /> : <CompanyPresence />}
      </section>
    </main>
  );
};

export default CompanyAttendanceWorkspace;
