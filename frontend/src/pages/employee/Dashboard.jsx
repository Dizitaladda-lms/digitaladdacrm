import "./Dashboard.css";
import DashboardHeader from "../../components/employee/dashboard/DashboardHeader";
import SummaryCards from "../../components/employee/dashboard/SummaryCards";
import RecentLeadsTable from "../../components/employee/dashboard/RecentLeadsTable";
import TodayFollowups from "../../components/employee/dashboard/TodayFollowups";
import LeadStatusChart from "../../components/employee/dashboard/LeadStatusChart";
import AcademicOperationsDashboard from "../../components/employee/dashboard/AcademicOperationsDashboard";
import useEmployeeDashboard from "../../hooks/useEmployeeDashboard";
import { useAuth } from "../../context/AuthContext";

const CounsellorSalesDashboard = () => {
  const { dashboard } = useEmployeeDashboard();

  return (
    <div className="employee-dashboard">
      <DashboardHeader />
      <SummaryCards summary={dashboard.summary} />
      <div className="dashboard-main-grid">
        <div className="dashboard-left">
          <RecentLeadsTable leads={dashboard.recentLeads} />
          <TodayFollowups followUps={dashboard.todayFollowUps} />
        </div>
        <div className="dashboard-right">
          <LeadStatusChart data={dashboard.leadStatus} />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const isCounsellor = user?.role === "COUNSELLOR";

  if (!isCounsellor) {
    return <AcademicOperationsDashboard />;
  }

  return <CounsellorSalesDashboard />;
};

export default Dashboard;