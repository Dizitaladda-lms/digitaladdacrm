import { useEffect, useState } from "react";
import { BriefcaseBusiness, CalendarDays, FileText } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Employees from "../admin/Employees";
import EmployeesRoster from "./EmployeesRoster";
import EmployeeDocuments from "./EmployeeDocuments";
import WorkspaceTabs from "../../components/common/WorkspaceTabs";
import { useAuth } from "../../context/AuthContext";

const BASE_TABS = [
  { id: "employees", label: "Employees", icon: BriefcaseBusiness },
  { id: "roster", label: "Employee roster", icon: CalendarDays },
];

const EmployeeWorkspace = ({ initialTab = "employees" }) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab);
  const canViewDocuments = ["HR", "SUPER_ADMIN"].includes(user?.role);
  const tabs = canViewDocuments
    ? [...BASE_TABS, { id: "documents", label: "Employee documents", icon: FileText }]
    : BASE_TABS;

  const requestedTab = searchParams.get("tab");
  useEffect(() => {
    if (requestedTab === "documents" && canViewDocuments) setActiveTab("documents");
  }, [requestedTab, canViewDocuments]);

  return (
    <main>
      <header className="workspace-heading">
        <h1>Employees &amp; Roster</h1>
        <p>Manage the employee directory and monthly rosters from one place.</p>
      </header>
      <WorkspaceTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <section id="workspace-tab-panel" role="tabpanel" aria-labelledby={`workspace-tab-${activeTab}`}>
        {activeTab === "documents" && canViewDocuments ? <EmployeeDocuments /> : activeTab === "roster" ? <EmployeesRoster /> : <Employees />}
      </section>
    </main>
  );
};

export default EmployeeWorkspace;
