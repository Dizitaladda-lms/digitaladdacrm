import "../../styles/LeadManagement/BulkActionBar.css";

import {
  UserCheck,
  Download,
  Trash2,
  X,
  MessageCircle,
} from "lucide-react";

const BulkActionBar = ({
  selectedLeads = [],
  onWhatsApp,
  onAssign,
  onExport,
  onDelete,
  onClear,
}) => {
  if (selectedLeads.length === 0) {
    return null;
  }

  return (
    <section className="bulk-action-bar">
      <div className="bulk-left">
        <span className="selected-count">{selectedLeads.length}</span>

        <div>
          <h4>Leads Selected</h4>
          <p>Choose an action for selected leads.</p>
        </div>
      </div>

      <div className="bulk-actions">
        {onWhatsApp && (
          <button
            className="whatsapp-btn"
            onClick={onWhatsApp}
            title="Send Bulk WhatsApp message with template & graphics"
          >
            <MessageCircle size={18} />
            Bulk WhatsApp
          </button>
        )}

        <button className="assign-btn" onClick={onAssign}>
          <UserCheck size={18} />
          Assign Selected
        </button>

        <button className="export-btn" onClick={onExport}>
          <Download size={18} />
          Export
        </button>

        <button className="delete-btn" onClick={onDelete}>
          <Trash2 size={18} />
          Delete
        </button>

        <button className="clear-btn" onClick={onClear}>
          <X size={18} />
          Clear
        </button>
      </div>
    </section>
  );
};

export default BulkActionBar;