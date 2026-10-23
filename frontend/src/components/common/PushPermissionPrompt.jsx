import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, Smartphone, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
  getPushSubscriptionStatus,
  isPushSupported,
  subscribeUserToPush,
} from "../../services/pushNotificationService";
import "./PushPermissionPrompt.css";

const isIosDevice = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isStandalone = () => window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;

const PushPermissionPrompt = () => {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    let active = true;
    if (loading || !user?.id) {
      setVisible(false);
      return () => { active = false; };
    }

    const check = async () => {
      const ios = isIosDevice();
      if (ios && !isStandalone()) {
        if (active) {
          setIosNeedsInstall(true);
          setVisible(true);
        }
        return;
      }

      if (!isPushSupported()) return;
      const status = await getPushSubscriptionStatus();
      if (active && (!status.isSubscribed || status.permission !== "granted")) {
        setIosNeedsInstall(false);
        setVisible(true);
      }
    };

    check().catch(() => {});
    return () => { active = false; };
  }, [loading, user?.id]);

  const enable = async () => {
    try {
      setEnabling(true);
      await subscribeUserToPush();
      toast.success("Work aur chat notifications active ho gayi hain.");
      setVisible(false);
    } catch (error) {
      toast.error(error?.message || "Notification permission enable nahi ho saki.");
    } finally {
      setEnabling(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="push-permission-overlay" role="dialog" aria-modal="true" aria-labelledby="push-permission-title">
      <section className="push-permission-card">
        <button type="button" className="push-permission-close" onClick={() => setVisible(false)} aria-label="Remind me later">
          <X size={18} />
        </button>
        <div className="push-permission-icon"><BellRing size={25} /></div>
        <h2 id="push-permission-title">Work & Chat Notifications</h2>
        {iosNeedsInstall ? (
          <>
            <p>iPhone/iPad par CRM band hone ke baad alerts ke liye pehle is CRM ko Home Screen par install karein.</p>
            <ol>
              <li>Safari ke Share button par tap karein.</li>
              <li><strong>Add to Home Screen</strong> select karein.</li>
              <li>Home Screen se CRM kholkar “Allow notifications” dabayein.</li>
            </ol>
          </>
        ) : (
          <>
            <p>Assigned work aur chat message ka alert CRM band hone par bhi milne ke liye notifications allow karein.</p>
            <div className="push-permission-points">
              <span><CheckCircle2 size={15} /> Sirf aapke assigned work</span>
              <span><CheckCircle2 size={15} /> Sirf aapke chat messages</span>
            </div>
            <button type="button" className="push-permission-enable" onClick={enable} disabled={enabling}>
              <Smartphone size={17} /> {enabling ? "Enabling..." : "Allow notifications"}
            </button>
          </>
        )}
        <button type="button" className="push-permission-later" onClick={() => setVisible(false)}>Not now</button>
      </section>
    </div>
  );
};

export default PushPermissionPrompt;
