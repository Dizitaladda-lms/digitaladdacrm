import "./WorkspaceTabs.css";

const WorkspaceTabs = ({ tabs, activeTab, onChange }) => (
  <div className="workspace-tabs" role="tablist">
    {tabs.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        id={`workspace-tab-${id}`}
        type="button"
        role="tab"
        aria-selected={activeTab === id}
        aria-controls="workspace-tab-panel"
        className={`workspace-tabs__tab${activeTab === id ? " is-active" : ""}`}
        onClick={() => onChange(id)}
      >
        {Icon && <Icon size={17} />}
        {label}
      </button>
    ))}
  </div>
);

export default WorkspaceTabs;
