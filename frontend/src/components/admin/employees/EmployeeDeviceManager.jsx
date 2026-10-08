import { useCallback, useEffect, useState } from "react";
import { Laptop, Smartphone, ShieldCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  getEmployeeDevices,
  renameEmployeeDevice,
  revokeEmployeeDevice,
} from "../../../services/employeeService";

const formatDate = (value) => value
  ? new Date(value).toLocaleString()
  : "Never";

const EmployeeDeviceManager = ({ employee, onClose }) => {
  const [devices, setDevices] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingDeviceId, setSavingDeviceId] = useState("");
  const [names, setNames] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getEmployeeDevices(employee.id);
      const result = response?.data || {};
      const deviceRows = result.devices || [];
      setDevices(deviceRows);
      setAttempts(result.blockedAttempts || []);
      setNames(Object.fromEntries(deviceRows.map((device) => [device.device_id, device.device_name || ""])));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load employee devices.");
    } finally {
      setLoading(false);
    }
  }, [employee.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const saveName = async (device) => {
    setSavingDeviceId(device.device_id);
    try {
      await renameEmployeeDevice(employee.id, device.device_id, names[device.device_id] || "");
      toast.success("Device name updated.");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not rename device.");
    } finally {
      setSavingDeviceId("");
    }
  };

  const revoke = async (device) => {
    if (!window.confirm(`Revoke ${device.device_name}? Its slot will be available to the next device that signs in.`)) return;
    setSavingDeviceId(device.device_id);
    try {
      await revokeEmployeeDevice(employee.id, device.device_id);
      toast.success("Device revoked. Its slot is now available.");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not revoke device.");
    } finally {
      setSavingDeviceId("");
    }
  };

  return (
    <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${employee.full_name} device management`}
        style={{
          position: "fixed",
          inset: "5vh 5vw",
          zIndex: 1500,
          overflow: "auto",
          background: "#fff",
          borderRadius: 14,
          padding: 24,
          boxShadow: "0 24px 80px #0f172a55",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>Device slots · {employee.full_name}</h2>
            <p style={{ color: "#64748b" }}>One laptop and one mobile browser can be approved.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close device manager"><X /></button>
        </header>

        {loading ? <p>Loading devices…</p> : (
          <>
            <h3>Registered devices</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {devices.filter((device) => device.device_id).map((device) => (
                <article key={device.device_id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {device.device_type === "mobile" ? <Smartphone size={18} /> : <Laptop size={18} />}
                    <strong>{device.device_type}</strong>
                    <span style={{ color: device.status === "approved" ? "#15803d" : "#b91c1c" }}>{device.status}</span>
                    {device.status === "approved" && <ShieldCheck size={16} color="#15803d" />}
                  </div>
                  <p style={{ margin: "8px 0", color: "#475569" }}>
                    First seen {formatDate(device.first_seen)} · Last seen {formatDate(device.last_seen)}
                    {device.revoked_at && ` · Revoked ${formatDate(device.revoked_at)}`}
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      aria-label="Device name"
                      maxLength={120}
                      value={names[device.device_id] || ""}
                      onChange={(event) => setNames((current) => ({ ...current, [device.device_id]: event.target.value }))}
                    />
                    <button type="button" disabled={savingDeviceId === device.device_id} onClick={() => saveName(device)}>Save name</button>
                    {device.status === "approved" && (
                      <button type="button" disabled={savingDeviceId === device.device_id} onClick={() => revoke(device)}>
                        Revoke / replace
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {!devices.some((device) => device.device_id) && <p>No registered devices.</p>}
            </div>

            <h3 style={{ marginTop: 24 }}>Blocked sign-in attempts (latest 100)</h3>
            {attempts.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", textAlign: "left" }}>
                  <thead><tr><th>Type</th><th>Device ID</th><th>Attempted at</th><th>IP</th><th>User agent</th></tr></thead>
                  <tbody>
                    {attempts.map((attempt) => (
                      <tr key={attempt.id}>
                        <td>{attempt.device_type}</td>
                        <td style={{ overflowWrap: "anywhere" }}>{attempt.device_id}</td>
                        <td>{formatDate(attempt.attempted_at)}</td>
                        <td>{attempt.ip_address || "—"}</td>
                        <td style={{ maxWidth: 320, overflowWrap: "anywhere" }}>{attempt.user_agent || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p>No blocked attempts.</p>}
          </>
        )}
      </section>
    </div>
  );
};

export default EmployeeDeviceManager;
