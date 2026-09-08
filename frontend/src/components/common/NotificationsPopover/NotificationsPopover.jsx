import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Sparkles
} from "lucide-react";
import { getNotifications } from "../../../services/notificationService";
import "./NotificationsPopover.css";

const READ_STORAGE_KEY = "dizitaladda_read_notifications";

const NotificationsPopover = ({ isEmployee = false }) => {
  const navigate = useNavigate();
  const popoverRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(READ_STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [filterTab, setFilterTab] = useState("ALL");

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      const list = res?.data?.notifications || res?.notifications || [];
      setNotifications(list);
    } catch (err) {
      console.warn("Notifications load notice:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
    // Poll every 45 seconds for fresh notifications
    const interval = setInterval(fetchNotifs, 45000);
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
      navigate(notif.link);
    }
  };

  const getIcon = (type, category) => {
    switch (type) {
      case "TODAY_FOLLOWUP":
        return <PhoneCall size={16} className="text-blue-600" />;
      case "OVERDUE_FOLLOWUP":
        return <AlertCircle size={16} className="text-red-600" />;
      case "NEW_ASSIGNED":
      case "UNASSIGNED_LEAD":
        return <UserPlus size={16} className="text-purple-600" />;
      case "ADMISSION_DONE":
        return <GraduationCap size={16} className="text-green-600" />;
      case "FEE_DUE":
        return <IndianRupee size={16} className="text-amber-600" />;
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
        onClick={() => setIsOpen(!isOpen)}
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
              {unreadCount > 0 && (
                <button className="btn-mark-read" onClick={markAllRead} title="Mark all as read">
                  <CheckCheck size={14} /> Mark all read
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
              className={`tab-pill ${filterTab === "FOLLOWUP" ? "active" : ""}`}
              onClick={() => setFilterTab("FOLLOWUP")}
            >
              Follow-ups
            </button>
            <button
              className={`tab-pill ${filterTab === "ADMISSION" ? "active" : ""}`}
              onClick={() => setFilterTab("ADMISSION")}
            >
              Admissions
            </button>
          </div>

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
                <p>You are completely caught up with your tasks and student updates.</p>
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
                    <div className={`notif-icon-circle ${item.priority?.toLowerCase()}`}>
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
                navigate(isEmployee ? "/employee/followups" : "/leads");
              }}
            >
              <span>{isEmployee ? "Open Follow-up Planner" : "View Lead Management"}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPopover;
