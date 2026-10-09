import { useState } from "react";
import { BriefcaseBusiness, CalendarDays } from "lucide-react";
import Employees from "../admin/Employees";
import EmployeesRoster from "./EmployeesRoster";
import WorkspaceTabs from "../../components/common/WorkspaceTabs";

const TABS = [
  { id: "employees", label: "Employees", icon: BriefcaseBusiness },
  { id: "roster", label: "Employee roster", icon: CalendarDays },
];

const EmployeeWorkspace = ({ initialTab = "employees" }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <main>
      <header className="workspace-heading">
        <h1>Employees &amp; Roster</h1>
        <p>Manage the employee directory and monthly rosters from one place.</p>
      </header>
      <WorkspaceTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      <section id="workspace-tab-panel" role="tabpanel" aria-labelledby={`workspace-tab-${activeTab}`}>
        {activeTab === "roster" ? <EmployeesRoster /> : <Employees />}
      </section>
    </main>
  );
};

export default EmployeeWorkspace;
