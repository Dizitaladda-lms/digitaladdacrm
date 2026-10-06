import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bell,
  CheckCheck,
  Clock,
  PhoneCall,
  AlertCircle,
  UserCheck,
  GraduationCap,
  IndianRupee,
  UserPlus,
  ArrowRight,
  RefreshCw,
  X,
  Sparkles,
  ShieldCheck,
  Fingerprint,
  FileText,
  ClipboardCheck,
  CheckSquare,
  CheckCircle2,
  LogIn,
  LogOut,
  Volume2,
  VolumeX,
  Smartphone,
  Send,
  BellRing,
  MessageSquare,
} from "lucide-react";
import { getNotifications } from "../../../services/notificationService";
import {
  isPushSupported,
  getPushSubscriptionStatus,
  subscribeUserToPush,
  sendTestPushNotification,
} from "../../../services/pushNotificationService";
import "./NotificationsPopover.css";

const READ_STORAGE_KEY = "dizitaladda_read_notifications";
const SOUND_PREF_KEY = "dizitaladda_notif_sound_enabled";

const URGENT_OR_ACTIONABLE_TYPES = [
  "CHAT_MENTION",
  "CHAT_DM",
  "CHAT_MESSAGE",
  "BIOMETRIC_PENDING",
  "DAILY_REPORT_TL_PENDING",
  "DAILY_REPORT_HR_PENDING",
  "DAILY_REPORT_SUBMITTED",
  "DAILY_REPORT_STATUS",
  "UNASSIGNED_LEAD",
  "NEW_ASSIGNED",
  "FOLLOWUP_DUE_NOW",
  "ADMISSION_DONE",
  "TASK_ASSIGNED",
  "TASK_UPDATE",
  "ATTENDANCE_CHECKIN",
  "ATTENDANCE_CHECKOUT",
  "COUNSELLOR_PASSWORD_CHANGED",
];

