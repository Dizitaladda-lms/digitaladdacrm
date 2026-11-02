import { useCallback, useEffect, useState } from "react";
import { BellRing, CheckCircle2, CircleAlert, LoaderCircle, Smartphone } from "lucide-react";
import {
  getPushSubscriptionStatus,
  isPushSupported,
  sendTestPushNotification,
  syncPushSubscription,
} from "../../services/pushNotificationService";
import "./PushNotificationSettings.css";

const PushNotificationSettings = () => {
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const refreshStatus = useCallback(async () => {
    const currentStatus = await getPushSubscriptionStatus();
    setStatus(currentStatus);
    return currentStatus;
  }, []);

  useEffect(() => {
    refreshStatus().catch((error) => {
      console.error("Could not read push subscription status:", error);
    });
  }, [refreshStatus]);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      let currentStatus = await refreshStatus();
      if (!currentStatus.supported) {
        setResult({ kind: "error", message: "This browser does not support Web Push notifications." });
        return;
      }
      if (currentStatus.permission !== "granted") {
        setResult({
          kind: "error",
          message: `Notification permission is ${currentStatus.permission}. Enable it from the notification prompt or your browser settings first.`,
        });
        return;
      }
      await syncPushSubscription();
      currentStatus = await refreshStatus();
      if (!currentStatus.isSubscribed) {
        setResult({
          kind: "error",
          message: "No browser subscription was found. Reopen the CRM after enabling notifications to register this device.",
        });
        return;
      }

      const response = await sendTestPushNotification();
      const dispatch = response?.data;
      if (!dispatch?.configured) {
        setResult({ kind: "error", message: "Push is not configured on the server. Check the VAPID environment variables." });
      } else if (dispatch.error) {
        setResult({ kind: "error", message: `Push service error: ${dispatch.error}` });
      } else if (dispatch.subscriptions === 0) {
        setResult({ kind: "error", message: "The server has no subscription saved for this user/device." });
      } else if (dispatch.sent === 0) {
        setResult({
          kind: "error",
          message: `Push attempted for ${dispatch.subscriptions} subscription(s), but none were accepted. Failed: ${dispatch.failed}.`,
        });
      } else {
        setResult({
          kind: "success",
          message: `Browser subscription found. Push accepted for ${dispatch.sent} of ${dispatch.subscriptions} device(s). Check the phone notification tray.`,
        });
      }
    } catch (error) {
      console.error("Test push notification failed:", error);
      setResult({
        kind: "error",
        message: error?.response?.data?.message || error?.message || "Could not send the test notification.",
      });
    } finally {
      setTesting(false);
    }
  };

  const supported = isPushSupported();

  return (
    <section className="push-settings-card" aria-labelledby="push-settings-title">
      <header className="push-settings-heading">
        <span className="push-settings-icon"><BellRing size={20} /></span>
        <div>
          <h2 id="push-settings-title">Mobile & background notifications</h2>
          <p>Task assignments and chat alerts can reach this device while the CRM is closed.</p>
        </div>
      </header>

      <div className="push-settings-status">
        <span>
          {status?.isSubscribed ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
          {status?.isSubscribed ? "This browser has a push subscription" : "This browser is not subscribed"}
        </span>
        <span>Permission: {status?.permission || (supported ? "checking" : "unsupported")}</span>
      </div>

      <button className="push-settings-test" type="button" onClick={handleTest} disabled={testing || !supported}>
        {testing ? <LoaderCircle className="push-settings-spinner" size={17} /> : <Smartphone size={17} />}
        {testing ? "Sending test..." : "Send test notification"}
      </button>

      {result && (
        <p className={`push-settings-result ${result.kind}`} role="status">
          {result.message}
        </p>
      )}

      <div className="push-settings-help">
        <h3>Phone settings if alerts do not appear</h3>
        <ul>
          <li><strong>Android:</strong> allow CRM notifications in Chrome and Android app settings; turn off Battery optimization for Chrome and enable Autostart/background activity.</li>
          <li><strong>Xiaomi / Redmi / POCO:</strong> Settings → Apps → Manage apps → Chrome → Notifications: allow; Battery saver: No restrictions; enable Autostart.</li>
          <li><strong>OPPO / realme / Vivo:</strong> Chrome notifications on; App battery management → allow background activity and Auto-start; lock Chrome in recent apps if available.</li>
          <li><strong>Samsung:</strong> Chrome notifications on; Settings → Apps → Chrome → Battery → Unrestricted; remove Chrome from Sleeping apps.</li>
          <li><strong>iPhone / iPad:</strong> open this site in Safari → Share → Add to Home Screen; launch the Home Screen app and allow notifications. iOS Web Push requires iOS/iPadOS 16.4 or newer.</li>
        </ul>
      </div>
    </section>
  );
};

export default PushNotificationSettings;
