import React, { useState, useEffect, useCallback } from "react";
import {
  Phone,
  Radio,
  Building2,
  Edit2,
  Check,
  X,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  PhoneCall,
  Info,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { getTelephonyDomains, updateDomainCallerId, getAllCallLogs } from "../../services/telephonyService";

// ─────────────────────────────────────────────
//  Telephony Settings Panel — Admin Only
// ─────────────────────────────────────────────
const TelephonySettings = () => {
  const [domains, setDomains] = useState([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const [recentCalls, setRecentCalls] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(true);

  const fetchDomains = useCallback(async () => {
    try {
      setLoadingDomains(true);
      const res = await getTelephonyDomains();
      if (res?.success) setDomains(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDomains(false);
    }
  }, []);

  const fetchRecentCalls = useCallback(async () => {
    try {
      setLoadingCalls(true);
      const res = await getAllCallLogs({ limit: 10, page: 1 });
      if (res?.success) setRecentCalls(res.data?.calls || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCalls(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
    fetchRecentCalls();
  }, [fetchDomains, fetchRecentCalls]);

  const startEdit = (domain) => {
    setEditingId(domain.id);
    setEditValue(domain.caller_id || domain.virtual_number || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveCallerId = async (domainId) => {
    const cleaned = editValue.replace(/\D/g, "");
    if (cleaned && cleaned.length !== 10 && cleaned.length !== 11) {
      toast.error("Valid 10 ya 11 digit ka number daalo (e.g. 01140000000 ya 9876543210)");
      return;
    }
    try {
      setSaving(true);
      const res = await updateDomainCallerId(domainId, cleaned || null);
      if (res?.success) {
        toast.success("Caller ID save ho gaya!");
        fetchDomains();
        cancelEdit();
      } else {
        toast.error("Save nahi ho saka");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Error saving caller ID");
    } finally {
      setSaving(false);
    }
  };

  const formatSecs = (s) => {
    const sec = Number(s) || 0;
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: "14px",
          backgroundColor: "#DCFCE7", border: "1px solid #86EFAC",
          borderRadius: "12px", padding: "14px 20px",
        }}
      >
        <div
          style={{
            width: "12px", height: "12px", borderRadius: "50%",
            backgroundColor: "#16A34A",
            boxShadow: "0 0 0 4px rgba(22,163,74,0.25)",
            animation: "pulse 2s infinite", flexShrink: 0,
          }}
        />
        <Radio size={20} style={{ color: "#15803D", flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#14532D" }}>
            Call Recording — ACTIVE
          </div>
          <div style={{ fontSize: "12px", color: "#166534", marginTop: "2px" }}>
            Jis bhi number se call hogi — uski poori recording automatically CRM mein save hogi
          </div>
        </div>
        <ShieldCheck size={22} style={{ color: "#16A34A", marginLeft: "auto" }} />
      </div>

      {/* ── HOW IT WORKS ── */}
      <div
        style={{
          backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE",
          borderRadius: "12px", padding: "16px 20px",
          fontSize: "13px", color: "#1E40AF", lineHeight: "1.8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Info size={16} style={{ color: "#2563EB" }} />
          <strong style={{ fontSize: "14px" }}>Call Recording Kaise Kaam Karta Hai</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
          {[
            ["1️⃣", "Counsellor", "Lead ka profile kholo, \"Start Recorded Call\" click karo"],
            ["2️⃣", "Aapka Phone", "Pehle aapka phone ring karega — utha lo"],
            ["3️⃣", "Student ka Phone", "Phir student ka phone ring karega"],
            ["4️⃣", "Auto Recording", "Dono connect honge + recording CRM mein save hogi"],
          ].map(([num, title, desc]) => (
            <div key={title} style={{ backgroundColor: "#fff", borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "13px", fontWeight: "700" }}>{num} {title}</div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "3px" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DOMAIN CALLER ID CONFIG ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
              <Building2 size={18} style={{ color: "#2563EB" }} />
              Domain-wise Caller ID / Virtual Number
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748B" }}>
              Har domain ka alag virtual number set karo jisse call go out karega (Exotel/MyOperator DID number)
            </p>
          </div>
          <button
            onClick={fetchDomains}
            style={{
              background: "#fff", border: "1px solid #E2E8F0",
              borderRadius: "8px", padding: "7px 12px",
              cursor: "pointer", color: "#64748B", fontSize: "12px",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <RefreshCw size={13} className={loadingDomains ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {loadingDomains ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#64748B" }}>
            <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: "13px" }}>Loading domains...</p>
          </div>
        ) : domains.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px dashed #CBD5E1" }}>
            <AlertCircle size={28} style={{ color: "#94A3B8", margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>Koi domain nahi mila. Pehle Lead Domains section mein domains banao.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {domains.map((domain) => {
              const hasCallerId = Boolean(domain.caller_id || domain.virtual_number);
              const currentId = domain.caller_id || domain.virtual_number || null;
              const isEditing = editingId === domain.id;

              return (
                <div
                  key={domain.id}
                  style={{
                    backgroundColor: "#fff",
                    border: `1px solid ${hasCallerId ? "#BBF7D0" : "#FED7AA"}`,
                    borderRadius: "10px", padding: "14px 18px",
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: "12px", flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "160px" }}>
                    <div
                      style={{
                        width: "36px", height: "36px", borderRadius: "9px",
                        backgroundColor: hasCallerId ? "#DCFCE7" : "#FEF3C7",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Phone size={16} style={{ color: hasCallerId ? "#16A34A" : "#D97706" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>
                        {domain.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                        {hasCallerId ? (
                          <span style={{ color: "#15803D" }}>
                            ✅ Caller ID: <strong>{currentId}</strong>
                          </span>
                        ) : (
                          <span style={{ color: "#D97706" }}>
                            ⚠️ Caller ID set nahi — default use hoga
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit Area */}
                  {isEditing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="e.g. 01140000000"
                        maxLength={11}
                        autoFocus
                        style={{
                          width: "150px", fontSize: "13px",
                          padding: "7px 10px", borderRadius: "7px",
                          border: "1.5px solid #2563EB", outline: "none",
                        }}
                      />
                      <button
                        onClick={() => saveCallerId(domain.id)}
                        disabled={saving}
                        style={{
                          backgroundColor: "#2563EB", color: "#fff",
                          border: "none", borderRadius: "7px",
                          padding: "7px 14px", cursor: "pointer",
                          fontSize: "12px", fontWeight: "600",
                          display: "flex", alignItems: "center", gap: "5px",
                        }}
                      >
                        <Save size={13} /> {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{
                          backgroundColor: "#F1F5F9", color: "#64748B",
                          border: "1px solid #E2E8F0", borderRadius: "7px",
                          padding: "7px 10px", cursor: "pointer", fontSize: "12px",
                          display: "flex", alignItems: "center", gap: "4px",
                        }}
                      >
                        <X size={13} /> Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(domain)}
                      style={{
                        backgroundColor: hasCallerId ? "#F0FDF4" : "#FFFBEB",
                        border: `1px solid ${hasCallerId ? "#86EFAC" : "#FCD34D"}`,
                        borderRadius: "7px", padding: "6px 14px",
                        cursor: "pointer", fontSize: "12px", fontWeight: "600",
                        color: hasCallerId ? "#15803D" : "#B45309",
                        display: "flex", alignItems: "center", gap: "5px",
                      }}
                    >
                      <Edit2 size={12} /> {hasCallerId ? "Change Caller ID" : "Set Caller ID"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RECENT CALL LOGS ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
            <PhoneCall size={18} style={{ color: "#7C3AED" }} />
            Recent Call Logs
          </h3>
          <button
            onClick={fetchRecentCalls}
            style={{
              background: "#fff", border: "1px solid #E2E8F0",
              borderRadius: "8px", padding: "7px 12px",
              cursor: "pointer", color: "#64748B", fontSize: "12px",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <RefreshCw size={13} className={loadingCalls ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {loadingCalls ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#64748B" }}>
            <RefreshCw size={18} className="animate-spin" style={{ margin: "0 auto 6px" }} />
            <p style={{ margin: 0, fontSize: "12px" }}>Loading...</p>
          </div>
        ) : recentCalls.length === 0 ? (
          <div style={{ padding: "28px", textAlign: "center", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px dashed #CBD5E1" }}>
            <PhoneCall size={26} style={{ color: "#94A3B8", margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>Abhi tak koi call nahi hui</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {["Date & Time", "Lead", "Counsellor", "From → To", "Duration", "Status", "Recording"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#64748B", fontWeight: "600", fontSize: "11px", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call, idx) => {
                  const isCompleted = call.status === "COMPLETED";
                  return (
                    <tr
                      key={call.id}
                      style={{ borderBottom: idx < recentCalls.length - 1 ? "1px solid #F1F5F9" : "none", backgroundColor: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}
                    >
                      <td style={{ padding: "10px 12px", color: "#475569", whiteSpace: "nowrap" }}>
                        {new Date(call.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: "600", color: "#0F172A" }}>{call.lead_name || "--"}</div>
                        <div style={{ color: "#94A3B8", fontSize: "11px" }}>{call.lead_code}</div>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>{call.counsellor_name || "--"}</td>
                      <td style={{ padding: "10px 12px", color: "#64748B", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                        {call.counsellor_number || "--"} → {call.lead_number}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: "600", color: "#0F172A" }}>
                        {call.duration ? formatSecs(call.duration) : "--"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "3px",
                            padding: "2px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: "700",
                            backgroundColor: isCompleted ? "#DCFCE7" : call.status === "RINGING" ? "#DBEAFE" : "#FEE2E2",
                            color: isCompleted ? "#15803D" : call.status === "RINGING" ? "#1E40AF" : "#B91C1C",
                          }}
                        >
                          {call.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {call.recording_url ? (
                          <a
                            href={call.recording_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#2563EB", fontSize: "11px", fontWeight: "600", textDecoration: "none" }}
                          >
                            🎧 Play / Download
                          </a>
                        ) : (
                          <span style={{ color: "#CBD5E1", fontSize: "11px" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(22,163,74,0.25); }
          50% { box-shadow: 0 0 0 7px rgba(22,163,74,0.08); }
        }
      `}</style>
    </div>
  );
};

export default TelephonySettings;
