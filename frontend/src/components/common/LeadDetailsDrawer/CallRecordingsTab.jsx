import React, { useState, useEffect, useCallback } from "react";
import {
  PhoneCall,
  Play,
  Pause,
  Download,
  Clock,
  User,
  AlertCircle,
  RefreshCw,
  PhoneForwarded,
  CheckCircle2,
  XCircle,
  Sparkles,
  Edit2,
  Check,
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
  const [activeAudio, setActiveAudio] = useState(null);
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

    try {
      setCalling(true);
      const res = await initiateCall(lead.id, counsellorMobile ? counsellorMobile.trim() : null);
      if (res?.success) {
        toast.success(res.message || "Call initiated! Your phone will ring shortly.");
        fetchCalls();
      } else {
        toast.error(res?.message || "Failed to initiate call");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Error placing call";
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
        toast.success("Sample recording generated successfully! 🎧");
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Click-To-Call Action Banner */}
      <div
        className="crm-card"
        style={{
          background: "linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)",
          border: "1px solid #BFDBFE",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <PhoneCall size={16} />
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1E3A8A" }}>
                Cloud Telephony & Call Recording
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "#3B82F6", maxWidth: "480px" }}>
              Counsellor aur student ke beech call connect hogi aur poori conversation automatically CRM me record ho jayegi.
            </p>
            <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#DBEAFE", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", color: "#1E40AF", fontWeight: "600" }}>
                <span>🏢 Outbound Domain: <strong>{lead?.domain || "DizitalAdda"}</strong></span>
              </div>

              {/* Counsellor Receiving Mobile Number */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#FEF3C7", border: "1px solid #FDE68A", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", color: "#92400E" }}>
                <span>📱 Your Phone:</span>
                {editingPhone ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <input
                      type="text"
                      maxLength={10}
                      value={counsellorMobile}
                      onChange={(e) => setCounsellorMobile(e.target.value.replace(/\D/g, ""))}
                      placeholder="10-digit mobile"
                      style={{
                        width: "110px",
                        fontSize: "11px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px solid #D97706",
                        outline: "none",
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        localStorage.setItem("counsellor_call_phone", counsellorMobile);
                        setEditingPhone(false);
                        toast.success("Receiving phone updated!");
                      }}
                      style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: "3px", padding: "2px 6px", cursor: "pointer", fontSize: "10px" }}
                    >
                      <Check size={10} /> Save
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <strong>{counsellorMobile || "Not Set"}</strong>
                    <button
                      onClick={() => setEditingPhone(true)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#B45309", padding: "0 2px" }}
                      title="Change phone to receive call"
                    >
                      <Edit2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleStartCall}
              disabled={calling}
              className="crm-btn-primary"
              style={{
                backgroundColor: "#16A34A",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "600",
                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
              }}
            >
              <PhoneCall size={16} />
              <span>{calling ? "Dialing..." : "Start Recorded Call"}</span>
            </button>

            <button
              onClick={fetchCalls}
              disabled={loading}
              title="Refresh logs"
              style={{
                background: "#fff",
                border: "1px solid #CBD5E1",
                borderRadius: "8px",
                padding: "8px 12px",
                cursor: "pointer",
                color: "#64748B",
              }}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Recordings & Call History List */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1E293B" }}>
            Call Logs & Recordings ({calls.length})
          </h4>
          <span style={{ fontSize: "12px", color: "#64748B" }}>
            Student: {lead?.full_name} ({lead?.mobile})
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#64748B" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: "13px" }}>Loading call history...</p>
          </div>
        ) : calls.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              backgroundColor: "#F8FAFC",
              borderRadius: "12px",
              border: "1px dashed #CBD5E1",
            }}
          >
            <PhoneForwarded size={36} style={{ color: "#94A3B8", margin: "0 auto 12px" }} />
            <h5 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "600", color: "#334155" }}>
              No Recorded Calls Yet
            </h5>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
              Click <strong>"Start Recorded Call"</strong> above to make the first call to this student.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {calls.map((call) => {
              const isCompleted = call.status === "COMPLETED";
              const isRinging = call.status === "RINGING" || call.status === "INITIATED";
              const hasRecording = Boolean(call.recording_url);

              return (
                <div
                  key={call.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    padding: "16px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* Call Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          backgroundColor: isCompleted ? "#DCFCE7" : isRinging ? "#DBEAFE" : "#FEE2E2",
                          color: isCompleted ? "#15803D" : isRinging ? "#1E40AF" : "#B91C1C",
                        }}
                      >
                        {isCompleted ? <CheckCircle2 size={12} /> : isRinging ? <Clock size={12} /> : <XCircle size={12} />}
                        {call.status}
                      </span>

                      <span style={{ fontSize: "12px", color: "#64748B", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} />
                        {new Date(call.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {call.duration > 0 && (
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "#0F172A", backgroundColor: "#F1F5F9", padding: "2px 8px", borderRadius: "4px" }}>
                          Duration: {formatSecs(call.duration)}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: "12px", color: "#475569" }}>
                      Counsellor: <strong>{call.counsellor_name || "Assigned Counsellor"}</strong>
                    </div>
                  </div>

                  {/* Phone routing details */}
                  <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "12px", display: "flex", gap: "16px" }}>
                    <span>From: <strong>{call.counsellor_number || "--"}</strong></span>
                    <span>To: <strong>{call.lead_number}</strong></span>
                    {call.provider && <span>Provider: <strong style={{ color: "#2563EB" }}>{call.provider}</strong></span>}
                  </div>

                  {/* Audio Player Card (If Recording Exists) */}
                  {hasRecording ? (
                    <div
                      style={{
                        backgroundColor: "#F8FAFC",
                        borderRadius: "8px",
                        padding: "12px",
                        border: "1px solid #E2E8F0",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        🎧 Recording:
                      </span>
                      <audio
                        controls
                        src={call.recording_url}
                        style={{ flexGrow: 1, minWidth: "220px", height: "36px" }}
                      />
                      <a
                        href={call.recording_url}
                        download={`call_recording_${call.id}.mp3`}
                        target="_blank"
                        rel="noreferrer"
                        title="Download Recording"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: "600",
                          backgroundColor: "#fff",
                          border: "1px solid #CBD5E1",
                          borderRadius: "6px",
                          color: "#334155",
                          textDecoration: "none",
                        }}
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </a>
                    </div>
                  ) : isRinging ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#EFF6FF", padding: "10px 14px", borderRadius: "8px" }}>
                      <span style={{ fontSize: "12px", color: "#1D4ED8" }}>
                        Call is in progress / waiting for provider callback...
                      </span>
                      <button
                        onClick={() => handleSimulateComplete(call.id)}
                        disabled={simulating}
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          backgroundColor: "#2563EB",
                          color: "#fff",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Sparkles size={11} />
                        <span>Simulate Complete Audio</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "#94A3B8", fontStyle: "italic" }}>
                      No audio recording attached (Call was unanswered or busy).
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallRecordingsTab;
