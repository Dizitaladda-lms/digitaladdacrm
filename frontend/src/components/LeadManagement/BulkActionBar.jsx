import "../../styles/LeadManagement/BulkActionBar.css";

import {
  UserCheck,
  Download,
  Trash2,
  X,
  MessageCircle,
  Mail,
  Smartphone,
} from "lucide-react";

const BulkActionBar = ({
  selectedLeads = [],
  onWhatsApp,
  onEmail,
  onSMS,
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
          <p>Broadcast messages or assign selected leads.</p>
        </div>
      </div>

      <div className="bulk-actions">
        {onWhatsApp && (
          <button
            className="whatsapp-btn"
            onClick={onWhatsApp}
            title="Send Bulk WhatsApp message with template & graphics"
          >
            <MessageCircle size={16} />
            Bulk WhatsApp
          </button>
        )}

        {onEmail && (
          <button
            className="email-btn"
            onClick={onEmail}
            title="Send Bulk Email campaign with templates & graphics"
          >
            <Mail size={16} />
            Bulk Email
          </button>
        )}

        {onSMS && (
          <button
            className="sms-btn"
            onClick={onSMS}
            title="Send Bulk SMS text blast to selected leads"
          >
            <Smartphone size={16} />
            Bulk SMS
          </button>
        )}

        <button className="assign-btn" onClick={onAssign}>
          <UserCheck size={16} />
          Assign
        </button>

        <button className="export-btn" onClick={onExport}>
          <Download size={16} />
          Export
        </button>

        <button className="delete-btn" onClick={onDelete}>
          <Trash2 size={16} />
          Delete
        </button>

        <button className="clear-btn" onClick={onClear}>
          <X size={16} />
          Clear
        </button>
      </div>
    </section>
  );
};

export default BulkActionBar;