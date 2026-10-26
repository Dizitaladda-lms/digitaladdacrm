import React, { useState, useEffect } from "react";
import {
  X,
  MapPin,
  Wifi,
  Save,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Crosshair,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getAttendanceSettings,
  updateAttendanceSettings,
  addOfficeIP,
  deleteOfficeIP,
} from "../../services/attendanceService";
import { getBestLocation } from "../../utils/gpsHelper";

const AttendanceSettingsModal = ({ isOpen, onClose, onSettingsUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  // Settings State
  const [officeLat, setOfficeLat] = useState("");
  const [officeLng, setOfficeLng] = useState("");
  const [officeRadius, setOfficeRadius] = useState(100);
  const [officeIps, setOfficeIps] = useState([]);
  const [clientIp, setClientIp] = useState("");
  const [isOfficeIp, setIsOfficeIp] = useState(false);

  // New IP form state
  const [newIp, setNewIp] = useState("");
  const [newIpLabel, setNewIpLabel] = useState("");
  const [addingIp, setAddingIp] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await getAttendanceSettings();
      if (res?.data) {
        setOfficeLat(res.data.office_lat ?? 28.54175);
        setOfficeLng(res.data.office_lng ?? 77.240611111);
        setOfficeRadius(res.data.office_radius ?? 100);
        setOfficeIps(res.data.office_ips || []);
        setClientIp(res.data.client_ip || "");
        setIsOfficeIp(Boolean(res.data.is_office_ip));
      }
    } catch (err) {
      toast.error("Failed to load attendance settings: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const handleUseCurrentGps = async () => {
    try {
      setDetectingGps(true);
      toast.loading("Detecting current high-accuracy GPS coordinates...", { id: "gps-detect" });
      const loc = await getBestLocation(10000, 50);
      toast.dismiss("gps-detect");
      if (loc && loc.latitude != null && loc.longitude != null) {
        setOfficeLat(loc.latitude);
        setOfficeLng(loc.longitude);
        toast.success(`Coordinates captured! (Accuracy: ${Math.round(loc.accuracy || 0)}m)`);
      } else {
        toast.error(loc?.error_message || "Could not detect GPS location.");
      }
    } catch {
      toast.dismiss("gps-detect");
      toast.error("Failed to detect GPS location.");
    } finally {
      setDetectingGps(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const lat = Number(officeLat);
    const lng = Number(officeLng);
    const radius = Number(officeRadius);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return toast.error("Please enter a valid Latitude (-90 to 90).");
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return toast.error("Please enter a valid Longitude (-180 to 180).");
    }
    if (isNaN(radius) || radius <= 0 || radius > 5000) {
      return toast.error("Radius must be between 10 and 5000 meters.");
    }

    try {
      setSaving(true);
      await updateAttendanceSettings({
        office_lat: lat,
        office_lng: lng,
        office_radius: radius,
      });
      toast.success("Office attendance settings saved successfully!");
      if (onSettingsUpdated) onSettingsUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddIp = async (ipToWhitelist, label = "Office Wi-Fi") => {
    const targetIp = (ipToWhitelist || newIp).trim();
    if (!targetIp) return toast.error("Please enter a valid IP address.");

    try {
      setAddingIp(true);
      await addOfficeIP({ ip_address: targetIp, label: label || newIpLabel || "Office Wi-Fi" });
      toast.success(`IP ${targetIp} whitelisted successfully!`);
      setNewIp("");
      setNewIpLabel("");
      await loadSettings();
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to whitelist IP.");
    } finally {
      setAddingIp(false);
    }
  };

  const handleDeleteIp = async (id, ipAddress) => {
    if (!window.confirm(`Delete whitelisted IP ${ipAddress}?`)) return;
    try {
      await deleteOfficeIP(id);
      toast.success("IP removed from whitelist.");
      await loadSettings();
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      toast.error("Failed to delete IP: " + (err.response?.data?.message || err.message));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MapPin size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#0f172a" }}>
                Office Geofence & Wi-Fi Settings
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Configure office location coordinates, radius & whitelisted Wi-Fi IPs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              padding: "6px",
              borderRadius: "8px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#64748b" }}>
            <RefreshCw size={28} className="spin" style={{ marginBottom: "8px" }} />
            <p style={{ margin: 0, fontSize: "14px" }}>Loading settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Geofence Coordinates Box */}
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={15} style={{ color: "#2563eb" }} /> Office Coordinates & Radius
                </span>
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  disabled={detectingGps}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Crosshair size={13} className={detectingGps ? "spin" : ""} />
                  {detectingGps ? "Detecting GPS..." : "Use My Current Location"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={officeLat}
                    onChange={(e) => setOfficeLat(e.target.value)}
                    placeholder="e.g. 28.54175"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={officeLng}
                    onChange={(e) => setOfficeLng(e.target.value)}
                    placeholder="e.g. 77.240611"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Radius (Meters) *
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    required
                    value={officeRadius}
                    onChange={(e) => setOfficeRadius(e.target.value)}
                    placeholder="100"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Current Client IP & Quick Whitelist */}
            <div
              style={{
                background: isOfficeIp ? "#f0fdf4" : "#fffbeb",
                border: isOfficeIp ? "1px solid #bbf7d0" : "1px solid #fde68a",
                borderRadius: "10px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Wifi size={18} style={{ color: isOfficeIp ? "#16a34a" : "#d97706" }} />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                    Your Detected Public IP: <span style={{ fontFamily: "monospace", color: "#2563eb" }}>{clientIp || "127.0.0.1"}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: isOfficeIp ? "#15803d" : "#b45309" }}>
                    {isOfficeIp ? "✓ This IP is already verified as Office Wi-Fi" : "⚠️ Not in office whitelist"}
                  </div>
                </div>
              </div>

              {!isOfficeIp && clientIp && (
                <button
                  type="button"
                  onClick={() => handleAddIp(clientIp, "Office Router Wi-Fi")}
                  disabled={addingIp}
                  style={{
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  + Whitelist My Current IP
                </button>
              )}
            </div>

            {/* Office Whitelisted IPs List */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "8px" }}>
                Whitelisted Office Wi-Fi / Public IPs ({officeIps.length})
              </label>

              {/* Add Custom IP inputs */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input
                  type="text"
                  placeholder="e.g. 122.160.10.25"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  style={{
                    flex: "1 1 200px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
                <input
                  type="text"
                  placeholder="Label (e.g. Main Office Wi-Fi)"
                  value={newIpLabel}
                  onChange={(e) => setNewIpLabel(e.target.value)}
                  style={{
                    flex: "1 1 180px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAddIp(newIp, newIpLabel)}
                  disabled={addingIp || !newIp.trim()}
                  style={{
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Plus size={15} /> Add
                </button>
              </div>

              {/* IP Table / Badges */}
              <div
                style={{
                  maxHeight: "180px",
                  overflowY: "auto",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              >
                {officeIps.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    No whitelisted IPs found. Add office public IP above.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <tbody>
                      {officeIps.map((row) => (
                        <tr key={row.id || row.ip_address} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: "600", color: "#0f172a" }}>
                            {row.ip_address}
                          </td>
                          <td style={{ padding: "10px 14px", color: "#475569" }}>
                            {row.label || "Office Wi-Fi"}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right" }}>
                            {row.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteIp(row.id, row.ip_address)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  padding: "4px",
                                }}
                                title="Remove IP"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                marginTop: "8px",
                paddingTop: "16px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Save size={15} />
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AttendanceSettingsModal;
