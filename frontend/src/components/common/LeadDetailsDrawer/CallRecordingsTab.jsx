import React, { useState, useEffect, useCallback } from "react";
import {
  PhoneCall,
  Download,
  Clock,
  AlertCircle,
  RefreshCw,
  PhoneForwarded,
  CheckCircle2,
  XCircle,
  Sparkles,
  Edit2,
  Check,
  Radio,
  ShieldCheck,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import {
  initiateCall,
  getLeadCallLogs,
  simulateMockComplete,
} from "../../../services/telephonyService";
import "./LeadDetailsDrawer.css";

const CallRecordingsTab = ({ lead, role = "counsellor" }) => {
  const { user } = useAuth();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [counsellorMobile, setCounsellorMobile] = useState(() => {
    return localStorage.getItem("counsellor_call_phone") || user?.mobile || "";
  });
  const [editingPhone, setEditingPhone] = useState(false);

  const fetchCalls = useCallback(async () => {
    if (!lead?.id) return;
    try {
      setLoading(true);
      const res = await getLeadCallLogs(lead.id);
      if (res?.success) {
        setCalls(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load call logs:", err);
    } finally {
      setLoading(false);
    }
  }, [lead?.id]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const handleStartCall = async () => {
    if (!lead?.mobile) {
      toast.error("Lead does not have a valid mobile number.");
      return;
    }
    if (!counsellorMobile || counsellorMobile.length !== 10) {
      toast.error("Pehle apna 10-digit receiving mobile number set karein.");
      setEditingPhone(true);
      return;
    }

    try {
      setCalling(true);
      const res = await initiateCall(lead.id, counsellorMobile.trim());
      if (res?.success) {
        toast.success(
          res.message || "Call shuru ho rahi hai! Aapka phone abhi ring karega.",
          { duration: 5000 }
        );
        setTimeout(fetchCalls, 2000);
      } else {
        toast.error(res?.message || "Call initiate nahi ho saki");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Call mein error aaya";
      toast.error(msg);
    } finally {
      setCalling(false);
    }
  };

  const handleSimulateComplete = async (callId) => {
    try {
      setSimulating(true);
      const res = await simulateMockComplete(callId);
      if (res?.success) {
        toast.success("Sample recording generate ho gayi! 🎧");
        fetchCalls();
      }
    } catch (err) {
      toast.error("Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  const formatSecs = (seconds) => {
    const s = Number(seconds) || 0;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m === 0) return `${rem}s`;
    return `${m}m ${rem}s`;
  };

  const totalCalls = calls.length;
  const completedCalls = calls.filter((c) => c.status === "COMPLETED").length;
  const totalDuration = calls.reduce((sum, c) => sum + (Number(c.duration) || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* ─── RECORDING ACTIVE BANNER ─────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backgroundColor: "#DCFCE7",
          border: "1px solid #86EFAC",
          borderRadius: "10px",
          padding: "10px 16px",
        }}
      >
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: "#16A34A",
            boxShadow: "0 0 0 3px rgba(22,163,74,0.25)",
            animation: "pulse 2s infinite",
            flexShrink: 0,
          }}
        />
        <Radio size={16} style={{ color: "#15803D", flexShrink: 0 }} />
        <span style={{ fontSize: "13px", fontWeight: "700", color: "#14532D" }}>
          Call Recording ACTIVE
        </span>
        <span style={{ fontSize: "12px", color: "#166534", marginLeft: "4px" }}>
          — Aapke number se jitni bhi calls hongi, sabki recording automatically save hogi
        </span>
        <ShieldCheck size={15} style={{ color: "#16A34A", marginLeft: "auto", flexShrink: 0 }} />
      </div>

      {/* ─── HOW IT WORKS INFO ────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          backgroundColor: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: "10px",
          padding: "12px 16px",
          fontSize: "12px",
          color: "#1E40AF",
          lineHeight: "1.6",
        }}
      >
        <Info size={15} style={{ marginTop: "2px", flexShrink: 0, color: "#2563EB" }} />
        <div>
          <strong style={{ display: "block", marginBottom: "4px" }}>Kaise kaam karta hai?</strong>
          1. Apna <strong>receiving phone number</strong> set karein neeche<br />
          2. <strong>"Start Recorded Call"</strong> click karein<br />
          3. Pehle <strong>aapka phone ring</strong> karega — utha lo<br />
          4. Phir <strong>student ka phone ring</strong> karega — dono connect ho jayenge<br />
          5. Poori call ki <strong>recording automatic</strong> CRM mein save ho jaayegi
        </div>
      </div>

      {/* ─── CLICK-TO-CALL PANEL ──────────────────────────────────── */}
      <div
        className="crm-card"
        style={{
          background: "linear-gradient(135deg, #F0FDF4 0%, #EFF6FF 100%)",
          border: "1px solid #BBF7D0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div
                style={{
                  width: "34px", height: "34px", borderRadius: "50%",
                  backgroundColor: "#16A34A",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                }}
              >
                <PhoneCall size={17} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#14532D" }}>
                  Cloud Recorded Call
                </h3>
                <p style={{ margin: 0, fontSize: "11px", color: "#166534" }}>
                  Domain: <strong>{lead?.domain || "DizitalAdda"}</strong> &nbsp;|&nbsp; Student: <strong>{lead?.mobile}</strong>
                </p>
              </div>
            </div>

            {/* Receiving Phone Number Input */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "#374151", fontWeight: "600" }}>
                📱 Aapka Receiving Number:
              </span>
              {editingPhone ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="tel"
                    maxLength={10}
                    value={counsellorMobile}
                    onChange={(e) => setCounsellorMobile(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile"
                    style={{
                      width: "130px", fontSize: "13px",
                      padding: "5px 10px", borderRadius: "6px",
                      border: "1.5px solid #16A34A", outline: "none",
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (counsellorMobile.length !== 10) {
                        toast.error("10 digit ka valid number daalo");
                        return;
                      }
                      localStorage.setItem("counsellor_call_phone", counsellorMobile);
                      setEditingPhone(false);
                      toast.success("Number save ho gaya!");
                    }}
                    style={{
                      background: "#16A34A", color: "#fff", border: "none",
                      borderRadius: "6px", padding: "5px 10px",
                      cursor: "pointer", fontSize: "12px",
                      display: "inline-flex", alignItems: "center", gap: "4px",
                    }}
                  >
                    <Check size={12} /> Save
                  </button>
                  <button
                    onClick={() => setEditingPhone(false)}
                    style={{
                      background: "#F1F5F9", color: "#64748B", border: "none",
                      borderRadius: "6px", padding: "5px 8px", cursor: "pointer", fontSize: "12px",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "13px", fontWeight: "700",
                      color: counsellorMobile ? "#15803D" : "#DC2626",
                      backgroundColor: counsellorMobile ? "#DCFCE7" : "#FEE2E2",
                      padding: "3px 10px", borderRadius: "6px",
                      border: `1px solid ${counsellorMobile ? "#86EFAC" : "#FECACA"}`,
                    }}
                  >
                    {counsellorMobile || "Set Nahi Kiya"}
                  </span>
                  <button
                    onClick={() => setEditingPhone(true)}
                    style={{
                      background: "transparent", border: "1px solid #D1D5DB",
                      borderRadius: "5px", cursor: "pointer", color: "#6B7280",
                      padding: "3px 7px", fontSize: "11px",
                      display: "inline-flex", alignItems: "center", gap: "3px",
                    }}
                    title="Number change karein"
                  >
                    <Edit2 size={11} /> Change
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Call Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleStartCall}
              disabled={calling}
              className="crm-btn-primary"
              style={{
                backgroundColor: calling ? "#6B7280" : "#16A34A",
                padding: "11px 22px",
                fontSize: "14px",
                fontWeight: "700",
                boxShadow: calling ? "none" : "0 4px 14px rgba(22,163,74,0.30)",
                display: "flex", alignItems: "center", gap: "8px",
              }}
            >
              <PhoneCall size={17} />
              <span>{calling ? "Dialing..." : "Start Recorded Call"}</span>
            </button>

            <button
              onClick={fetchCalls}
              disabled={loading}
              title="Refresh"
              style={{
                background: "#fff", border: "1px solid #D1D5DB",
                borderRadius: "8px", padding: "9px 12px",
                cursor: "pointer", color: "#64748B",
                display: "flex", alignItems: "center",
              }}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── CALL STATS ROW ──────────────────────────────────────── */}
      {totalCalls > 0 && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[
            { label: "Total Calls", value: totalCalls, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
            { label: "Completed", value: completedCalls, color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
            { label: "Total Duration", value: formatSecs(totalDuration), color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: 1, minWidth: "90px",
                backgroundColor: stat.bg, border: `1px solid ${stat.border}`,
                borderRadius: "8px", padding: "10px 14px", textAlign: "center",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "800", color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── CALL LOGS LIST ──────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#1E293B" }}>
            Call Logs &amp; Recordings ({calls.length})
          </h4>
          <span style={{ fontSize: "11px", color: "#64748B" }}>
            Student: {lead?.full_name} · {lead?.mobile}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "36px 0", textAlign: "center", color: "#64748B" }}>
            <RefreshCw size={22} className="animate-spin" style={{ margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: "13px" }}>Loading call history...</p>
          </div>
        ) : calls.length === 0 ? (
          <div
            style={{
              padding: "40px 24px", textAlign: "center",
              backgroundColor: "#F8FAFC", borderRadius: "12px",
              border: "1px dashed #CBD5E1",
            }}
          >
            <PhoneForwarded size={34} style={{ color: "#94A3B8", margin: "0 auto 10px" }} />
            <h5 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "600", color: "#334155" }}>
              Abhi Tak Koi Call Nahi
            </h5>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
              Upar <strong>"Start Recorded Call"</strong> click karein — pehli call initiate karein.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {calls.map((call) => {
              const isCompleted = call.status === "COMPLETED";
              const isRinging = call.status === "RINGING" || call.status === "INITIATED";
              const hasRecording = Boolean(call.recording_url);

              return (
                <div
                  key={call.id}
                  style={{
                    backgroundColor: "#fff", borderRadius: "10px",
                    border: `1px solid ${isCompleted ? "#BBF7D0" : isRinging ? "#BFDBFE" : "#FECACA"}`,
                    padding: "14px 16px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Call Header Row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          padding: "3px 9px", borderRadius: "999px",
                          fontSize: "11px", fontWeight: "700", textTransform: "uppercase",
                          backgroundColor: isCompleted ? "#DCFCE7" : isRinging ? "#DBEAFE" : "#FEE2E2",
                          color: isCompleted ? "#15803D" : isRinging ? "#1E40AF" : "#B91C1C",
                        }}
                      >
                        {isCompleted ? <CheckCircle2 size={11} /> : isRinging ? <Clock size={11} /> : <XCircle size={11} />}
                        {call.status}
                      </span>

                      <span style={{ fontSize: "11px", color: "#64748B", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <Clock size={11} />
                        {new Date(call.created_at).toLocaleString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>

                      {call.duration > 0 && (
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#0F172A", backgroundColor: "#F1F5F9", padding: "2px 7px", borderRadius: "4px" }}>
                          {formatSecs(call.duration)}
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: "11px", color: "#475569" }}>
                      By: <strong>{call.counsellor_name || "Counsellor"}</strong>
                    </span>
                  </div>

                  {/* Phone Routing */}
                  <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "10px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
                    <span>From: <strong>{call.counsellor_number || "--"}</strong></span>
                    <span>To: <strong>{call.lead_number}</strong></span>
                    {call.provider && (
                      <span style={{ marginLeft: "auto" }}>
                        Provider: <strong style={{ color: "#2563EB" }}>{call.provider}</strong>
                        {call.provider === "DEV_MOCK" && (
                          <span style={{ marginLeft: "4px", color: "#D97706" }}>(Test Mode)</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Recording / Status Area */}
                  {hasRecording ? (
                    <div
                      style={{
                        backgroundColor: "#F0FDF4", borderRadius: "8px", padding: "10px 12px",
                        border: "1px solid #BBF7D0",
                        display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#14532D", display: "inline-flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                        🎧 Recording Ready:
                      </span>
                      <audio
                        controls
                        src={call.recording_url}
                        style={{ flexGrow: 1, minWidth: "200px", height: "34px" }}
                      />
                      <a
                        href={call.recording_url}
                        download={`call_${lead?.lead_code || lead?.id}_${call.id}.mp3`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          padding: "5px 10px", fontSize: "11px", fontWeight: "600",
                          backgroundColor: "#fff", border: "1px solid #86EFAC",
                          borderRadius: "6px", color: "#15803D", textDecoration: "none",
                          flexShrink: 0,
                        }}
                      >
                        <Download size={12} /> Download
                      </a>
                    </div>
                  ) : isRinging ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#EFF6FF", padding: "9px 12px", borderRadius: "8px", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "12px", color: "#1D4ED8" }}>
                        ⏳ Call in progress — provider se recording callback ka wait ho raha hai...
                      </span>
                      <button
                        onClick={() => handleSimulateComplete(call.id)}
                        disabled={simulating}
                        style={{
                          fontSize: "11px", fontWeight: "600",
                          backgroundColor: "#2563EB", color: "#fff",
                          border: "none", padding: "4px 10px",
                          borderRadius: "5px", cursor: "pointer",
                          display: "inline-flex", alignItems: "center", gap: "4px",
                        }}
                        title="Only for testing/demo"
                      >
                        <Sparkles size={11} />
                        {simulating ? "..." : "Simulate Complete (Dev)"}
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: "11px", color: "#94A3B8", fontStyle: "italic" }}>
                      <AlertCircle size={12} style={{ display: "inline", marginRight: "4px" }} />
                      Recording nahi — call unanswered ya busy tha.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CSS pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(22,163,74,0.25); }
          50% { box-shadow: 0 0 0 6px rgba(22,163,74,0.10); }
        }
      `}</style>
    </div>
  );
};

export default CallRecordingsTab;
