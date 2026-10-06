import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MessageSquare,
  Hash,
  Users,
  Send,
  AlertTriangle,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  AtSign,
  Filter,
  RefreshCw,
  Sparkles,
  Building2,
  Calendar,
  AlertCircle,
  Smile,
  Image as ImageIcon,
  Paperclip,
  Download,
  Eye,
  Maximize2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getUserChatGroups,
  getChatGroupDetails,
  createTeamChatGroup,
  getChatGroupMessages,
  sendChatGroupMessage,
  compressAndPrepareImage,
  downloadChatAttachment,
} from "../../services/chatService";
import { getEmployees } from "../../services/employeeService";
import { useAuth } from "../../context/AuthContext";
import "./TeamChat.css";

const TeamChat = () => {
  const { user } = useAuth();
  const userRole = String(user?.role || "").toUpperCase();
  const canCreateGroup = ["TL", "MANAGER", "ADMIN", "SUPER_ADMIN", "HR"].includes(userRole);

  // Groups and active selection
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showMobileChannels, setShowMobileChannels] = useState(false);

  // Group Details & Members (with live availability)
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);

  // Messages
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  // Mentions Autocomplete State
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedEmployees, setMentionedEmployees] = useState(new Set());
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Attachments & Image Upload State
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const fileInputRef = useRef(null);

  // Create Group Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [allStaffList, setAllStaffList] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState(new Set());
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");

  // Search Filter for channels
  const [groupSearchQuery, setGroupSearchQuery] = useState("");

  // 1. Fetch All Groups for Logged In User
  const loadGroups = useCallback(async (selectGroupId = null) => {
    try {
      setLoadingGroups(true);
      const res = await getUserChatGroups();
      const groupList = res?.data?.groups || [];
      setGroups(groupList);

      if (groupList.length > 0) {
        if (selectGroupId) {
          const found = groupList.find((g) => Number(g.id) === Number(selectGroupId));
          setActiveGroup(found || groupList[0]);
        } else if (!activeGroup) {
          // Default to All Company or first group
          const allCompany = groupList.find((g) => g.is_default || g.group_type === "ALL_COMPANY");
          setActiveGroup(allCompany || groupList[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load chat groups:", err);
      toast.error("Could not load chat channels.");
    } finally {
      setLoadingGroups(false);
    }
  }, [activeGroup]);

  useEffect(() => {
    loadGroups();
  }, []);

  // 2. Fetch Active Group Details & Members with Live Status
  const loadGroupDetails = useCallback(async (groupId) => {
    if (!groupId) return;
    try {
      setLoadingMembers(true);
      const res = await getChatGroupDetails(groupId);
      setMembers(res?.data?.members || []);
    } catch (err) {
      console.error("Failed to load group details:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  // 3. Fetch Messages for Active Group
  const loadMessages = useCallback(async (groupId, isPolling = false) => {
    if (!groupId) return;
    try {
      if (!isPolling) setLoadingMessages(true);
      const res = await getChatGroupMessages(groupId);
      const newMessages = res?.data?.messages || [];
      setMessages(newMessages);
    } catch (err) {
      if (!isPolling) console.error("Failed to load messages:", err);
    } finally {
      if (!isPolling) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeGroup?.id) {
      loadGroupDetails(activeGroup.id);
      loadMessages(activeGroup.id);
    }
  }, [activeGroup?.id, loadGroupDetails, loadMessages]);

  // Polling for live messages every 4 seconds
  useEffect(() => {
    if (!activeGroup?.id) return;
    const interval = setInterval(() => {
      loadMessages(activeGroup.id, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeGroup?.id, loadMessages]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Mentions Detection in Text Input
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);

    // Detect if cursor is right after @
    const cursor = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.slice(lastAtIndex + 1);
      // Only show popup if no space after @ or within short typing query
      if (!query.includes("\n") && query.length <= 25) {
        setShowMentionPopup(true);
        setMentionFilter(query.toLowerCase());
        setSelectedMentionIndex(0);
        return;
      }
    }
    setShowMentionPopup(false);
  };

  // Filter members matching mention search
  const filteredMentionMembers = useMemo(() => {
    if (!members) return [];
    if (!mentionFilter) return members;
    return members.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(mentionFilter) ||
        m.employee_code?.toLowerCase().includes(mentionFilter) ||
        m.designation?.toLowerCase().includes(mentionFilter)
    );
  }, [members, mentionFilter]);

  const insertMention = (member) => {
    if (!member) return;
    const cursor = inputRef.current ? inputRef.current.selectionStart : inputText.length;
    const textBeforeCursor = inputText.slice(0, cursor);
    const textAfterCursor = inputText.slice(cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const newText =
        textBeforeCursor.slice(0, lastAtIndex) +
        `@${member.full_name} ` +
        textAfterCursor;
      setInputText(newText);
      setMentionedEmployees((prev) => new Set([...prev, member.employee_id]));
    }
    setShowMentionPopup(false);
    if (inputRef.current) inputRef.current.focus();

    // Instant warning toast if member is OFF today
    if (member.is_off_today) {
      toast(
        (t) => (
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>⚠️</span>
            <span>
              <strong>{member.full_name}</strong> is <strong>OFF Today</strong> ({member.off_reason}). They may not respond immediately.
            </span>
          </span>
        ),
        { icon: "🔴", duration: 4000 }
      );
    }
  };

  // Identify any currently typed mentioned members that are OFF today to show top alert banner
  const activeOffMentions = useMemo(() => {
    if (!inputText || !members) return [];
    const offList = [];
    members.forEach((m) => {
      if (m.is_off_today && inputText.includes(`@${m.full_name}`)) {
        offList.push(m);
      }
    });
    return offList;
  }, [inputText, members]);

  // Format bytes helper
  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Image Selection Handler
  const handleImageFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImage(true);
    try {
      const processed = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not a supported image file.`);
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 15MB).`);
          continue;
        }
        const prepared = await compressAndPrepareImage(file);
        processed.push(prepared);
      }

      if (processed.length > 0) {
        setSelectedAttachments((prev) => [...prev, ...processed]);
      }
    } catch (err) {
      console.error("Image processing error:", err);
      toast.error(err.message || "Failed to process image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Remove pending attachment
  const handleRemoveAttachment = (attachmentId) => {
    setSelectedAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  // Paste image from clipboard handler
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          setUploadingImage(true);
          try {
            const prepared = await compressAndPrepareImage(file);
            setSelectedAttachments((prev) => [...prev, prepared]);
            toast.success("Image pasted from clipboard! 📋");
          } catch {
            toast.error("Failed to paste image.");
          } finally {
            setUploadingImage(false);
          }
          break;
        }
      }
    }
  };

  // Download image handler
  const handleDownloadImage = (attachment, e) => {
    if (e) e.stopPropagation();
    downloadChatAttachment(attachment);
    toast.success("Image downloading to your device! 📥");
  };

  // 5. Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const hasText = inputText.trim().length > 0;
    const hasImages = selectedAttachments.length > 0;

    if ((!hasText && !hasImages) || !activeGroup?.id || sending) return;

    // Detect all mentioned IDs from text
    const mentionedIds = [];
    members.forEach((m) => {
      if (inputText.includes(`@${m.full_name}`)) {
        mentionedIds.push(m.employee_id);
      }
    });

    try {
      setSending(true);
      const res = await sendChatGroupMessage(activeGroup.id, {
        messageText: inputText,
        mentionedEmployeeIds: mentionedIds,
        attachments: selectedAttachments,
      });

      setInputText("");
      setSelectedAttachments([]);
      setShowMentionPopup(false);
      setMentionedEmployees(new Set());

      // Add new message to list
      if (res?.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
      }

      // Check if server returned off alerts
      if (res?.data?.off_alerts && res.data.off_alerts.length > 0) {
        res.data.off_alerts.forEach((alert) => {
          toast(
            `🔴 ${alert.full_name} is OFF Today (${alert.off_reason}). Message sent.`,
            { duration: 4000 }
          );
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to send message.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key for sending (Shift+Enter for newline)
  const handleKeyDown = (e) => {
    if (showMentionPopup && filteredMentionMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % filteredMentionMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev === 0 ? filteredMentionMembers.length - 1 : prev - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMentionMembers[selectedMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowMentionPopup(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 6. Open Create Group Modal
  const openCreateGroupModal = async () => {
    setShowCreateModal(true);
    setNewGroupName("");
    setNewGroupDesc("");
    setSelectedStaffIds(new Set());
    try {
      const res = await getEmployees({ limit: 100 });
      const list = res?.data?.employees || res?.employees || [];
      setAllStaffList(list);
    } catch (err) {
      console.error("Failed to load staff for group creation:", err);
    }
  };

  const handleToggleStaffSelect = (empId) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error("Please enter a group name.");
      return;
    }
    try {
      setCreatingGroup(true);
      const res = await createTeamChatGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        memberEmployeeIds: Array.from(selectedStaffIds),
      });

      toast.success(`Group "${newGroupName}" created successfully! Super Admin & HR added automatically. 🎉`);
      setShowCreateModal(false);
      await loadGroups(res?.data?.id);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to create team group.";
      toast.error(msg);
    } finally {
      setCreatingGroup(false);
    }
  };

  // 7. Format Mention Highlights in Message Text
  const renderFormattedMessage = (text) => {
    if (!text) return "";
    // Match @[Word or Multiple Words]
    const parts = text.split(/(@[a-zA-Z0-9_\s]{2,35}(?=\s|[.,!?]|$))/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const mentionedName = part.slice(1).trim();
        const matchedMember = members.find(
          (m) => m.full_name?.toLowerCase() === mentionedName.toLowerCase()
        );
        const isOff = matchedMember?.is_off_today;

        return (
          <span
            key={i}
            className={`mention-pill ${isOff ? "mention-off" : ""}`}
            title={
              isOff
                ? `🔴 ${matchedMember?.full_name} is OFF Today (${matchedMember?.off_reason})`
                : matchedMember
                ? `🟢 ${matchedMember?.full_name} (${matchedMember?.designation || matchedMember?.role})`
                : part
            }
          >
            {isOff ? "🔴 " : "@"}
            {part.slice(1)}
          </span>
        );
      }
      return part;
    });
  };

  // Filter staff in Create Modal
  const filteredModalStaff = useMemo(() => {
    if (!allStaffList) return [];
    if (!staffSearchQuery) return allStaffList;
    const q = staffSearchQuery.toLowerCase();
    return allStaffList.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.designation?.toLowerCase().includes(q) ||
        s.department_name?.toLowerCase().includes(q)
    );
  }, [allStaffList, staffSearchQuery]);

  // Filter channels
  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!groupSearchQuery) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()));
  }, [groups, groupSearchQuery]);

  return (
    <div className="team-chat-wrapper">
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR: Channels & Team Groups                   */}
      {/* ======================================================== */}
      <aside className={`chat-sidebar ${showMobileChannels ? "mobile-active" : "mobile-hidden"}`}>
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title">
            <MessageSquare size={20} className="text-primary" />
            <h2>Team Chat</h2>
          </div>
          <div className="chat-sidebar-header-actions">
            {canCreateGroup && (
              <button
                type="button"
                className="chat-btn-new-group"
                onClick={openCreateGroupModal}
                title="Create New Team Group"
              >
                <Plus size={16} />
                <span>New</span>
              </button>
            )}
            {activeGroup && (
              <button
                type="button"
                className="chat-btn-mobile-close-sidebar"
                onClick={() => setShowMobileChannels(false)}
                title="Return to conversation"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Channel Search */}
        <div className="chat-search-box">
          <Search size={14} className="chat-search-icon" />
          <input
            type="text"
            placeholder="Search channels..."
            value={groupSearchQuery}
            onChange={(e) => setGroupSearchQuery(e.target.value)}
          />
        </div>

        {/* Channels List */}
        <div className="chat-groups-list">
          {loadingGroups ? (
            <div className="chat-loading-state">
              <RefreshCw size={18} className="animate-spin" />
              <span>Loading channels...</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="chat-empty-state">No groups found</div>
          ) : (
            filteredGroups.map((g) => {
              const isActive = activeGroup?.id === g.id;
              const isAllCompany = g.is_default || g.group_type === "ALL_COMPANY";

              return (
                <div
                  key={g.id}
                  className={`chat-group-item ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setActiveGroup(g);
                    setShowMobileChannels(false);
                  }}
                >
                  <div className="chat-group-icon-wrap">
                    {isAllCompany ? (
                      <Sparkles size={16} className="all-company-icon" />
                    ) : (
                      <Hash size={16} />
                    )}
                  </div>

                  <div className="chat-group-info">
                    <div className="chat-group-name-row">
                      <span className="chat-group-name" title={g.name}>
                        {g.name}
                      </span>
                      {Number(g.unread_count) > 0 && (
                        <span className="chat-unread-badge">{g.unread_count}</span>
                      )}
                    </div>
                    <div className="chat-group-snippet">
                      {g.last_message_text ? (
                        <span>
                          <strong>{g.last_message_sender_name?.split(" ")[0] || "User"}: </strong>
                          {g.last_message_text}
                        </span>
                      ) : (
                        <span className="text-muted">No messages yet</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* User Status Bar at Bottom */}
        <div className="chat-user-status-bar">
          <div className="chat-user-avatar">
            {user?.profile_image ? (
              <img src={user.profile_image} alt={user.full_name} />
            ) : (
              <span>{user?.full_name?.charAt(0) || "U"}</span>
            )}
            <span className="online-status-dot" />
          </div>
          <div className="chat-user-meta">
            <span className="chat-user-name">{user?.full_name || "Employee"}</span>
            <span className="chat-user-role">{userRole}</span>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. CENTER: Chat Feed & Messaging Area                    */}
      {/* ======================================================== */}
      <main className={`chat-main-area ${showMobileChannels ? "mobile-hidden" : "mobile-active"}`}>
        {/* Top Chat Header */}
        <header className="chat-main-header">
          <div className="chat-header-left">
            <div className="chat-header-title-row">
              <button
                type="button"
                className="btn-mobile-back-channels"
                onClick={() => setShowMobileChannels(true)}
                title="View All Channels"
              >
                <ChevronLeft size={19} />
                <span>Channels</span>
              </button>

              <span className="chat-header-hash">
                {activeGroup?.is_default || activeGroup?.group_type === "ALL_COMPANY" ? "🌐" : "#"}
              </span>
              <h3>{activeGroup?.name || "Select a Channel"}</h3>
              {activeGroup?.department_name && (
                <span className="chat-dept-badge">
                  <Building2 size={12} /> {activeGroup.department_name}
                </span>
              )}
            </div>
            <p className="chat-header-desc">
              {activeGroup?.description || "Welcome to the team channel."}
            </p>
          </div>

          <div className="chat-header-actions">
            {/* Live Off Count */}
            {members.filter((m) => m.is_off_today).length > 0 && (
              <div
                className="chat-off-summary-pill"
                onClick={() => setShowMembersDrawer(true)}
                title="Click to see who is off today"
              >
                <span className="off-dot" />
                <span>
                  <strong>{members.filter((m) => m.is_off_today).length}</strong> Off Today
                </span>
              </div>
            )}

            <button
              type="button"
              className={`chat-toggle-members-btn ${showMembersDrawer ? "active" : ""}`}
              onClick={() => setShowMembersDrawer(!showMembersDrawer)}
              title="View Channel Members & Live Status"
            >
              <Users size={16} />
              <span>{members.length} Members</span>
            </button>
          </div>
        </header>

        {/* Live Off Warning Alert Banner (Appears dynamically if user mentions an off person) */}
        {activeOffMentions.length > 0 && (
          <div className="chat-off-alert-banner">
            <AlertCircle size={18} className="text-warning-icon" />
            <div className="chat-off-alert-content">
              <strong>Notice: </strong>
              {activeOffMentions.map((m, idx) => (
                <span key={m.employee_id}>
                  <strong>{m.full_name}</strong> is <strong>OFF Today</strong> ({m.off_reason})
                  {idx < activeOffMentions.length - 1 ? ", " : ". "}
                </span>
              ))}
              <span>They may not reply right away.</span>
            </div>
          </div>
        )}

        {/* Messages Feed */}
        <div className="chat-messages-container">
          {loadingMessages ? (
            <div className="chat-loading-state">
              <RefreshCw size={24} className="animate-spin text-primary" />
              <span>Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-messages-empty">
              <div className="chat-empty-bubble">
                <MessageSquare size={36} />
              </div>
              <h4>Welcome to #{activeGroup?.name}!</h4>
              <p>
                Start the conversation. Type <strong>@</strong> to mention any colleague and ask about work.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMine = String(msg.sender_id) === String(user?.id);
              const senderRole = String(msg.sender_role || "").toUpperCase();

              return (
                <div
                  key={msg.id || index}
                  className={`chat-message-row ${isMine ? "my-message" : ""}`}
                >
                  <div className="msg-avatar">
                    {msg.sender_avatar ? (
                      <img src={msg.sender_avatar} alt={msg.sender_name} />
                    ) : (
                      <span>{msg.sender_name?.charAt(0) || "U"}</span>
                    )}
                  </div>

                  <div className="msg-content-box">
                    <div className="msg-header">
                      <span className="msg-sender-name">{msg.sender_name}</span>
                      {senderRole && (
                        <span className={`msg-role-tag role-${senderRole.toLowerCase()}`}>
                          {msg.sender_designation || senderRole}
                        </span>
                      )}
                      <span className="msg-time">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="msg-body">{renderFormattedMessage(msg.message_text)}</div>

                    {/* Attached Images */}
                    {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className="msg-attachments-grid">
                        {msg.attachments.map((att, attIdx) => (
                          <div key={att.id || attIdx} className="msg-attachment-card">
                            <div
                              className="msg-attachment-img-wrapper"
                              onClick={() => setPreviewImageModal(att)}
                              title="Click to view full image"
                            >
                              <img
                                src={att.url}
                                alt={att.name || "Attachment"}
                                className="msg-attachment-thumbnail"
                                loading="lazy"
                              />
                              <div className="msg-attachment-overlay">
                                <span className="overlay-view-hint">
                                  <Eye size={14} /> Full View
                                </span>
                              </div>
                            </div>

                            <div className="msg-attachment-footer">
                              <div className="msg-attachment-info">
                                <span className="msg-attachment-filename" title={att.name}>
                                  {att.name || "Image"}
                                </span>
                                <span className="msg-attachment-filesize">
                                  {formatBytes(att.size)}
                                </span>
                              </div>

                              <button
                                type="button"
                                className="btn-download-attachment"
                                onClick={(e) => handleDownloadImage(att, e)}
                                title="Download image to your phone or computer"
                              >
                                <Download size={13} />
                                <span>Download</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with Mention Autocomplete Popup */}
        <div className="chat-input-wrapper">
          {/* Autocomplete Mention Popup */}
          {showMentionPopup && filteredMentionMembers.length > 0 && (
            <div className="chat-mention-popup">
              <div className="mention-popup-header">
                <AtSign size={13} />
                <span>Mention a Team Member (Shows Live Status)</span>
              </div>
              <div className="mention-popup-list">
                {filteredMentionMembers.slice(0, 8).map((mem, idx) => (
                  <div
                    key={mem.employee_id}
                    className={`mention-popup-item ${idx === selectedMentionIndex ? "selected" : ""}`}
                    onClick={() => insertMention(mem)}
                    onMouseEnter={() => setSelectedMentionIndex(idx)}
                  >
                    <div className="mention-item-avatar">
                      {mem.profile_image ? (
                        <img src={mem.profile_image} alt={mem.full_name} />
                      ) : (
                        <span>{mem.full_name?.charAt(0) || "U"}</span>
                      )}
                      <span
                        className={`status-dot-mini ${
                          mem.is_off_today
                            ? "status-off"
                            : mem.availability_status === "ONLINE"
                            ? "status-online"
                            : "status-offline"
                        }`}
                      />
                    </div>

                    <div className="mention-item-info">
                      <span className="mention-item-name">{mem.full_name}</span>
                      <span className="mention-item-role">
                        {mem.designation || mem.role || "Staff"}
                      </span>
                    </div>

                    {/* Live Availability Badge */}
                    <div className="mention-item-status">
                      {mem.is_off_today ? (
                        <span className="status-badge-off" title={mem.off_reason}>
                          🔴 OFF TODAY
                        </span>
                      ) : mem.availability_status === "ONLINE" ? (
                        <span className="status-badge-online">🟢 In Office</span>
                      ) : (
                        <span className="status-badge-offline">🟡 Not Checked In</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Attachments Preview Bar */}
          {selectedAttachments.length > 0 && (
            <div className="chat-attachment-previews">
              {selectedAttachments.map((att) => (
                <div key={att.id} className="attachment-preview-card">
                  <img src={att.url} alt={att.name} className="attachment-preview-img" />
                  <div className="attachment-preview-meta">
                    <span className="attachment-preview-name">{att.name}</span>
                    <span className="attachment-preview-size">{formatBytes(att.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="attachment-remove-btn"
                    onClick={() => handleRemoveAttachment(att.id)}
                    title="Remove image"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Form */}
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <button
              type="button"
              className="chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Photo / Image"
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <RefreshCw size={18} className="animate-spin text-primary" />
              ) : (
                <ImageIcon size={19} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageFileChange}
              style={{ display: "none" }}
            />

            <textarea
              ref={inputRef}
              className="chat-textarea"
              placeholder={`Message #${activeGroup?.name || "team"}... (Type @ to mention, click 📷 or paste images)`}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={2}
            />

            <button
              type="submit"
              className="chat-send-btn"
              disabled={(!inputText.trim() && selectedAttachments.length === 0) || sending}
              title="Send Message (Enter)"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="chat-input-tip">
            <span>
              💡 Tip: Click 📷 or paste (Ctrl+V) images to attach. Press <strong>Enter</strong> to send.
            </span>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. RIGHT DRAWER: Live Members Directory & Availability   */}
      {/* ======================================================== */}
      {showMembersDrawer && (
        <aside className="chat-members-drawer">
          <div className="drawer-header">
            <div className="drawer-title">
              <Users size={18} />
              <h4>Group Members ({members.length})</h4>
            </div>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={() => setShowMembersDrawer(false)}
            >
              <X size={16} />
            </button>
          </div>

          {/* Live Status Legend */}
          <div className="drawer-legend">
            <span className="legend-item">
              <span className="dot dot-online" /> In Office
            </span>
            <span className="legend-item">
              <span className="dot dot-off" /> Off Today
            </span>
            <span className="legend-item">
              <span className="dot dot-not-checked" /> Not In Yet
            </span>
          </div>

          <div className="drawer-members-list">
            {members.map((mem) => (
              <div
                key={mem.employee_id}
                className={`drawer-member-card ${mem.is_off_today ? "is-off" : ""}`}
                onClick={() => {
                  insertMention(mem);
                  if (inputRef.current) inputRef.current.focus();
                }}
                title="Click to mention in chat"
              >
                <div className="drawer-member-avatar">
                  {mem.profile_image ? (
                    <img src={mem.profile_image} alt={mem.full_name} />
                  ) : (
                    <span>{mem.full_name?.charAt(0) || "U"}</span>
                  )}
                  <span
                    className={`live-dot ${
                      mem.is_off_today
                        ? "dot-off"
                        : mem.availability_status === "ONLINE"
                        ? "dot-online"
                        : "dot-not-checked"
                    }`}
                  />
                </div>

                <div className="drawer-member-info">
                  <div className="drawer-member-name-row">
                    <span className="drawer-member-name">{mem.full_name}</span>
                    {mem.group_member_role === "OWNER" && (
                      <span className="owner-badge">TL / Owner</span>
                    )}
                  </div>
                  <span className="drawer-member-designation">
                    {mem.designation || mem.role || "Team Member"}
                  </span>

                  {/* Real-time Status Badge */}
                  <div className="drawer-member-status-row">
                    {mem.is_off_today ? (
                      <span className="drawer-badge-off">
                        🔴 {mem.off_reason || "OFF Today"}
                      </span>
                    ) : mem.availability_status === "ONLINE" ? (
                      <span className="drawer-badge-online">
                        🟢 Checked In
                      </span>
                    ) : (
                      <span className="drawer-badge-idle">
                        🟡 Not Checked In
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: Create New Team Group                          */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="chat-create-modal">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Users size={20} className="text-primary" />
                <h3>Create New Team Group</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="modal-body">
              {/* Compliance / Auto-inclusion Notice */}
              <div className="chat-modal-notice">
                <ShieldCheck size={18} className="text-primary" />
                <div>
                  <strong>Management Oversight:</strong>
                  <p>
                    Super Admin and HR are automatically added to all team groups for compliance and tracking.
                  </p>
                </div>
              </div>

              {/* Group Name */}
              <div className="form-group">
                <label>
                  Group Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. SEO Team, Sales Squad, Graphic Designers"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="e.g. Daily tasks, query discussions, and coordination"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                />
              </div>

              {/* Select Members */}
              <div className="form-group">
                <label>Add Team Members ({selectedStaffIds.size} selected)</label>
                <div className="modal-staff-search">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search employees to add..."
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                  />
                </div>

                <div className="modal-staff-checklist">
                  {filteredModalStaff.map((emp) => {
                    const isSelected = selectedStaffIds.has(emp.id);
                    return (
                      <div
                        key={emp.id}
                        className={`staff-check-item ${isSelected ? "checked" : ""}`}
                        onClick={() => handleToggleStaffSelect(emp.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                        />
                        <div className="staff-check-avatar">
                          {emp.profile_image ? (
                            <img src={emp.profile_image} alt={emp.full_name} />
                          ) : (
                            <span>{emp.full_name?.charAt(0) || "E"}</span>
                          )}
                        </div>
                        <div className="staff-check-meta">
                          <span className="staff-check-name">{emp.full_name}</span>
                          <span className="staff-check-sub">
                            {emp.designation || emp.role} • {emp.department_name || "General"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit-group"
                  disabled={!newGroupName.trim() || creatingGroup}
                >
                  {creatingGroup ? "Creating Group..." : "Create Team Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview & Download Modal */}
      {previewImageModal && (
        <div className="chat-lightbox-backdrop" onClick={() => setPreviewImageModal(null)}>
          <div className="chat-lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-lightbox-header">
              <div className="lightbox-info">
                <ImageIcon size={18} className="text-blue-500" />
                <span className="lightbox-name">{previewImageModal.name || "Attached Image"}</span>
                <span className="lightbox-size">({formatBytes(previewImageModal.size)})</span>
              </div>
              <div className="lightbox-actions">
                <button
                  type="button"
                  className="btn-lightbox-download"
                  onClick={(e) => handleDownloadImage(previewImageModal, e)}
                  title="Download image directly to your phone or computer"
                >
                  <Download size={16} />
                  <span>Download Image</span>
                </button>
                <button
                  type="button"
                  className="btn-lightbox-close"
                  onClick={() => setPreviewImageModal(null)}
                  title="Close preview"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="chat-lightbox-body">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.name || "Preview"}
                className="chat-lightbox-img"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamChat;
