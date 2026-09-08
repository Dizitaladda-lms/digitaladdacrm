import React from "react";
import "./SearchFilterBar.css";
import { Search, RotateCcw, Filter } from "lucide-react";

const SearchFilterBar = ({
  search = "",
  onSearchChange = () => {},
  status = "ALL",
  onStatusChange = () => {},
  priority = "ALL",
  onPriorityChange = () => {},
  source = "ALL",
  onSourceChange = () => {},
  domain = "ALL",
  onDomainChange = () => {},
  onReset = () => {},
}) => {
  return (
    <div className="search-filter-bar">
      {/* Live Search Input */}
      <div className="search-box">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search by student name, mobile, email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Domain Filter */}
      <select
        value={domain}
        onChange={(e) => onDomainChange(e.target.value)}
        className="filter-select"
      >
        <option value="ALL">All Domains</option>
        <option value="DizitalAdda">DizitalAdda</option>
        <option value="Nidads">Nidads</option>
        <option value="Nigape">Nigape</option>
        <option value="Nihacs">Nihacs</option>
        <option value="HackingVidya">HackingVidya</option>
        <option value="IIDAD">IIDAD</option>
        <option value="Nifase">Nifase</option>
        <option value="DesigningVidya">DesigningVidya</option>
        <option value="LanguageVidya">LanguageVidya</option>
      </select>

      {/* Standardized Status Filter */}
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="filter-select"
      >
        <option value="ALL">All Statuses</option>
        <option value="NEW">New Lead</option>
        <option value="INTERESTED">Interested (High Intent)</option>
        <option value="FOLLOW_UP">Follow-up (Scheduled Callback)</option>
        <option value="VISITED">Visited (Campus Visited)</option>
        <option value="ENROLLED">Enrolled (Admission Confirmed)</option>
        <option value="NOT_INTERESTED">Not Interested (Lost / Dropped)</option>
      </select>

      {/* Priority Filter */}
      <select
        value={priority}
        onChange={(e) => onPriorityChange(e.target.value)}
        className="filter-select"
      >
        <option value="ALL">All Priorities</option>
        <option value="HIGH">High Priority</option>
        <option value="MEDIUM">Medium Priority</option>
        <option value="LOW">Low Priority</option>
      </select>

      {/* Lead Source Filter */}
      <select
        value={source}
        onChange={(e) => onSourceChange(e.target.value)}
        className="filter-select"
      >
        <option value="ALL">All Lead Sources</option>
        <option value="WEBSITE">Website Form</option>
        <option value="META_ADS">Meta / Facebook Ads</option>
        <option value="GOOGLE_ADS">Google Ads</option>
        <option value="WALK_IN">Walk-in Inquiry</option>
        <option value="PHONE_CALL">Phone Inbound</option>
        <option value="OTHER">Other Source</option>
      </select>

      {/* Reset Filter Button */}
      <button type="button" onClick={onReset} className="reset-filter-btn">
        <RotateCcw size={18} />
        <span>Reset Filters</span>
      </button>
    </div>
  );
};

export default SearchFilterBar;