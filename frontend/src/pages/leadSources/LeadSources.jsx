import {
  Globe2,
  LoaderCircle,
  MessageCircle,
  Plus,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { createLeadSource, fetchLeadSources } from "../../services/leadSourceService";
import "./leadSources.css";

const LeadSources = () => {
  const [sources, setSources] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchLeadSources();
      setSources(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || "Could not load lead sources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addSource = async (event) => {
    event.preventDefault();
    if (!newName.trim()) return;
    try {
      await createLeadSource({ name: newName.trim() });
      setNewName("");
      toast.success("Lead source created.");
      await load();
    } catch (error) {
      toast.error(error.message || "Could not create lead source.");
    }
  };

  const visibleSources = useMemo(
    () =>
      sources.filter((source) =>
        `${source.name} ${source.description || ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [sources, query]
  );

  return (
    <section className="source-workspace">
      {/* Page Header */}
      <header className="source-header">
        <div>
          <span className="source-badge">Lead Capture & Routing</span>
          <h1 className="source-title">Lead Sources</h1>
          <p className="source-subtitle">
            Configure every channel that delivers student enquiries into your pipeline (Meta, Google, WhatsApp, Website, etc.)
          </p>
        </div>
      </header>

      {/* 3 Metric Summary Cards */}
      <div className="source-summary">
        <article className="source-summary-card">
          <div className="source-summary-icon blue">
            <Share2 size={20} />
          </div>
          <div>
            <span className="source-summary-label">Active Sources</span>
            <strong className="source-summary-value">
              {loading ? "—" : sources.filter((s) => s.is_active).length.toLocaleString("en-IN")}
            </strong>
          </div>
        </article>

        <article className="source-summary-card">
          <div className="source-summary-icon purple">
            <Globe2 size={20} />
          </div>
          <div>
            <span className="source-summary-label">Total Channels</span>
            <strong className="source-summary-value">
              {loading ? "—" : sources.length.toLocaleString("en-IN")}
            </strong>
          </div>
        </article>

        <article className="source-summary-card">
          <div className="source-summary-icon green">
            <Sparkles size={20} />
          </div>
          <div>
            <span className="source-summary-label">Auto Routing</span>
            <strong className="source-summary-value" style={{ fontSize: "20px", color: "#16A34A" }}>
              Ready & Active
            </strong>
          </div>
        </article>
      </div>

      {/* Panel / Table */}
      <div className="source-panel">
        <div className="source-toolbar">
          <div className="source-search-wrap">
            <Search size={16} className="source-search-icon" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sources..."
              className="source-search-input"
            />
          </div>

          <form onSubmit={addSource} className="source-add-form">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New channel name (e.g. LinkedIn Ads)..."
              className="source-add-input"
            />
            <button type="submit" className="source-add-btn">
              <Plus size={15} />
              <span>Add Channel</span>
            </button>
          </form>
        </div>

        {loading ? (
          <div className="source-empty">
            <LoaderCircle className="spin" size={24} />
            <p>Loading channel directory...</p>
          </div>
        ) : visibleSources.length ? (
          <div className="source-list">
            {visibleSources.map((source) => (
              <article key={source.id} className="source-row">
                <div className="source-icon">
                  <Globe2 size={18} />
                </div>
                <div className="source-title">
                  <strong>{source.name}</strong>
                  <span>{source.description || "Active lead acquisition channel"}</span>
                </div>
                <div>
                  <span className={`source-status ${source.is_active ? "active" : "inactive"}`}>
                    {source.is_active ? "Active Channel" : "Inactive"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="source-empty">
            <p>No lead sources match your filter.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default LeadSources;
