import React, { useState, useEffect } from "react";
import {
  Bell,
  Building2,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  Wifi,
  Plus,
  Trash2,
  RefreshCw,
  Globe,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import WorkspacePage from "../../components/workspace/WorkspacePage";
import {
  getOfficeIPs,
  addOfficeIP,
  deleteOfficeIP,
} from "../../services/attendanceService";
import "./Settings.css";

const settingCards = [
  ["Lead routing", "Set manual and automatic assignment rules by domain, course and counsellor.", <Route size={21} key="route" />],
  ["Domains & courses", "Create the course catalogue used to route incoming leads.", <Building2 size={21} key="domain" />],
  ["Users & roles", "Define admin, manager and counsellor access.", <UsersRound size={21} key="users" />],
  ["Notifications", "Choose reminders, overdue alerts and daily summaries.", <Bell size={21} key="bell" />],
  ["Pipeline settings", "Configure lead stages, loss reasons and mandatory fields.", <SlidersHorizontal size={21} key="sliders" />],
  ["Security & Wi-Fi IP", "Configure Office Wi-Fi IP Whitelist for biometric attendance.", <ShieldCheck size={21} key="shield" />],
];

const Settings = () => {
  const [officeIps, setOfficeIps] = useState([]);
  const [loadingIps, setLoadingIps] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState("");
  const [newIpLabel, setNewIpLabel] = useState("");
  const [addingIp, setAddingIp] = useState(false);

  const fetchIPs = async () => {
    try {
      setLoadingIps(true);
      const res = await getOfficeIPs();
      if (res?.data) {
        setOfficeIps(res.data);
      }
    } catch (err) {
      console.error("Failed to load office IPs:", err);
    } finally {
      setLoadingIps(false);
    }
  };

  useEffect(() => {
    fetchIPs();
  }, []);

  const handleAddIp = async (e) => {
    e.preventDefault();
    if (!newIpAddress.trim()) {
      return toast.error("Please enter a valid IP address.");
    }
    try {
      setAddingIp(true);
      await addOfficeIP({
        ip_address: newIpAddress.trim(),
        label: newIpLabel.trim() || "Main Office Wi-Fi",
      });
      toast.success(`Office Wi-Fi IP (${newIpAddress}) whitelisted successfully!`);
      setNewIpAddress("");
      setNewIpLabel("");
      await fetchIPs();
    } catch (err) {
      console.error("Failed to add IP:", err);
      toast.error(err?.response?.data?.message || "Could not add office IP address.");
    } finally {
      setAddingIp(false);
    }
  };

  const handleDeleteIp = async (id, ipStr) => {
    if (!window.confirm(`Are you sure you want to remove ${ipStr} from approved office Wi-Fi networks?`)) {
      return;
    }
    try {
      await deleteOfficeIP(id);
      toast.success("Office Wi-Fi IP removed.");
      await fetchIPs();
    } catch (err) {
      console.error("Failed to delete IP:", err);
      toast.error(err?.response?.data?.message || "Could not delete office IP.");
    }
  };

  const autoDetectIP = async () => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      if (data?.ip) {
        setNewIpAddress(data.ip);
        toast.success(`Detected current network IP: ${data.ip}`);
      }
    } catch (err) {
      toast.error("Could not auto-detect current IP.");
    }
  };

  return (
    <WorkspacePage
      eyebrow="Administration"
      title="Settings & System Configuration"
      description="Configure how your CRM, lead routing, security, and office Wi-Fi attendance work."
    >
      {/* Top Setting Navigation Cards */}
      <div className="settings-grid">
        {settingCards.map(([title, text, icon]) => (
          <button type="button" className="settings-card" key={title}>
            <span>{icon}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
            <small>Configure →</small>
          </button>
        ))}
      </div>

      {/* Office Wi-Fi Attendance IP Settings Section */}
      <section
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1.5px solid #e2e8f0",
          padding: "24px",
          marginTop: "24px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <Wifi size={22} style={{ color: "#0284c7" }} />
              <h2 style={{ margin: 0, fontSize: "20px", color: "#0f172a", fontWeight: 750 }}>
                Office Wi-Fi Attendance IP Address Whitelist
              </h2>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: "13.5px" }}>
              Employees can ONLY mark mobile biometric attendance when connected to these approved office Wi-Fi IP addresses.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchIPs}
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              color: "#334155",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RefreshCw size={15} className={loadingIps ? "spin" : ""} /> Refresh IPs
          </button>
        </div>

        {/* Add New Approved IP Form */}
        <form
          onSubmit={handleAddIp}
          style={{
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            padding: "18px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h4 style={{ margin: 0, fontSize: "14px", color: "#1e293b", fontWeight: 700 }}>
              Add Approved Office Wi-Fi IP Address
            </h4>
            <button
              type="button"
              onClick={autoDetectIP}
              style={{
                background: "#e0f2fe",
                color: "#0369a1",
                border: "1px solid #bae6fd",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Globe size={13} /> Auto-Detect Current Network IP
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Enter Public IP (e.g. 103.161.231.230 or 192.168.1.1)"
              value={newIpAddress}
              onChange={(e) => setNewIpAddress(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                fontFamily: "monospace",
              }}
              required
            />
            <input
              type="text"
              placeholder="Label / Location (e.g. Main Office Router, Reception Wi-Fi)"
              value={newIpLabel}
              onChange={(e) => setNewIpLabel(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
              }}
            />
            <button
              type="submit"
              disabled={addingIp}
              style={{
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                padding: "10px 18px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13.5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 4px rgba(2, 132, 199, 0.2)",
              }}
            >
              <Plus size={16} /> {addingIp ? "Saving..." : "Whitelist IP"}
            </button>
          </div>
        </form>

        {/* Active Approved Office IPs List */}
        <div>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#1e293b", fontWeight: 700 }}>
            Currently Whitelisted Office Wi-Fi IPs ({officeIps.length})
          </h4>

          {loadingIps ? (
            <p style={{ color: "#64748b", fontSize: "14px" }}>Loading approved IPs...</p>
          ) : officeIps.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1" }}>
              <Wifi size={32} style={{ color: "#94a3b8", marginBottom: "8px" }} />
              <p style={{ margin: 0, color: "#475569", fontWeight: 600 }}>No office IPs whitelisted yet.</p>
              <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "13px" }}>
                Add your office Wi-Fi public IP address above to restrict attendance marking to office premises.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
              {officeIps.map((ip) => (
                <div
                  key={ip.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <CheckCircle2 size={15} style={{ color: "#16a34a" }} />
                      <span style={{ fontFamily: "monospace", fontSize: "15px", fontWeight: 750, color: "#0f172a" }}>
                        {ip.ip_address}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                      {ip.label || "Office Wi-Fi"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteIp(ip.id, ip.ip_address)}
                    style={{
                      background: "#fee2e2",
                      border: "1px solid #fecaca",
                      color: "#dc2626",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                    title="Remove from Whitelist"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </WorkspacePage>
  );
};

export default Settings;
