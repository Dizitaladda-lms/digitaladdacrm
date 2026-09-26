import logo from "../../../assets/logo/dizitaladda-logo.png";
import { PanelLeftClose } from "lucide-react";

const SidebarHeader = ({ onClose }) => {
  return (
    <div className="sidebar-brand">
      <div className="brand-logo">
        <img
          src={logo}
          alt="DizitalAdda — India's Most Recommended Digital Marketing Institute"
        />
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="sidebar-collapse-btn"
          title="Close sidebar"
          aria-label="Close sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      )}
    </div>
  );
};

export default SidebarHeader;
