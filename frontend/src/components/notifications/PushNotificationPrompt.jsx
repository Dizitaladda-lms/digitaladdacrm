import { useState, useEffect } from "react";
import { Bell, BellRing, Smartphone, X, CheckCircle2, Send, ShieldCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  isPushSupported,
  getPushSubscriptionStatus,
  subscribeUserToPush,
  sendTestPushNotification,
} from "../../services/pushNotificationService";
import "./PushNotificationPrompt.css";

const DISMISSED_KEY = "dizitaladda_push_prompt_dismissed";

const PushNotificationPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [status, setStatus] = useState({ supported: false, permission: "default", isSubscribed: false });
  const [justSubscribed, setJustSubscribed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      if (!isPushSupported()) return;

      const currentStatus = await getPushSubscriptionStatus();
      if (!isMounted) return;

      setStatus(currentStatus);

      // Check if user has already dismissed recently (within 24 hours)
      const dismissedTimestamp = localStorage.getItem(DISMISSED_KEY);
      const isDismissedRecently =
        dismissedTimestamp && Date.now() - Number(dismissedTimestamp) < 24 * 60 * 60 * 1000;

      // Show prompt if:
      // 1. Web push is supported
      // 2. Not subscribed yet on this device
      // 3. Permission is 'default' OR ('granted' but needs push subscription)
      // 4. Not recently dismissed
      if (
        currentStatus.supported &&
        !currentStatus.isSubscribed &&
        currentStatus.permission !== "denied" &&
        !isDismissedRecently
      ) {
        // Small delay so user isn't immediately bombarded upon page load
        const timer = setTimeout(() => {
          if (isMounted) setShowPrompt(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleEnablePush = async () => {
    setLoading(true);
    try {
      await subscribeUserToPush();
      const updatedStatus = await getPushSubscriptionStatus();
      setStatus(updatedStatus);
      setJustSubscribed(true);
      toast.success("Push notifications enabled! You will now receive background alerts.");
    } catch (err) {
      console.error("Push subscribe error:", err);
      toast.error(err.message || "Failed to enable notifications.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShowPrompt(false);
  };

  const handleSendTestPush = async () => {
    setTestLoading(true);
    try {
      await sendTestPushNotification();
      toast.success("Test notification dispatched! Check your device notifications.");
    } catch (err) {
      console.error("Test push error:", err);
      toast.error(err.response?.data?.message || "Failed to trigger test notification.");
    } finally {
      setTestLoading(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <aside
      className="push-prompt-floating-card"
      role="region"
      aria-label="Mobile and background notifications"
    >
      <button
        type="button"
        className="push-prompt-close-btn"
        onClick={handleDismiss}
        title="Dismiss for now"
        aria-label="Dismiss notification prompt"
      >
        <X size={16} />
      </button>

      {!justSubscribed ? (
        <div className="push-prompt-content">
          <div className="push-prompt-header">
            <div className="push-prompt-icon-badge">
              <Smartphone size={20} className="phone-icon" />
              <BellRing size={13} className="bell-badge-icon" />
            </div>
            <div className="push-prompt-text">
              <h4>Enable Mobile Notifications</h4>
              <p>
                Get instant alerts for <strong>team chat mentions</strong>, <strong>lead assignments</strong>, and attendance even when CRM is closed.
              </p>
            </div>
          </div>

          <div className="push-prompt-actions">
            <button
              type="button"
              className="btn-enable-push"
              onClick={handleEnablePush}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="spin-icon" />
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <Bell size={15} />
                  <span>Turn On Notifications</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-later-push"
              onClick={handleDismiss}
              disabled={loading}
            >
              Later
            </button>
          </div>
        </div>
      ) : (
        <div className="push-prompt-content push-prompt-success">
          <div className="push-prompt-header">
            <div className="push-prompt-icon-badge success">
              <CheckCircle2 size={22} />
            </div>
            <div className="push-prompt-text">
              <h4>Notifications Active!</h4>
              <p>Your browser and device are connected to Dizital Adda background push alerts.</p>
            </div>
          </div>

          <div className="push-prompt-actions">
            <button
              type="button"
              className="btn-test-push"
              onClick={handleSendTestPush}
              disabled={testLoading}
            >
              {testLoading ? (
                <>
                  <Loader2 size={14} className="spin-icon" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Send Test Notification</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-done-push"
              onClick={() => setShowPrompt(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default PushNotificationPrompt;
