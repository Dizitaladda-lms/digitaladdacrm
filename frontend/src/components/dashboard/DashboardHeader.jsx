import "../../styles/Dashboard/DashboardHeader.css";

const DashboardHeader = ({
  loading,
  onRefresh,
}) => {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (

    <section className="dashboard-header">

      <div className="dashboard-header-left">

        <span className="dashboard-badge">

          Dashboard

        </span>

        <h1>

          Welcome back, Admin 👋

        </h1>

        <p>

          Monitor leads, admissions, students and employees from one place.

        </p>

      </div>

      <div className="dashboard-header-right">

        <div className="today-card">

          <div className="today-icon">

            📅

          </div>

          <div>

            <span className="today-label">

              TODAY

            </span>

            <h4>

              {today}

            </h4>

          </div>

        </div>

        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={loading}
        >

          {loading ? "Refreshing..." : "Refresh"}
        </button>

      </div>

    </section>

  );

};

export default DashboardHeader;