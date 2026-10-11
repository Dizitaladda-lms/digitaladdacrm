import { useMemo, useState } from "react";
import { Download, Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import "./WorkspacePage.css";

const toneFor = (value = "") => {
  const key = String(value).toLowerCase();
  if (key.includes("active") || key.includes("completed") || key.includes("enrolled") || key.includes("paid")) return "success";
  if (key.includes("pending") || key.includes("follow") || key.includes("new")) return "warning";
  if (key.includes("lost") || key.includes("inactive") || key.includes("overdue")) return "danger";
  return "neutral";
};

const WorkspacePage = ({
  eyebrow = "CRM workspace",
  title,
  description,
  stats = [],
  columns = [],
  rows = [],
  primaryLabel = "Add new",
  secondaryLabel = "Export",
  tabs = [],
  children,
}) => {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState(tabs[0] || "All");

  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesQuery = Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase());
    const matchesTab = activeTab === "All" || !tabs.length || Object.values(row).join(" ").toLowerCase().includes(activeTab.toLowerCase());
    return matchesQuery && matchesTab;
  }), [activeTab, query, rows, tabs.length]);

  return (
    <section className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="workspace-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="workspace-description">{description}</p>
        </div>
        <div className="workspace-actions">
          <button className="workspace-button workspace-button-secondary" type="button"><Download size={17} /> {secondaryLabel}</button>
          <button className="workspace-button workspace-button-primary" type="button"><Plus size={18} /> {primaryLabel}</button>
        </div>
      </header>

      {stats.length > 0 && <div className="workspace-stats">
        {stats.map((stat, idx) => {
          const targetTab = stat.filterTab || (idx === 0 ? (tabs[0] || "All") : tabs.find((t) => stat.label.toLowerCase().includes(t.toLowerCase())) || tabs[idx] || "All");
          const isActive = activeTab === targetTab;
          return (
            <article
              className="workspace-stat"
              key={stat.label}
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab((prev) => (prev === targetTab && targetTab !== (tabs[0] || "All") ? (tabs[0] || "All") : targetTab))}
              style={{
                cursor: "pointer",
                border: isActive ? "2px solid #2563eb" : undefined,
              }}
            >
              <div className={`workspace-stat-icon ${stat.tone || "blue"}`}>{stat.icon}</div>
              <div><p>{stat.label}</p><strong>{stat.value}</strong><small>{stat.helper}</small></div>
            </article>
          );
        })}
      </div>}

      {children}

      <div className="workspace-panel">
        {tabs.length > 0 && <div className="workspace-tabs">
          {tabs.map((tab) => <button type="button" key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}
        </div>}
        <div className="workspace-toolbar">
          <label className="workspace-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} /></label>
          <button type="button" className="workspace-filter"><Filter size={17} /> Filters</button>
          <button type="button" className="workspace-filter icon-only" aria-label="Customize view"><SlidersHorizontal size={17} /></button>
        </div>
        <div className="workspace-table-wrap">
          <table className="workspace-table">
            <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
            <tbody>{filteredRows.map((row, index) => <tr key={row.id || index}>{columns.map((column) => {
              const value = row[column.key];
              return <td key={column.key}>{column.badge ? <span className={`workspace-badge ${toneFor(value)}`}>{value}</span> : column.highlight ? <strong>{value}</strong> : value}</td>;
            })}</tr>)}</tbody>
          </table>
          {filteredRows.length === 0 && <div className="workspace-empty">No matching records found. Backend data will appear here when connected.</div>}
        </div>
        <footer className="workspace-table-footer"><span>Showing {filteredRows.length} of {rows.length} records</span><div><button type="button">Previous</button><button type="button" className="current">1</button><button type="button">Next</button></div></footer>
      </div>
    </section>
  );
};

export default WorkspacePage;
