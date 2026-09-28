import { useCallback, useEffect, useState } from "react";

import "./Dashboard.css";

import DashboardHeader from "../../components/dashboard/DashboardHeader";
import StatsGrid from "../../components/dashboard/StatsGrid";
import RecentLeads from "../../components/dashboard/RecentLeads";
import TodayFollowups from "../../components/dashboard/TodayFollowups";

import DashboardSkeleton from "../../components/Skeleton/DashboardSkeleton";

import {
  getDashboardOverview,
  getLeadAnalytics,
} from "../../services/dashboardService";

const Dashboard = () => {

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [dashboard, setDashboard] = useState({

    summary: {},

    recentLeads: [],

    recentActivities: [],

    upcomingFollowUps: [],

    runningCampaigns: [],

  });

  const [analytics, setAnalytics] = useState({

    new_leads: 0,

    contacted: 0,

    qualified: 0,

    follow_up: 0,

    admissions: 0,

    lost: 0,

    total: 0,

  });

  const loadDashboard = useCallback(async () => {

    try {

      setLoading(true);

      setError("");

      const [

        overviewResponse,

        analyticsResponse,

      ] = await Promise.all([

        getDashboardOverview(),

        getLeadAnalytics(),

      ]);

      console.log(
        "Dashboard Overview",
        overviewResponse
      );

      console.log(
        "Lead Analytics",
        analyticsResponse
      );

      setDashboard({

        summary:
          overviewResponse.data.summary || {},

        recentLeads:
          overviewResponse.data.recentLeads || [],

        recentActivities:
          overviewResponse.data.recentActivities || [],

        upcomingFollowUps:
          overviewResponse.data.upcomingFollowUps || [],

        runningCampaigns:
          overviewResponse.data.runningCampaigns || [],

      });

      setAnalytics(
        analyticsResponse.data || {}
      );

    } catch (err) {

      console.error(err);

      setError(

        err?.response?.data?.message ||

        "Unable to load dashboard."

      );

    } finally {

      setLoading(false);

    }

  }, []);

  useEffect(() => {

    loadDashboard();

  }, [loadDashboard]);

  if (loading) {

    return <DashboardSkeleton />;

  }

  if (error) {

    return (

      <div className="dashboard-error">

        <h2>

          Dashboard Error

        </h2>

        <p>

          {error}

        </p>

        <button onClick={loadDashboard}>

          Retry

        </button>

      </div>

    );

  }

  return (

    <div className="dashboard-page">

      <DashboardHeader

        loading={loading}

        onRefresh={loadDashboard}

      />

      <StatsGrid

        loading={loading}

        summary={dashboard.summary}

      />

      <div className="dashboard-middle">

        <RecentLeads

          loading={loading}

          leads={dashboard.recentLeads}

        />

      </div>

      <TodayFollowups

        loading={loading}

        followups={dashboard.upcomingFollowUps}

      />

      {/*
      Sprint-4

      Charts

      analytics.new_leads

      analytics.contacted

      analytics.qualified

      analytics.follow_up

      analytics.admissions

      analytics.lost

      */}

    </div>

  );

};

export default Dashboard;