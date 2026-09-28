import "../../styles/Dashboard/RecentLeads.css";

import {
  Phone,
  ArrowRight,
  UserRound,
} from "lucide-react";

const statusClasses = {
  INTERESTED: "status-qualified",
  FOLLOW_UP: "status-followup",
  WALK_IN: "status-walkin",
  ENROLLED: "status-admission",
  NOT_INTERESTED: "status-lost",
  NEW: "status-qualified",
  CONTACTED: "status-followup",
  QUALIFIED: "status-qualified",
  ADMISSION: "status-admission",
  ADMISSION_DONE: "status-admission",
  LOST: "status-lost",
};

const statusLabels = {
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow Up",
  WALK_IN: "Walkin",
  ENROLLED: "Enrolled",
  NOT_INTERESTED: "Not Interested",
  NEW: "Interested",
  CONTACTED: "Follow Up",
  QUALIFIED: "Interested",
  ADMISSION: "Enrolled",
  ADMISSION_DONE: "Enrolled",
  LOST: "Not Interested",
};

const sourceClasses = {

  META: "source-meta",

  GOOGLE: "source-google",

  WEBSITE: "source-website",

  REFERRAL: "source-referral",

  WALK_IN: "source-walkin",

};

const RecentLeads = ({
  leads = [],
  loading = false,
}) => {

  if (loading) {

    return (

      <section className="dashboard-panel">

        <div className="panel-header">

          <div>

            <h3>

              Recent Leads

            </h3>

            <p>

              Loading latest enquiries...

            </p>

          </div>

        </div>

        <div className="loading-state">

          Loading...

        </div>

      </section>

    );

  }

  return (

    <section className="dashboard-panel">

      <div className="panel-header">

        <div>

          <h3>

            Recent Leads

          </h3>

          <p>

            Latest enquiries received

          </p>

        </div>

        <button className="view-all-btn">

          View All

          <ArrowRight size={16} />

        </button>

      </div>

      <div className="table-wrapper">

        <table>

          <thead>

            <tr>

              <th>Lead</th>

              <th>Mobile</th>

              <th>Source</th>

              <th>Status</th>

              <th>Date</th>

            </tr>

          </thead>

          <tbody>

            {

              leads.length===0 ?

              (

                <tr>

                  <td
                    colSpan={5}
                    className="empty-row"
                  >

                    No Recent Leads

                  </td>

                </tr>

              )

              :

              (

                leads.map((lead)=>(

                  <tr
                    key={lead.lead_code}
                  >

                    <td>

                      <div className="lead-user">

                        <div className="lead-avatar">

                          <UserRound size={18} />

                        </div>

                        <div>

                          <div className="lead-name">

                            {lead.full_name}

                          </div>

                          <div className="lead-code">

                            {lead.lead_code}

                          </div>

                        </div>

                      </div>

                    </td>

                    <td>

                      <div className="mobile-cell">

                        <Phone size={14} />

                        {lead.mobile}

                      </div>

                    </td>

                    <td>

                      <span
                        className={`badge ${sourceClasses[lead.source]}`}
                      >

                        {lead.source}

                      </span>

                    </td>

                    <td>

                      <span
                        className={`badge ${statusClasses[lead.status] || "status-qualified"}`}
                      >

                        {statusLabels[lead.status] || lead.status}

                      </span>

                    </td>

                    <td>

                      {

                        new Date(

                          lead.created_at

                        ).toLocaleDateString("en-IN")

                      }

                    </td>

                  </tr>

                ))

              )

            }

          </tbody>

        </table>

      </div>

    </section>

  );

};

export default RecentLeads;