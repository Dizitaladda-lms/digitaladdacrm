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
  User,
  UserPlus,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getUserChatGroups,
  getChatUsers,
  getOrCreateDirectChat,
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

  // Create Team Group Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [allStaffList, setAllStaffList] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState(new Set());
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");

  // Direct Messaging (1-on-1 Personal Chat) Modal
  const [showDirectChatModal, setShowDirectChatModal] = useState(false);
  const [chatUsers, setChatUsers] = useState([]);
  const [loadingChatUsers, setLoadingChatUsers] = useState(false);
  const [directSearchQuery, setDirectSearchQuery] = useState("");
  const [directRoleFilter, setDirectRoleFilter] = useState("ALL");

  // Search Filter for sidebar channels
  const [groupSearchQuery, setGroupSearchQuery] = useState("");

  // 1. Fetch All Groups & Personal Chats for Logged In User
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
      // If group is a direct chat, update its partner details
      if (res?.data?.group?.partner) {
        setActiveGroup((prev) => ({
          ...prev,
          partner: res.data.group.partner,
          name: res.data.group.partner.name || prev?.name,
        }));
      }
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
        m.designation?.toLowerCase().includes(mentionFilter) ||
        m.role?.toLowerCase().includes(mentionFilter)
    );
  }, [members, mentionFilter]);

  // Insert mention into text
  const handleSelectMention = (member) => {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart;
    const textBeforeCursor = inputText.slice(0, cursor);
    const textAfterCursor = inputText.slice(cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const newTextBefore = textBeforeCursor.slice(0, lastAtIndex) + `@${member.full_name} `;
      setInputText(newTextBefore + textAfterCursor);
      setMentionedEmployees((prev) => new Set([...prev, member.employee_id]));
      setShowMentionPopup(false);

      // Re-focus input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newCursor = newTextBefore.length;
          inputRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 50);
    }
  };

  // 5. Image & Attachment Upload Handler
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image. Only image attachments are supported.`);
        continue;
      }

      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 15MB file size limit.`);
        continue;
      }

      try {
        setUploadingImage(true);
        const processed = await compressAndPrepareImage(file);
        setSelectedAttachments((prev) => [...prev, processed]);
        toast.success(`Attached ${file.name} 📷`);
      } catch (err) {
        toast.error(err.message || "Failed to process image.");
      } finally {
        setUploadingImage(false);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          try {
            setUploadingImage(true);
            const processed = await compressAndPrepareImage(file);
            setSelectedAttachments((prev) => [...prev, processed]);
            toast.success("Image pasted from clipboard 📋");
          } catch (err) {
            toast.error("Could not process pasted image.");
          } finally {
            setUploadingImage(false);
          }
        }
      }
    }
  };

  const removeAttachment = (index) => {
    setSelectedAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDownloadImage = (attachment, e) => {
    if (e) e.stopPropagation();
    downloadChatAttachment(attachment);
    toast.success("Image downloading to your device! 📥");
  };

  // 6. Send Message
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
        handleSelectMention(filteredMentionMembers[selectedMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionPopup(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // 7. Direct Messaging (Personal Chat) Helpers
  const loadChatUsersList = useCallback(async () => {
    try {
      setLoadingChatUsers(true);
      const res = await getChatUsers();
      setChatUsers(res?.data?.users || []);
    } catch (err) {
      console.error("Failed to load chat users:", err);
      toast.error("Could not load colleagues list.");
    } finally {
      setLoadingChatUsers(false);
    }
  }, []);

  const openDirectChatModal = () => {
    setShowDirectChatModal(true);
    setDirectSearchQuery("");
    setDirectRoleFilter("ALL");
    loadChatUsersList();
  };

  const handleStartDirectChat = async (targetEmployeeId) => {
    try {
      toast.loading("Opening personal chat...", { id: "open-dm" });
      const res = await getOrCreateDirectChat(targetEmployeeId);
      const dmGroup = res?.data;
      toast.dismiss("open-dm");

      if (dmGroup) {
        setGroups((prev) => {
          const exists = prev.some((g) => Number(g.id) === Number(dmGroup.id));
          return exists ? prev : [dmGroup, ...prev];
        });
        setActiveGroup(dmGroup);
        setShowDirectChatModal(false);
        setShowMobileChannels(false);
        setShowMembersDrawer(false);
      }
    } catch (err) {
      toast.dismiss("open-dm");
      toast.error(err.response?.data?.message || "Failed to start personal chat.");
    }
  };

  // Filter users in Direct Chat modal
  const filteredChatUsers = useMemo(() => {
    if (!chatUsers) return [];
    let list = chatUsers;

    // Filter by role chip
    if (directRoleFilter === "INTERN") {
      list = list.filter((u) => u.role === "INTERN");
    } else if (directRoleFilter === "EMPLOYEE") {
      list = list.filter((u) => u.role === "EMPLOYEE");
    } else if (directRoleFilter === "COUNSELLOR") {
      list = list.filter((u) => u.role === "COUNSELLOR");
    } else if (directRoleFilter === "TRAINER") {
      list = list.filter((u) => u.role === "TRAINER");
    } else if (directRoleFilter === "TL") {
      list = list.filter((u) => u.role === "TL");
    } else if (directRoleFilter === "ONLINE") {
      list = list.filter((u) => u.availability_status === "ONLINE");
    }

    if (!directSearchQuery) return list;
    const q = directSearchQuery.toLowerCase();
    return list.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q) ||
        u.department_name?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [chatUsers, directRoleFilter, directSearchQuery]);

  // 8. Create Group Modal Helpers
  const openCreateGroupModal = async () => {
    setShowCreateModal(true);
    setNewGroupName("");
    setNewGroupDesc("");
    setSelectedStaffIds(new Set());
    setStaffSearchQuery("");

    try {
      const res = await getEmployees({ limit: 100 });
      setAllStaffList(res?.data?.employees || []);
    } catch (err) {
      console.error("Failed to load staff list:", err);
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

      toast.success("Team Chat Group created successfully! 🚀");
      setShowCreateModal(false);
      await loadGroups(res?.data?.id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group.");
    } finally {
      setCreatingGroup(false);
    }
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

  // Filter channels & direct messages
  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!groupSearchQuery) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()));
  }, [groups, groupSearchQuery]);

  const channelGroups = useMemo(() => {
    return filteredGroups.filter((g) => g.group_type !== "DIRECT");
  }, [filteredGroups]);

  const directGroups = useMemo(() => {
    return filteredGroups.filter((g) => g.group_type === "DIRECT");
  }, [filteredGroups]);

  // Mentions parser for message display
  const renderMessageContent = (text, mentionedIds = []) => {
    if (!text) return null;
    const parts = text.split(/(@[a-zA-Z0-9_\s]+?(?=\s|[.,!?]|$))/g);

    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const nameQuery = part.slice(1).trim().toLowerCase();
        const matchedMember = members.find((m) => m.full_name.toLowerCase() === nameQuery);
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

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const isDirectChat = activeGroup?.group_type === "DIRECT";

  return (
    <div className="team-chat-wrapper">
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR: Channels & Direct Messages               */}
      {/* ======================================================== */}
      <aside className={`chat-sidebar ${showMobileChannels ? "mobile-active" : "mobile-hidden"}`}>
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title">
            <MessageSquare size={20} className="text-primary" />
            <h2>Team Chat</h2>
          </div>
          <div className="chat-sidebar-header-actions">
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

        {/* Global Chat Search */}
        <div className="chat-search-box">
          <Search size={14} className="chat-search-icon" />
          <input
            type="text"
            placeholder="Search channels or chats..."
            value={groupSearchQuery}
            onChange={(e) => setGroupSearchQuery(e.target.value)}
          />
        </div>

        {/* Channels & Direct Messages List */}
        <div className="chat-groups-list">
          {loadingGroups ? (
            <div className="chat-loading-state">
              <RefreshCw size={18} className="animate-spin" />
              <span>Loading conversations...</span>
            </div>
          ) : (
            <>
              {/* SECTION 1: CHANNELS & GROUPS */}
              <div className="chat-sidebar-section-header">
                <span>Channels</span>
                {canCreateGroup && (
                  <button
                    type="button"
                    className="chat-btn-new-dm"
                    onClick={openCreateGroupModal}
                    title="Create New Team Group"
                  >
                    <Plus size={13} />
                    <span>Group</span>
                  </button>
                )}
              </div>

              {channelGroups.length === 0 ? (
                <div className="chat-empty-state" style={{ padding: "8px 12px", fontSize: "12px" }}>
                  No channels found
                </div>
              ) : (
                channelGroups.map((g) => {
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

              {/* SECTION 2: DIRECT MESSAGES (PERSONAL 1-ON-1 CHAT) */}
              <div className="chat-sidebar-section-header" style={{ marginTop: "14px" }}>
                <span>Personal Chats</span>
                <button
                  type="button"
                  className="chat-btn-new-dm"
                  onClick={openDirectChatModal}
                  title="Start Personal Chat with Employee or Intern"
                >
                  <Plus size={13} />
                  <span>New Chat</span>
                </button>
              </div>

              {directGroups.length === 0 ? (
                <div className="chat-empty-state" style={{ padding: "10px 12px", fontSize: "12px" }}>
                  <span>No personal chats yet.</span>
                  <br />
                  <button
                    type="button"
                    onClick={openDirectChatModal}
                    className="chat-btn-new-dm"
                    style={{ marginTop: "6px" }}
                  >
                    <Plus size={12} /> Chat with someone
                  </button>
                </div>
              ) : (
                directGroups.map((g) => {
                  const isActive = activeGroup?.id === g.id;
                  const partner = g.partner;
                  const isOff = partner?.is_off_today;

                  return (
                    <div
                      key={g.id}
                      className={`chat-group-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        setActiveGroup(g);
                        setShowMobileChannels(false);
                      }}
                    >
                      <div className="chat-dm-avatar-wrap">
                        {partner?.avatar ? (
                          <img src={partner.avatar} alt={g.name} />
                        ) : (
                          <span>{g.name?.charAt(0) || "U"}</span>
                        )}
                        <span
                          className={`dm-live-dot ${
                            isOff
                              ? "off"
                              : partner?.availability_status === "ONLINE"
                              ? "online"
                              : "not-checked"
                          }`}
                        />
                      </div>

                      <div className="chat-group-info">
                        <div className="chat-group-name-row">
                          <span className="chat-group-name" title={g.name}>
                            {g.name}
                            {partner?.role === "INTERN" && (
                              <span className="chat-dm-role-badge intern">INTERN</span>
                            )}
                            {isOff && <span className="chat-dm-role-badge off-pill">OFF</span>}
                          </span>
                          {Number(g.unread_count) > 0 && (
                            <span className="chat-unread-badge">{g.unread_count}</span>
                          )}
                        </div>
                        <div className="chat-group-snippet">
                          {g.last_message_text ? (
                            <span>
                              <strong>{g.last_message_sender_name?.split(" ")[0] || "You"}: </strong>
                              {g.last_message_text}
                            </span>
                          ) : (
                            <span className="text-muted">Start personal chat</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
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
            {isDirectChat ? (
              /* Direct Message Top Header */
              <div className="chat-header-dm-info">
                <button
                  type="button"
                  className="btn-mobile-back-channels"
                  onClick={() => setShowMobileChannels(true)}
                  title="View All Conversations"
                >
                  <ChevronLeft size={19} />
                  <span>Chats</span>
                </button>

                <div className="chat-header-dm-avatar">
                  {activeGroup.partner?.avatar ? (
                    <img src={activeGroup.partner.avatar} alt={activeGroup.name} />
                  ) : (
                    <span>{activeGroup.name?.charAt(0) || "U"}</span>
                  )}
                  <span
                    className={`dm-live-dot ${
                      activeGroup.partner?.is_off_today
                        ? "off"
                        : activeGroup.partner?.availability_status === "ONLINE"
                        ? "online"
                        : "not-checked"
                    }`}
                  />
                </div>

                <div className="chat-header-dm-meta">
                  <h3>
                    <span>{activeGroup.name}</span>
                    {activeGroup.partner?.role && (
                      <span
                        className={`chat-dm-role-badge ${
                          activeGroup.partner.role === "INTERN"
                            ? "intern"
                            : activeGroup.partner.role === "TL"
                            ? "tl"
                            : "counsellor"
                        }`}
                      >
                        {activeGroup.partner.role}
                      </span>
                    )}

                    {activeGroup.partner?.is_off_today ? (
                      <span className="chat-header-dm-status-badge off">
                        🔴 {activeGroup.partner.off_reason || "OFF Today"}
                      </span>
                    ) : activeGroup.partner?.availability_status === "ONLINE" ? (
                      <span className="chat-header-dm-status-badge online">
                        🟢 In Office
                      </span>
                    ) : (
                      <span className="chat-header-dm-status-badge idle">
                        🟡 Not Checked In
                      </span>
                    )}
                  </h3>

                  <p>
                    <span>
                      {activeGroup.partner?.designation || activeGroup.partner?.role || "Team Member"}
                    </span>
                    {activeGroup.partner?.department && (
                      <span>• {activeGroup.partner.department}</span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              /* Group / Channel Top Header */
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
                <p className="chat-header-desc" style={{ margin: "2px 0 0 0", width: "100%" }}>
                  {activeGroup?.description || "Team discussion channel."}
                </p>
              </div>
            )}
          </div>

          <div className="chat-header-actions">
            {!isDirectChat && (
              <>
                {/* Live Off Count for Group Channels */}
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
              </>
            )}

            {/* Quick Personal Chat button */}
            <button
              type="button"
              className="chat-toggle-members-btn"
              onClick={openDirectChatModal}
              title="Start a new personal chat"
            >
              <UserPlus size={16} />
              <span>New Chat</span>
            </button>
          </div>
        </header>

        {/* Live Off Notice Banner in Direct Personal Chat */}
        {isDirectChat && activeGroup.partner?.is_off_today && (
          <div className="chat-dm-off-notice-banner">
            <AlertCircle size={17} className="icon" />
            <span>
              <strong>Notice: {activeGroup.name}</strong> is currently{" "}
              <strong>OFF Today ({activeGroup.partner.off_reason || "Weekly Off"})</strong>. You can
              still leave a message, and they will receive it when they are back.
            </span>
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
              <h4>
                {isDirectChat
                  ? `Personal Chat with ${activeGroup?.name}`
                  : `Welcome to #${activeGroup?.name}!`}
              </h4>
              <p>
                {isDirectChat
                  ? "This is the start of your 1-on-1 personal chat. You can send messages, attach images, or ask questions directly."
                  : "Start the conversation. Type @ to mention any colleague and coordinate work."}
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

                  <div className="msg-body">
                    <div className="msg-header">
                      <span className="msg-author">{msg.sender_name}</span>
                      {senderRole && (
                        <span
                          className={`msg-role-tag ${
                            senderRole === "SUPER_ADMIN"
                              ? "tag-admin"
                              : senderRole === "HR"
                              ? "tag-hr"
                              : senderRole === "TL"
                              ? "tag-tl"
                              : senderRole === "INTERN"
                              ? "tag-intern"
                              : "tag-emp"
                          }`}
                        >
                          {senderRole}
                        </span>
                      )}
                      <span className="msg-timestamp">
                        {new Date(msg.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Text Content with @Mentions */}
                    {msg.message_text && (
                      <div className="msg-text">
                        {renderMessageContent(msg.message_text, msg.mentioned_employee_ids)}
                      </div>
                    )}

                    {/* Image Attachments */}
                    {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className="msg-attachments-grid">
                        {msg.attachments.map((att, attIdx) => (
                          <div
                            key={attIdx}
                            className="msg-attachment-card"
                            onClick={() => setPreviewImageModal(att)}
                            title="Click to view full image"
                          >
                            <div className="msg-attachment-img-wrapper">
                              <img src={att.url} alt={att.name || "Attachment"} loading="lazy" />
                              <div className="msg-attachment-overlay">
                                <Maximize2 size={16} />
                                <span>Preview</span>
                              </div>
                            </div>
                            <div className="msg-attachment-meta">
                              <span className="att-name">{att.name || "Attached Image"}</span>
                              <div className="att-actions-row">
                                <span className="att-size">{formatBytes(att.size)}</span>
                                <button
                                  type="button"
                                  className="btn-att-download"
                                  onClick={(e) => handleDownloadImage(att, e)}
                                  title="Download image"
                                >
                                  <Download size={13} />
                                  <span>Save</span>
                                </button>
                              </div>
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

        {/* 3. BOTTOM: Message Input Form with Mentions & Images */}
        <div className="chat-input-wrapper">
          {/* Mentions Autocomplete Popup */}
          {showMentionPopup && filteredMentionMembers.length > 0 && (
            <div className="mentions-popup-menu">
              <div className="mentions-popup-header">
                <AtSign size={13} />
                <span>Mention Team Member</span>
              </div>
              <div className="mentions-popup-list">
                {filteredMentionMembers.slice(0, 7).map((m, idx) => (
                  <div
                    key={m.employee_id}
                    className={`mention-popup-item ${idx === selectedMentionIndex ? "selected" : ""}`}
                    onClick={() => handleSelectMention(m)}
                    onMouseEnter={() => setSelectedMentionIndex(idx)}
                  >
                    <div className="mention-item-avatar">
                      {m.profile_image ? (
                        <img src={m.profile_image} alt={m.full_name} />
                      ) : (
                        <span>{m.full_name?.charAt(0) || "U"}</span>
                      )}
                      <span
                        className={`mention-dot ${
                          m.is_off_today ? "dot-off" : m.availability_status === "ONLINE" ? "dot-online" : "dot-idle"
                        }`}
                      />
                    </div>
                    <div className="mention-item-info">
                      <div className="mention-item-name-row">
                        <strong className="mention-item-name">{m.full_name}</strong>
                        {m.role === "INTERN" && <span className="mention-tag-intern">INTERN</span>}
                      </div>
                      <span className="mention-item-sub">
                        {m.designation || m.role} • {m.department_name || "Dizital Adda"}
                      </span>
                    </div>
                    <div className="mention-item-status">
                      {m.is_off_today ? (
                        <span className="mention-badge-off">🔴 {m.off_reason || "OFF Today"}</span>
                      ) : m.availability_status === "ONLINE" ? (
                        <span className="mention-badge-online">🟢 In Office</span>
                      ) : (
                        <span className="mention-badge-idle">🟡 Not Checked In</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Attachments Strip */}
          {selectedAttachments.length > 0 && (
            <div className="chat-pending-attachments-strip">
              {selectedAttachments.map((att, idx) => (
                <div key={idx} className="pending-attachment-pill">
                  <img src={att.url} alt="Pending thumbnail" className="pending-thumb" />
                  <span className="pending-name">{att.name}</span>
                  <span className="pending-size">({formatBytes(att.size)})</span>
                  <button
                    type="button"
                    className="btn-remove-pending"
                    onClick={() => removeAttachment(idx)}
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="chat-composer-form">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              style={{ display: "none" }}
            />

            {/* Attach Image Button */}
            <button
              type="button"
              className="chat-btn-attach"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage || sending}
              title="Attach Images (PNG, JPG, WEBP)"
            >
              {uploadingImage ? <RefreshCw size={18} className="animate-spin" /> : <ImageIcon size={18} />}
            </button>

            <div className="chat-input-textarea-wrap">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder={
                  isDirectChat
                    ? `Message ${activeGroup?.name}... (Click 📷 or paste images)`
                    : `Message #${activeGroup?.name || "team"}... (Type @ to mention, click 📷 or paste images)`
                }
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={sending}
              />
            </div>

            <button
              type="submit"
              className="chat-btn-send"
              disabled={(!inputText.trim() && selectedAttachments.length === 0) || sending}
              title="Send Message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. RIGHT DRAWER: Group Members & Live Attendance Status   */}
      {/* ======================================================== */}
      {showMembersDrawer && !isDirectChat && (
        <aside className="chat-members-drawer">
          <div className="chat-drawer-header">
            <div className="drawer-title-row">
              <Users size={18} className="text-primary" />
              <h3>Channel Members ({members.length})</h3>
            </div>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={() => setShowMembersDrawer(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="chat-drawer-members-list">
            {members.map((mem) => (
              <div
                key={mem.employee_id}
                className="drawer-member-item"
                onClick={() => {
                  setInputText((prev) => `${prev} @${mem.full_name} `);
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
                    {mem.role === "INTERN" && (
                      <span className="chat-dm-role-badge intern">INTERN</span>
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

                {/* Direct Personal Chat Shortcut */}
                {String(mem.employee_id) !== String(user?.id) && (
                  <button
                    type="button"
                    className="btn-chat-personally"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartDirectChat(mem.employee_id);
                    }}
                    title={`Start 1-on-1 personal chat with ${mem.full_name}`}
                  >
                    <MessageSquare size={13} />
                    <span>Chat</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: Start 1-on-1 Personal Chat with Anyone          */}
      {/* ======================================================== */}
      {showDirectChatModal && (
        <div className="modal-backdrop" onClick={() => setShowDirectChatModal(false)}>
          <div className="chat-dm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <UserPlus size={20} className="text-primary" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Start Personal Chat</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                    Select any employee or intern to begin a private 1-on-1 conversation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowDirectChatModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="chat-dm-search-wrap">
              <Search size={15} className="chat-dm-search-icon" />
              <input
                type="text"
                placeholder="Search by name, designation, department..."
                value={directSearchQuery}
                onChange={(e) => setDirectSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Role Filter Chips */}
            <div className="chat-dm-filter-chips">
              <button
                type="button"
                className={`chip-btn ${directRoleFilter === "ALL" ? "active" : ""}`}
                onClick={() => setDirectRoleFilter("ALL")}
              >
                All Staff
              </button>
              <button
                type="button"
                className={`chip-btn ${directRoleFilter === "INTERN" ? "active" : ""}`}
                onClick={() => setDirectRoleFilter("INTERN")}
              >
                🎓 Interns
              </button>
              <button
                type="button"
                className={`chip-btn ${directRoleFilter === "EMPLOYEE" ? "active" : ""}`}
                onClick={() => setDirectRoleFilter("EMPLOYEE")}
              >
                💼 Employees
              </button>
              <button
                type="button"
                className={`chip-btn ${directRoleFilter === "COUNSELLOR" ? "active" : ""}`}
                onClick={() => setDirectRoleFilter("COUNSELLOR")}
              >
                🎯 Counselors
              </button>
              <button
                type="button"
                className={`chip-btn ${directRoleFilter === "TRAINER" ? "active" : ""}`}
                onClick={() => setDirectRoleFilter("TRAINER")}
              >
                📚 Trainers
              </button>
              <button
                type="button"
                className={`chip-btn ${directRoleFilter === "TL" ? "active" : ""}`}
                onClick={() => setDirectRoleFilter("TL")}
              >
                👑 Team Leads
              </button>
              <button
                type="button"
                className={`chip-btn ${directRoleFilter === "ONLINE" ? "active" : ""}`}
                onClick={() => setDirectRoleFilter("ONLINE")}
              >
                🟢 In Office Today
              </button>
            </div>

            {/* Users List */}
            <div className="chat-dm-user-list">
              {loadingChatUsers ? (
                <div className="chat-loading-state" style={{ padding: "30px 0" }}>
                  <RefreshCw size={20} className="animate-spin text-primary" />
                  <span>Loading colleagues & interns...</span>
                </div>
              ) : filteredChatUsers.length === 0 ? (
                <div className="chat-empty-state" style={{ padding: "30px 10px" }}>
                  No colleagues matched your search.
                </div>
              ) : (
                filteredChatUsers.map((u) => {
                  const isOff = u.is_off_today;
                  return (
                    <div
                      key={u.employee_id}
                      className="chat-dm-user-card"
                      onClick={() => handleStartDirectChat(u.employee_id)}
                    >
                      <div className="chat-dm-user-card-left">
                        <div className="chat-dm-user-avatar">
                          {u.profile_image ? (
                            <img src={u.profile_image} alt={u.full_name} />
                          ) : (
                            <span>{u.full_name?.charAt(0) || "U"}</span>
                          )}
                          <span
                            className={`dm-live-dot ${
                              isOff
                                ? "off"
                                : u.availability_status === "ONLINE"
                                ? "online"
                                : "not-checked"
                            }`}
                          />
                        </div>

                        <div className="chat-dm-user-meta">
                          <div className="chat-dm-user-name-row">
                            <span className="chat-dm-user-name">{u.full_name}</span>
                            {u.role === "INTERN" && (
                              <span className="chat-dm-role-badge intern">INTERN</span>
                            )}
                            {u.role === "TL" && (
                              <span className="chat-dm-role-badge tl">TL</span>
                            )}
                          </div>
                          <div className="chat-dm-user-sub">
                            {u.designation || u.role} • {u.department_name || "General"}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isOff ? (
                          <span className="chat-dm-user-status-pill off">
                            🔴 {u.off_reason || "OFF Today"}
                          </span>
                        ) : u.availability_status === "ONLINE" ? (
                          <span className="chat-dm-user-status-pill online">
                            🟢 In Office
                          </span>
                        ) : (
                          <span className="chat-dm-user-status-pill idle">
                            🟡 Not Checked In
                          </span>
                        )}

                        <button type="button" className="btn-chat-personally">
                          <MessageSquare size={13} />
                          <span>Chat</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL: Create New Team Group                          */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="chat-create-modal" onClick={(e) => e.stopPropagation()}>
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
                    Super Admin and HR are automatically added to all team channels for compliance and tracking.
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
