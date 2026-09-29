import { Plus, RefreshCw } from "lucide-react";

const CampaignHeader = ({
  loading = false,
  onRefresh,
  onAdd,
}) => {
  return (
    <div className="campaign-header">
      <div className="campaign-title">
        <h1>Campaign Management</h1>
        <p>
          Track and optimize performance across Meta, Google, Website, and lead channels.
        </p>
      </div>

      <div className="campaign-header-actions">
        <button
          className="campaign-btn campaign-btn-outline"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          <span>Refresh</span>
        </button>

        <button
          className="campaign-btn campaign-btn-primary"
          onClick={onAdd}
        >
          <Plus size={16} />
          <span>Add Campaign</span>
        </button>
      </div>
    </div>
  );
};

export default CampaignHeader;