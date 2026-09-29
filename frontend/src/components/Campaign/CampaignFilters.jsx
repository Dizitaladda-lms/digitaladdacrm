import { Search, RotateCcw } from "lucide-react";

const CampaignFilters = ({
  filters,
  onChange,
  onReset,
}) => {
  return (
    <div className="campaign-filter-card">
      {/* Search Input with Icon */}
      <div className="campaign-search-wrap">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search by campaign name or code..."
          value={filters.search}
          onChange={(e) => onChange("search", e.target.value)}
        />
      </div>

      <div className="campaign-filter-selects">
        {/* Platform Filter */}
        <select
          value={filters.platform}
          onChange={(e) => onChange("platform", e.target.value)}
          className="campaign-select"
        >
          <option value="">All Platforms</option>
          <option value="META">Meta Ads</option>
          <option value="GOOGLE">Google Ads</option>
          <option value="WEBSITE">Website</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="REFERRAL">Referral</option>
          <option value="WALK_IN">Walk-In</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => onChange("status", e.target.value)}
          className="campaign-select"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
        </select>

        {/* Reset Filter Button */}
        <button
          type="button"
          className="campaign-reset-btn"
          onClick={onReset}
          title="Reset filters"
        >
          <RotateCcw size={15} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};

export default CampaignFilters;