const NotificationsPopover = ({ isEmployee = false }) => {
  const navigate = useNavigate();
  const popoverRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(SOUND_PREF_KEY);
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(READ_STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [filterTab, setFilterTab] = useState("ALL");
  const [pushStatus, setPushStatus] = useState({ supported: false, permission: "default", isSubscribed: false });
  const [pushLoading, setPushLoading] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const initializedRef = useRef(false);
  const seenIdsRef = useRef(new Set());
  const audioCtxRef = useRef(null);

  const checkPush = async () => {
    if (isPushSupported()) {
      const s = await getPushSubscriptionStatus();
      setPushStatus(s);
    }
  };

  useEffect(() => {
    checkPush();
  }, []);

  const handleEnablePush = async (e) => {
    e.stopPropagation();
    setPushLoading(true);
    try {
      await subscribeUserToPush();
      await checkPush();
      toast.success("Mobile & background push notifications activated!");
    } catch (err) {
      toast.error(err.message || "Failed to activate push notifications");
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async (e) => {
    e.stopPropagation();
    setTestPushLoading(true);
    try {
      await sendTestPushNotification();
      toast.success("Test notification dispatched to your phone/desktop!");
    } catch (err) {
      toast.error("Failed to send test push: " + (err.response?.data?.message || err.message));
    } finally {
      setTestPushLoading(false);
    }
  };

  const getAudioContext = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  const playAlertTone = () => {
    if (!soundEnabled) return;
    try {
      const context = getAudioContext();
      if (!context) return;
      const playBeep = (at, frequency) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.15, at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.24);
      };
      playBeep(context.currentTime, 880);
      playBeep(context.currentTime + 0.28, 1175);
    } catch {
      // Audio playback fails silently if blocked by browser policy
    }
  };

  const toggleSound = (e) => {
    e.stopPropagation();
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_PREF_KEY, String(next));
      return next;
    });
  };

  const triggerToastPopup = (notif) => {
    toast.custom(
      (t) => (
        <div
          className={`notif-toast-card ${t.visible ? "notif-toast-enter" : "notif-toast-leave"} ${notif.priority?.toLowerCase() || "info"}`}
          onClick={() => {
            toast.dismiss(t.id);
            handleItemClick(notif);
          }}
          role="button"
          tabIndex={0}
        >
          <div className={`notif-toast-icon-wrap ${notif.priority?.toLowerCase() || "info"}`}>
            {getIcon(notif.type, notif.category)}
          </div>
          <div className="notif-toast-body">
            <div className="notif-toast-header">
              <span className="notif-toast-title">{notif.title}</span>
              <span className={`notif-toast-badge ${notif.priority?.toLowerCase() || "info"}`}>
                {notif.priority || "ALERT"}
              </span>
            </div>
            <p className="notif-toast-message">{notif.message}</p>
            <div className="notif-toast-action">
              <span>View details ➜</span>
            </div>
          </div>
          <button
            type="button"
            className="notif-toast-close"
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(t.id);
            }}
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ),
      {
        id: `toast_${notif.id}`,
        duration: 7500,
        position: "top-right",
      }
    );
  };

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      const list = res?.data?.notifications || res?.notifications || [];
      const incomingIds = new Set(list.map((notification) => notification.id));

      if (initializedRef.current) {
        // Find newly arrived alerts that haven't been seen yet
        const freshAlerts = list.filter(
          (notification) =>
            !seenIdsRef.current.has(notification.id) &&
            (URGENT_OR_ACTIONABLE_TYPES.includes(notification.type) ||
              notification.priority === "URGENT" ||
              notification.priority === "HIGH")
        );

        if (freshAlerts.length > 0) {
          playAlertTone();

          // Display visual in-app toast popup (up to 3 distinct alerts at once)
          freshAlerts.slice(0, 3).forEach((notif) => {
            triggerToastPopup(notif);
          });

          // Also trigger native OS desktop notification if user allowed
          if ("Notification" in window && Notification.permission === "granted") {
            freshAlerts.slice(0, 2).forEach((notification) => {
              try {
                new Notification(notification.title, {
                  body: notification.message,
                  tag: notification.id,
                });
              } catch {
                // Ignore desktop notification error
              }
            });
          }
        }
      } else {
        // First load on application start:
        // If there are urgent unread items (e.g. pending biometrics or pending reports), show a helpful banner
        const urgentPending = list.filter(
          (n) =>
            (n.priority === "URGENT" || n.type === "BIOMETRIC_PENDING" || n.type === "DAILY_REPORT_TL_PENDING" || n.type === "DAILY_REPORT_HR_PENDING") &&
            !readIds.includes(n.id)
        );

        if (urgentPending.length > 0) {
          // Trigger a single summary toast
          const first = urgentPending[0];
          setTimeout(() => {
            triggerToastPopup({
              id: `startup_pending_${urgentPending.length}`,
              title: `${urgentPending.length} Urgent Action Items Pending`,
              message: `${first.title}: ${first.message}`,
              link: first.link,
              type: first.type,
              category: first.category,
              priority: "URGENT",
            });
          }, 1200);
        }
      }

      seenIdsRef.current = incomingIds;
      initializedRef.current = true;
      setNotifications(list);
    } catch (err) {
      console.warn("Notifications load notice:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
    // 12-second poll ensures immediate updates for incoming chat messages, mentions, and tasks
    const interval = setInterval(fetchNotifs, 12000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const unreadList = notifications.filter((n) => !readIds.includes(n.id));
  const unreadCount = unreadList.length;

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleItemClick = (notif) => {
    if (!readIds.includes(notif.id)) {
      const updated = [...readIds, notif.id];
      setReadIds(updated);
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(updated));
    }
    setIsOpen(false);
    if (notif.link) {
      const targetLink = (notif.link === "/team-chat" && isEmployee) ? "/employee/team-chat" : notif.link;
      navigate(targetLink);
    }
  };

  const getIcon = (type, category) => {
    switch (type) {
      case "CHAT_MENTION":
        return <MessageSquare size={16} className="text-rose-600 animate-pulse" />;
      case "CHAT_DM":
        return <MessageSquare size={16} className="text-violet-600" />;
      case "CHAT_MESSAGE":
        return <MessageSquare size={16} className="text-blue-600" />;
      case "BIOMETRIC_PENDING":
        return <Fingerprint size={16} className="text-rose-600" />;
      case "DAILY_REPORT_TL_PENDING":
        return <ClipboardCheck size={16} className="text-amber-600" />;
      case "DAILY_REPORT_HR_PENDING":
        return <CheckCircle2 size={16} className="text-indigo-600" />;
      case "DAILY_REPORT_SUBMITTED":
        return <FileText size={16} className="text-blue-600" />;
      case "DAILY_REPORT_STATUS":
        return <CheckCircle2 size={16} className="text-emerald-600" />;
      case "TASK_ASSIGNED":
        return <CheckSquare size={16} className="text-purple-600" />;
      case "TASK_UPDATE":
        return <CheckSquare size={16} className="text-emerald-600" />;
      case "ATTENDANCE_CHECKIN":
        return <LogIn size={16} className="text-teal-600" />;
      case "ATTENDANCE_CHECKOUT":
        return <LogOut size={16} className="text-slate-600" />;
      case "TODAY_FOLLOWUP":
        return <PhoneCall size={16} className="text-blue-600" />;
      case "OVERDUE_FOLLOWUP":
        return <AlertCircle size={16} className="text-red-600" />;
      case "FOLLOWUP_DUE_NOW":
        return <PhoneCall size={16} className="text-rose-600 animate-pulse" />;
      case "NEW_ASSIGNED":
      case "UNASSIGNED_LEAD":
        return <UserPlus size={16} className="text-purple-600" />;
      case "ADMISSION_DONE":
        return <GraduationCap size={16} className="text-green-600" />;
      case "FEE_DUE":
        return <IndianRupee size={16} className="text-amber-600" />;
      case "COUNSELLOR_PASSWORD_CHANGED":
        return <ShieldCheck size={16} className="text-red-600" />;
      default:
        return <Bell size={16} className="text-blue-600" />;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "Just now";
    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const displayedList = notifications.filter((n) => {
    if (filterTab === "UNREAD") return !readIds.includes(n.id);
    if (filterTab === "REPORT") return n.category === "REPORT";
    if (filterTab === "BIOMETRIC") return n.category === "BIOMETRIC";
    if (filterTab === "LEAD") return n.category === "LEAD";
    if (filterTab === "TASK") return n.category === "TASK";
    if (filterTab === "FOLLOWUP") return n.category === "FOLLOWUP";
    if (filterTab === "ADMISSION") return n.category === "ADMISSION";
    return true;
  });

  return (
    <div className="notif-wrapper" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        className={`notif-bell-btn ${isOpen ? "active" : ""}`}
        onClick={() => {
          setIsOpen(!isOpen);
          getAudioContext();
          if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
          }
        }}
        title="Notifications & Alerts"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge-pill">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="notif-popover">
          {/* Popover Header */}
          <div className="notif-popover-header">
            <div className="header-title-box">
              <h3>Notifications</h3>
              {unreadCount > 0 ? (
                <span className="unread-counter-tag">{unreadCount} new</span>
              ) : (
                <span className="all-caught-up-tag">All caught up</span>
              )}
            </div>

            <div className="header-actions">
              <button
                className={`btn-notif-sound ${soundEnabled ? "enabled" : "disabled"}`}
                onClick={toggleSound}
                title={soundEnabled ? "Mute alert sound" : "Enable alert sound"}
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
              {unreadCount > 0 && (
                <button className="btn-mark-read" onClick={markAllRead} title="Mark all as read">
                  <CheckCheck size={14} /> Mark read
                </button>
              )}
              <button className="btn-notif-refresh" onClick={fetchNotifs} title="Refresh">
                <RefreshCw size={13} className={loading ? "spin" : ""} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="notif-tabs-bar">
            <button
              className={`tab-pill ${filterTab === "ALL" ? "active" : ""}`}
              onClick={() => setFilterTab("ALL")}
            >
              All ({notifications.length})
            </button>
            <button
              className={`tab-pill ${filterTab === "UNREAD" ? "active" : ""}`}
              onClick={() => setFilterTab("UNREAD")}
            >
              Unread ({unreadCount})
            </button>
            <button
              className={`tab-pill ${filterTab === "REPORT" ? "active" : ""}`}
              onClick={() => setFilterTab("REPORT")}
            >
              Reports
            </button>
            <button
              className={`tab-pill ${filterTab === "BIOMETRIC" ? "active" : ""}`}
              onClick={() => setFilterTab("BIOMETRIC")}
            >
              Biometrics
            </button>
            <button
              className={`tab-pill ${filterTab === "LEAD" ? "active" : ""}`}
              onClick={() => setFilterTab("LEAD")}
            >
              Leads
            </button>
            <button
              className={`tab-pill ${filterTab === "TASK" ? "active" : ""}`}
              onClick={() => setFilterTab("TASK")}
            >
              Tasks
            </button>
          </div>

          {/* Web Push Mobile Status Banner */}
          {pushStatus.supported && (
            <div className={`notif-push-banner ${pushStatus.isSubscribed ? "active" : "inactive"}`}>
              <div className="notif-push-info">
                <Smartphone size={13} className="push-banner-icon" />
                <span>{pushStatus.isSubscribed ? "Mobile Push Active 🟢" : "Get alerts when CRM closed"}</span>
              </div>
              {pushStatus.isSubscribed ? (
                <button
                  type="button"
                  className="btn-push-action test"
                  onClick={handleTestPush}
                  disabled={testPushLoading}
                  title="Dispatch a real test notification to this device"
                >
                  <Send size={11} />
                  <span>{testPushLoading ? "Sending..." : "Test Alert"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-push-action enable"
                  onClick={handleEnablePush}
                  disabled={pushLoading}
                  title="Enable browser & mobile push alerts"
                >
                  <BellRing size={11} />
                  <span>{pushLoading ? "Activating..." : "Enable"}</span>
                </button>
              )}
            </div>
          )}

          {/* Notifications List */}
          <div className="notif-list-container">
            {loading && notifications.length === 0 ? (
              <div className="notif-loading">
                <RefreshCw size={20} className="spin text-blue-600" />
                <span>Checking latest alerts...</span>
              </div>
            ) : displayedList.length === 0 ? (
              <div className="notif-empty-state">
                <div className="empty-icon-wrap">
                  <Sparkles size={24} className="text-blue-500" />
                </div>
                <h4>No notifications right now</h4>
                <p>You are completely caught up with your tasks and work updates.</p>
              </div>
            ) : (
              displayedList.map((item) => {
                const isRead = readIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className={`notif-item ${!isRead ? "unread" : ""}`}
                    onClick={() => handleItemClick(item)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={`notif-icon-circle ${item.priority?.toLowerCase() || "info"}`}>
                      {getIcon(item.type, item.category)}
                    </div>

                    <div className="notif-content">
                      <div className="notif-item-top">
                        <span className="notif-title">{item.title}</span>
                        <span className="notif-time">{formatTime(item.time)}</span>
                      </div>
                      <p className="notif-message">{item.message}</p>
                    </div>

                    {!isRead && <span className="unread-dot" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          <div className="notif-popover-footer">
            <button
              className="btn-footer-link"
              onClick={() => {
                setIsOpen(false);
                navigate(isEmployee ? "/employee/daily-report" : "/team-reports");
              }}
            >
              <span>{isEmployee ? "Open My Reports & Tasks" : "Open Team Reports & Approvals"}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPopover;
