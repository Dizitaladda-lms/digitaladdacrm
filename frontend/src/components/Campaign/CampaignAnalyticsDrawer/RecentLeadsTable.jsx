import "./RecentLeadsTable.css";

const STATUS_CLASS = {
  INTERESTED: "status-qualified",
  FOLLOW_UP: "status-followup",
  WALK_IN: "status-walkin",
  ENROLLED: "status-admission",
  NOT_INTERESTED: "status-rejected",
  NEW: "status-qualified",
  CONTACTED: "status-followup",
  QUALIFIED: "status-qualified",
  ADMISSION: "status-admission",
  REJECTED: "status-rejected",
};

const STATUS_LABELS = {
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow Up",
  WALK_IN: "Walkin",
  ENROLLED: "Enrolled",
  NOT_INTERESTED: "Not Interested",
  NEW: "Interested",
  CONTACTED: "Follow Up",
  QUALIFIED: "Interested",
  ADMISSION: "Enrolled",
  REJECTED: "Not Interested",
};

const RecentLeadsTable = ({ data = [] }) => {

  if (!data.length) {
    return (
      <div className="analytics-card">

        <div className="analytics-card-header">

          <h3>Recent Leads</h3>

          <p>No recent leads found.</p>

        </div>

      </div>
    );
  }

  return (

    <div className="analytics-card">

      <div className="analytics-card-header">

        <h3>Recent Leads</h3>

        <p>Latest leads received from this campaign</p>

      </div>

      <div className="recent-table-wrapper">

        <table className="recent-table">

          <thead>

            <tr>

              <th>Lead Code</th>

              <th>Student</th>

              <th>Source</th>

              <th>City</th>

              <th>Status</th>

              <th>Date</th>

            </tr>

          </thead>

          <tbody>

            {data.map((lead) => (

              <tr key={lead.id}>

                <td>{lead.lead_code}</td>

                <td>{lead.student_name}</td>

                <td>{lead.source}</td>

                <td>{lead.city || "--"}</td>

                <td>

                  <span
                    className={`lead-status ${
                      STATUS_CLASS[
                        lead.status
                      ] || ""
                    }`}
                  >

                    {STATUS_LABELS[lead.status] || lead.status}

                  </span>

                </td>

                <td>

                  {new Date(
                    lead.created_at
                  ).toLocaleDateString(
                    "en-IN"
                  )}

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

};

export default RecentLeadsTable;