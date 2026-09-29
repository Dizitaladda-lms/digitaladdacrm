import "../../styles/LeadManagement/LeadFilters.css";

import {
  Search,
  RotateCcw,
  Filter,
  Calendar,
} from "lucide-react";

const LeadFilters = ({
  filters,
  onChange,
  onReset,
}) => {

  return (

    <section className="lead-filters">

      <div className="lead-filter-header">

        <div>

          <h3>

            Smart Filters

          </h3>

          <p>

            Filter leads by date range, status, source, campaign, course and counsellor.

          </p>

        </div>

        <div className="filter-icon">

          <Filter size={18}/>

        </div>

      </div>

      <div className="lead-filter-grid">

        {/* Search */}

        <div className="filter-group filter-search">

          <label>

            Search

          </label>

          <div className="search-box">

            <Search size={16}/>

            <input

              type="text"

              placeholder="Search by name, phone or email..."

              value={filters.search}

              onChange={(e)=>

                onChange(

                  "search",

                  e.target.value

                )

              }

            />

          </div>

        </div>

        {/* From Date */}
        <div className="filter-group">
          <label>From Date</label>
          <div className="date-input-wrap">
            <Calendar size={15} className="date-icon" />
            <input
              type="date"
              className="filter-date-input"
              value={filters.date_from || ""}
              onChange={(e) => onChange("date_from", e.target.value)}
            />
          </div>
        </div>

        {/* To Date */}
        <div className="filter-group">
          <label>To Date</label>
          <div className="date-input-wrap">
            <Calendar size={15} className="date-icon" />
            <input
              type="date"
              className="filter-date-input"
              min={filters.date_from || undefined}
              value={filters.date_to || ""}
              onChange={(e) => onChange("date_to", e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">

          <label>

            Status

          </label>

          <select

            value={filters.status}

            onChange={(e)=>

              onChange(

                "status",

                e.target.value

              )

            }

          >

            <option value="">
              All Statuses
            </option>
            <option value="INTERESTED">
              Interested
            </option>
            <option value="FOLLOW_UP">
              Follow Up
            </option>
            <option value="WALK_IN">
              Walkin
            </option>
            <option value="ENROLLED">
              Enrolled
            </option>
            <option value="NOT_INTERESTED">
              Not Interested
            </option>

          </select>

        </div>

        {/* Source */}

        <div className="filter-group">

          <label>

            Source

          </label>

          <select

            value={filters.source}

            onChange={(e)=>

              onChange(

                "source",

                e.target.value

              )

            }

          >

            <option value="">

              All

            </option>

            <option value="META">

              Meta Ads

            </option>

            <option value="GOOGLE">

              Google Ads

            </option>

            <option value="WEBSITE">

              Website

            </option>

            <option value="REFERRAL">

              Referral / Reference

            </option>

            <option value="WHATSAPP">

              WhatsApp

            </option>

            <option value="WALK_IN">

              Walk In

            </option>

            <option value="CALL">

              Direct Call

            </option>

            <option value="MANUAL">

              Manual Entry

            </option>

          </select>

        </div>

        {/* Domain */}

        <div className="filter-group">

          <label>

            Domain

          </label>

          <select

            value={filters.domain || ""}

            onChange={(e) =>

              onChange(

                "domain",

                e.target.value

              )

            }

          >

            <option value="">

              All Domains

            </option>

            <option value="DizitalAdda">

              DizitalAdda

            </option>

            <option value="Nidads">

              Nidads

            </option>

            <option value="Nigape">

              Nigape

            </option>

            <option value="Nihacs">

              Nihacs

            </option>

            <option value="HackingVidya">

              HackingVidya

            </option>

            <option value="IIDAD">

              IIDAD

            </option>

            <option value="Nifase">

              Nifase

            </option>

            <option value="DesigningVidya">

              DesigningVidya

            </option>

            <option value="LanguageVidya">

              LanguageVidya

            </option>

          </select>

        </div>

        {/* Campaign */}

        <div className="filter-group">

          <label>

            Campaign

          </label>

          <select>

            <option>

              All Campaigns

            </option>

          </select>

        </div>

        {/* Course */}

        <div className="filter-group">

          <label>

            Course

          </label>

          <select>

            <option>

              All Courses

            </option>

          </select>

        </div>

        {/* Counsellor */}

        <div className="filter-group">

          <label>

            Counsellor

          </label>

          <select>

            <option>

              All Counsellors

            </option>

          </select>

        </div>

      </div>

      <div className="lead-filter-footer">

        <button

          className="reset-btn"

          onClick={onReset}

        >

          <RotateCcw size={17}/>

          Reset Filters

        </button>

      </div>

    </section>

  );

};

export default LeadFilters;
