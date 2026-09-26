import React, { useState, useMemo, useEffect } from "react";
import Modal from "../common/Modal/Modal";
import {
  MessageCircle,
  Mail,
  Smartphone,
  Image,
  Send,
  Sparkles,
  User,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Layers,
  FileText,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { sendBulkBroadcast } from "../../services/communicationService";
import "./BulkOutreachModal.css";

// Standard Institute Graphic Presets
const GRAPHIC_PRESETS = [
  {
    label: "🎓 Course Admission Flyer",
    url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80",
  },
  {
    label: "🏆 100% Placement Record Poster",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
  },
  {
    label: "🎁 Special Scholarship Discount Banner",
    url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80",
  },
  {
    label: "💻 Live Practical Demo Workshop Flyer",
    url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
  },
];

// Channel Specific Templates
const CHANNEL_TEMPLATES = {
  WHATSAPP: [
    {
      id: "wa_admission_open",
      title: "🎓 Admission Open & Scholarship",
      text: `Hello {{name}}! 👋\n\nAdmissions are now open for *{{course}}* at *{{domain}}*! 🚀\n\n🗓️ *Preferred Batch:* {{batch}}\n💼 *Features:* 100% Practical Training + Live Projects + Placement Support.\n🎁 *Special Offer:* Avail up to 30% scholarship if you register this week!\n\nReply *YES* to get the complete course syllabus and scholarship details.`,
      graphic: GRAPHIC_PRESETS[0].url,
    },
    {
      id: "wa_batch_starting",
      title: "⏰ Batch Starting Soon (Limited Seats)",
      text: `Hi {{name}}, great news! 🌟\n\nYour *{{batch}}* for *{{course}}* at *{{domain}}* is starting this Monday!\n\n⚠️ Only 4 seats remaining in this batch to maintain small batch size for 1-on-1 mentorship.\n\nReply *CONFIRM* to lock your seat or call our counselor.`,
      graphic: GRAPHIC_PRESETS[1].url,
    },
    {
      id: "wa_scholarship_offer",
      title: "🎁 Special Scholarship & Fee Discount",
      text: `Dear {{name}},\n\nCongratulations! Based on your enquiry for *{{course}}*, you are eligible for an exclusive institute scholarship at *{{domain}}*! 🎉\n\n💰 Special concession available on tuition fees for {{batch}}.\n⏰ Offer valid for the next 48 hours only.\n\nReply *INTERESTED* to speak with our senior academic counsellor today!`,
      graphic: GRAPHIC_PRESETS[2].url,
    },
    {
      id: "wa_free_demo",
      title: "💻 Free Live Demo Class Invitation",
      text: `Hi {{name}}! 🎓\n\nYou are invited to attend our *Free Practical Live Demo Workshop* on *{{course}}* at *{{domain}}*.\n\n🗓️ *Date:* This Saturday at 11:00 AM\n👨‍🏫 *Mentor:* Industry Expert with 8+ years experience\n\nLearn live, see real-world projects, and ask all your doubts!\nReply *ATTEND* to receive your access pass.`,
      graphic: GRAPHIC_PRESETS[3].url,
    },
    {
      id: "wa_counsellor_followup",
      title: "📞 Counsellor Follow-up Note",
      text: `Hello {{name}},\n\nThis is {{counsellor}} from *{{domain}}*. I tried reaching you regarding your recent enquiry for *{{course}}*.\n\nI would love to help guide you regarding high-growth job opportunities, syllabus, and {{batch}} timings.\n\nPlease let me know when is a good time to connect. Have a great day!`,
      graphic: "",
    },
    {
      id: "wa_custom",
      title: "✍️ Custom Message",
      text: `Hello {{name}},\n\nWe have exciting updates regarding *{{course}}* at *{{domain}}*!\n\nContact us today for batch details.`,
      graphic: "",
    },
  ],
  EMAIL: [
    {
      id: "email_admission_open",
      title: "🎓 Admissions Open & Course Curriculum",
      subject: `Admissions Open: {{course}} at {{domain}} - Up to 30% Scholarship`,
      text: `Dear {{name}},\n\nWe are delighted to invite you to enroll in our flagship {{course}} program at {{domain}}.\n\nKey Highlights:\n- 100% Hands-on Practical Training\n- Live Industry Capstone Projects & Internship\n- Complete Placement Assistance & Mock Interviews\n- Preferred Batch: {{batch}}\n\nAs you enquired recently, you are eligible for our Early-Bird Scholarship with up to 30% concession on tuition fees.\n\nKindly reply to this email or contact us at +91 9355121681 to reserve your seat.\n\nWarm regards,\n{{counsellor}}\nAdmissions Department | {{domain}}`,
      graphic: GRAPHIC_PRESETS[0].url,
    },
    {
      id: "email_batch_start",
      title: "⏰ Upcoming Batch Starting Alert",
      subject: `Important: {{batch}} for {{course}} Starting This Monday - Confirm Seat`,
      text: `Dear {{name}},\n\nThis is a quick reminder that our upcoming batch for {{course}} is scheduled to commence this Monday at {{domain}}.\n\n- Program: {{course}}\n- Selected Batch: {{batch}}\n- Seats Available: Only 4 seats left\n\nTo ensure personalized attention, batch intake is strictly limited. Please confirm your registration today to avoid missing out on this intake.\n\nBest regards,\n{{counsellor}}\nAdmissions Desk | {{domain}}`,
      graphic: GRAPHIC_PRESETS[1].url,
    },
    {
      id: "email_scholarship",
      title: "🎁 Merit Scholarship Approval Letter",
      subject: `Special Scholarship Approved for {{name}} - {{course}} at {{domain}}`,
      text: `Dear {{name}},\n\nWe are pleased to inform you that your application for a merit-based fee concession on {{course}} at {{domain}} has been approved by our Academic Council!\n\nSpecial Benefits:\n- Instant fee reduction applicable on {{batch}}\n- Full access to LMS & learning resources\n- Valid for the next 48 hours only\n\nTo claim this scholarship, reply to this email or speak directly with our senior counsellor.\n\nSincerely,\n{{counsellor}}\nFinancial Aid & Admissions | {{domain}}`,
      graphic: GRAPHIC_PRESETS[2].url,
    },
    {
      id: "email_demo_pass",
      title: "💻 Free Live Demo Workshop Access Pass",
      subject: `Your Access Pass: Free Live Demo Workshop on {{course}} this Saturday`,
      text: `Hi {{name}},\n\nYou're officially invited to attend our Free Live Practical Workshop on {{course}} at {{domain}}!\n\n🗓️ Date: This Saturday\n⏰ Time: 11:00 AM IST\n👨‍🏫 Mentor: Senior Industry Lead\n🎯 Agenda: Live demo, real-world case studies, career roadmap & live Q&A\n\nClick the link below or reply to this email to confirm your attendance.\n\nBest regards,\n{{counsellor}}\n{{domain}} Team`,
      graphic: GRAPHIC_PRESETS[3].url,
    },
    {
      id: "email_custom",
      title: "✍️ Custom Email",
      subject: `Update regarding {{course}} from {{domain}}`,
      text: `Dear {{name}},\n\nWe have an important update regarding your interest in {{course}} at {{domain}} ({{batch}}).\n\nPlease let us know how we can best assist you.\n\nWarm regards,\n{{counsellor}}`,
      graphic: "",
    },
  ],
  SMS: [
    {
      id: "sms_admission",
      title: "🎓 Admission Alert",
      text: `Dear {{name}}, admissions are open for {{course}} ({{batch}}) at {{domain}}. Avail 30% scholarship this week! Call/WhatsApp +919355121681 to book your seat.`,
    },
    {
      id: "sms_batch_start",
      title: "⏰ Batch Start Reminder",
      text: `Hi {{name}}, your {{batch}} for {{course}} at {{domain}} starts this Monday. Only 4 seats left. Reply YES to confirm or call +919355121681.`,
    },
    {
      id: "sms_scholarship",
      title: "🎁 Scholarship Concession",
      text: `Dear {{name}}, special fee concession approved for {{course}} at {{domain}}! Valid for 48 hrs only. Call +919355121681 to claim.`,
    },
    {
      id: "sms_demo",
      title: "💻 Free Demo Class Pass",
      text: `Hello {{name}}, attend Free Live Demo Class for {{course}} this Sat 11 AM at {{domain}}. Book your free pass: https://dizitaladda.com`,
    },
    {
      id: "sms_followup",
      title: "📞 Counsellor Call Request",
      text: `Hi {{name}}, {{counsellor}} from {{domain}} tried reaching you regarding {{course}}. Pls call back on +919355121681.`,
    },
    {
      id: "sms_custom",
      title: "✍️ Custom SMS",
      text: `Hello {{name}}, update regarding {{course}} at {{domain}}. Contact us today!`,
    },
  ],
};

const BulkOutreachModal = ({
  open = false,
  initialChannel = "WHATSAPP", // "WHATSAPP" | "EMAIL" | "SMS"
  leads = [],
  onClose,
  onSuccess,
  currentUser = {},
}) => {
  const [activeChannel, setActiveChannel] = useState(initialChannel);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subjectText, setSubjectText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [attachGraphic, setAttachGraphic] = useState(true);
  const [graphicUrl, setGraphicUrl] = useState(GRAPHIC_PRESETS[0].url);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [sendingMode, setSendingMode] = useState("launcher"); // "launcher" | "api"
  const [sentStudentIds, setSentStudentIds] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync initial channel when modal opens
  useEffect(() => {
    if (open) {
      setActiveChannel(initialChannel || "WHATSAPP");
      loadDefaultTemplate(initialChannel || "WHATSAPP");
    }
  }, [open, initialChannel]);

  const loadDefaultTemplate = (channel) => {
    const list = CHANNEL_TEMPLATES[channel] || [];
    if (list.length > 0) {
      const first = list[0];
      setSelectedTemplateId(first.id);
      setMessageText(first.text || "");
      setSubjectText(first.subject || "");
      if (first.graphic) {
        setAttachGraphic(true);
        setGraphicUrl(first.graphic);
      } else {
        setAttachGraphic(false);
      }
    }
  };

  const handleChannelSwitch = (channel) => {
    setActiveChannel(channel);
    loadDefaultTemplate(channel);
    setPreviewIndex(0);
  };

  // Filter valid leads depending on channel
  const validLeads = useMemo(() => {
    return leads.filter((l) => {
      if (activeChannel === "EMAIL") {
        return l.email && l.email.includes("@");
      }
      const clean = String(l.mobile || "").replace(/\D/g, "");
      return clean.length >= 10;
    });
  }, [leads, activeChannel]);

  const currentLead = validLeads[previewIndex] || validLeads[0] || {
    full_name: "Rahul Sharma",
    mobile: "9876543210",
    email: "rahul.sharma@gmail.com",
    interested_course: "Digital Marketing",
    domain: "DizitalAdda",
    preferred_centre: "Morning Batch (9:00 AM - 12:00 PM)",
  };

  const handleSelectTemplate = (tmpl) => {
    setSelectedTemplateId(tmpl.id);
    setMessageText(tmpl.text || "");
    setSubjectText(tmpl.subject || "");
    if (tmpl.graphic) {
      setAttachGraphic(true);
      setGraphicUrl(tmpl.graphic);
    } else {
      setAttachGraphic(false);
    }
  };

  const handleInsertTag = (tag) => {
    setMessageText((prev) => `${prev} {{${tag}}}`);
  };

  const handleInsertSubjectTag = (tag) => {
    setSubjectText((prev) => `${prev} {{${tag}}}`);
  };

  // Render personalized preview
  const renderedSubject = useMemo(() => {
    if (activeChannel !== "EMAIL") return "";
    const name = currentLead.full_name || "Student";
    const course = currentLead.course_name || currentLead.interested_course || "Digital Marketing";
    const batch = currentLead.preferred_centre || "Upcoming Batch";
    const domain = currentLead.domain || "DizitalAdda";
    const counsellor = currentUser.full_name || "Admissions Team";

    return (subjectText || "")
      .replace(/\{\{\s*name\s*\}\}/gi, name)
      .replace(/\{\{\s*course\s*\}\}/gi, course)
      .replace(/\{\{\s*batch\s*\}\}/gi, batch)
      .replace(/\{\{\s*domain\s*\}\}/gi, domain)
      .replace(/\{\{\s*counsellor\s*\}\}/gi, counsellor);
  }, [subjectText, currentLead, currentUser, activeChannel]);

  const renderedBody = useMemo(() => {
    const name = currentLead.full_name || "Student";
    const course = currentLead.course_name || currentLead.interested_course || "Digital Marketing";
    const batch = currentLead.preferred_centre || "Upcoming Batch";
    const domain = currentLead.domain || "DizitalAdda";
    const counsellor = currentUser.full_name || "Admissions Team";

    return (messageText || "")
      .replace(/\{\{\s*name\s*\}\}/gi, name)
      .replace(/\{\{\s*course\s*\}\}/gi, course)
      .replace(/\{\{\s*batch\s*\}\}/gi, batch)
      .replace(/\{\{\s*domain\s*\}\}/gi, domain)
      .replace(/\{\{\s*counsellor\s*\}\}/gi, counsellor);
  }, [messageText, currentLead, currentUser]);

  // Clean 10-digit mobile
  const getLeadPhone = (lead) => {
    const clean = String(lead.mobile || "").replace(/\D/g, "");
    if (clean.length === 10) return `91${clean}`;
    if (clean.length === 12 && clean.startsWith("91")) return clean;
    return `91${clean.slice(-10)}`;
  };

  // Launch in External Native Channel (WhatsApp, Gmail/Email, SMS)
  const handleLaunchChannel = (lead) => {
    const target = lead || currentLead;
    const phone = getLeadPhone(target);

    if (activeChannel === "WHATSAPP") {
      let waText = renderedBody;
      if (attachGraphic && graphicUrl.trim()) {
        waText += `\n\n📎 Course Flyer: ${graphicUrl.trim()}`;
      }
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;
      window.open(waUrl, "_blank");
    } else if (activeChannel === "EMAIL") {
      const email = target.email || "student@gmail.com";
      // Open Gmail composer directly for maximum convenience, with fallback to mailto
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        email
      )}&su=${encodeURIComponent(renderedSubject)}&body=${encodeURIComponent(
        renderedBody + (attachGraphic && graphicUrl ? `\n\nAttachment: ${graphicUrl}` : "")
      )}`;
      window.open(gmailUrl, "_blank");
    } else if (activeChannel === "SMS") {
      const clean10 = phone.replace(/^91/, "");
      const smsUrl = `sms:+91${clean10}?body=${encodeURIComponent(renderedBody)}`;
      window.open(smsUrl, "_blank");
    }

    setSentStudentIds((prev) => new Set([...prev, target.id]));

    if (previewIndex < validLeads.length - 1) {
      setPreviewIndex((prev) => prev + 1);
    }
  };

  // Submit via Server Broadcast API
  const handleApiBroadcast = async () => {
    if (validLeads.length === 0) {
      toast.error(`No valid leads with ${activeChannel === "EMAIL" ? "email" : "mobile number"}.`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await sendBulkBroadcast({
        channel: activeChannel,
        lead_ids: validLeads.map((l) => l.id),
        subject_template: subjectText,
        message_template: messageText,
        media_url: attachGraphic ? graphicUrl.trim() : null,
        send_via_api: true,
      });

      if (res?.success) {
        toast.success(
          `Broadcast completed for ${res.data?.processed_count || validLeads.length} students via ${activeChannel}!`
        );
        if (typeof onSuccess === "function") onSuccess();
        onClose();
      } else {
        toast.error(res?.message || "Failed to broadcast");
      }
    } catch (err) {
      console.error("Broadcast error:", err);
      toast.error(err.response?.data?.message || err.message || "Broadcast error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    const full = activeChannel === "EMAIL" ? `Subject: ${renderedSubject}\n\n${renderedBody}` : renderedBody;
    navigator.clipboard.writeText(full);
    setCopied(true);
    toast.success("Content copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  const currentTemplates = CHANNEL_TEMPLATES[activeChannel] || [];

  return (
    <Modal
      open={open}
      title="Bulk Student Outreach"
      subtitle={`Personalized WhatsApp, Email, & SMS broadcasts to ${validLeads.length} selected students.`}
      size="2xl"
      onClose={onClose}
    >
      <div className="outreach-modal-wrapper">
        {/* 1. TOP CHANNEL SWITCHER */}
        <div className="outreach-channel-bar">
          <div className="outreach-channel-pills">
            <button
              type="button"
              onClick={() => handleChannelSwitch("WHATSAPP")}
              className={`outreach-channel-btn ${activeChannel === "WHATSAPP" ? "active-whatsapp" : ""}`}
            >
              <MessageCircle size={16} />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => handleChannelSwitch("EMAIL")}
              className={`outreach-channel-btn ${activeChannel === "EMAIL" ? "active-email" : ""}`}
            >
              <Mail size={16} />
              <span>Email Campaign</span>
            </button>

            <button
              type="button"
              onClick={() => handleChannelSwitch("SMS")}
              className={`outreach-channel-btn ${activeChannel === "SMS" ? "active-sms" : ""}`}
            >
              <Smartphone size={16} />
              <span>SMS Blast</span>
            </button>
          </div>

          <div className="outreach-audience-badge">
            <User size={14} />
            <span><strong>{validLeads.length}</strong> Students Selected</span>
          </div>
        </div>

        {/* 2. MAIN 2-COLUMN GRID */}
        <div className="outreach-grid">
          {/* LEFT: COMPOSER CARD */}
          <div className="outreach-composer-card">
            {/* Template Selector */}
            <div className="outreach-form-group">
              <div className="outreach-label-row">
                <label className="outreach-label">
                  <Sparkles size={14} style={{ color: "#F59E0B" }} />
                  <span>Choose Template</span>
                </label>
                <span className="outreach-subtext">Pre-approved outreach template</span>
              </div>
              <div className="outreach-select-wrapper">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const tmpl = currentTemplates.find((t) => t.id === e.target.value);
                    if (tmpl) handleSelectTemplate(tmpl);
                  }}
                  className="outreach-select"
                >
                  {currentTemplates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="outreach-select-icon" />
              </div>
            </div>

            {/* Email Subject */}
            {activeChannel === "EMAIL" && (
              <div className="outreach-form-group">
                <label className="outreach-label">Email Subject Line</label>
                <input
                  type="text"
                  value={subjectText}
                  onChange={(e) => setSubjectText(e.target.value)}
                  placeholder="e.g. Admissions Open: {{course}} at {{domain}}"
                  className="outreach-input"
                />
              </div>
            )}

            {/* Message Body + Dynamic Tags Toolbar */}
            <div className="outreach-form-group">
              <div className="outreach-label-row">
                <label className="outreach-label">
                  {activeChannel === "EMAIL"
                    ? "Email Body"
                    : activeChannel === "SMS"
                    ? "SMS Content"
                    : "WhatsApp Message"}
                </label>
                <div className="outreach-tags-strip">
                  <span className="outreach-subtext">Add tag:</span>
                  {["name", "course", "batch", "domain", "counsellor"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertTag(tag)}
                      className="outreach-tag-btn"
                      title={`Insert {{${tag}}}`}
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={activeChannel === "EMAIL" ? 6 : activeChannel === "SMS" ? 4 : 5}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="outreach-textarea"
                placeholder="Type your message copy..."
              />

              {activeChannel === "SMS" && (
                <div style={{ textAlign: "right", fontSize: "11.5px", color: "#64748B", fontFamily: "monospace" }}>
                  {renderedBody.length} / 160 characters ({Math.ceil(renderedBody.length / 160) || 1} SMS part)
                </div>
              )}
            </div>

            {/* Graphic Flyer Section (WhatsApp & Email) */}
            {activeChannel !== "SMS" && (
              <div className="outreach-graphic-box">
                <div className="outreach-graphic-header">
                  <label className="outreach-checkbox-label">
                    <input
                      type="checkbox"
                      checked={attachGraphic}
                      onChange={(e) => setAttachGraphic(e.target.checked)}
                      className="outreach-checkbox"
                    />
                    <Image size={15} style={{ color: "#2563EB" }} />
                    <span>Attach Course Flyer / Promotional Banner</span>
                  </label>

                  {attachGraphic && (
                    <span className="outreach-active-badge">
                      Flyer Active
                    </span>
                  )}
                </div>

                {attachGraphic && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div className="outreach-presets-grid">
                      {GRAPHIC_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setGraphicUrl(preset.url)}
                          className={`outreach-preset-pill ${graphicUrl === preset.url ? "active" : ""}`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="outreach-url-row">
                      <input
                        type="url"
                        value={graphicUrl}
                        onChange={(e) => setGraphicUrl(e.target.value)}
                        placeholder="Image URL (https://...)"
                        className="outreach-input"
                        style={{ fontSize: "12.5px", padding: "7px 10px" }}
                      />
                      {graphicUrl && (
                        <button
                          type="button"
                          onClick={() => setGraphicUrl("")}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                          title="Remove image"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sending Mode Selector */}
            <div className="outreach-mode-row">
              <span className="outreach-label">Sending Mode:</span>
              <div className="outreach-mode-pills">
                <button
                  type="button"
                  onClick={() => setSendingMode("launcher")}
                  className={`outreach-mode-btn ${sendingMode === "launcher" ? "active" : ""}`}
                >
                  ⚡ 1-Click Direct Launch
                </button>
                <button
                  type="button"
                  onClick={() => setSendingMode("api")}
                  className={`outreach-mode-btn ${sendingMode === "api" ? "active" : ""}`}
                >
                  🚀 Cloud Broadcast
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE SIMULATION PREVIEW */}
          <div className="outreach-preview-column">
            {/* Topbar with Student Navigator */}
            <div className="outreach-preview-topbar">
              <div className="outreach-preview-title">
                {activeChannel === "WHATSAPP" && <MessageCircle size={15} style={{ color: "#10b981" }} />}
                {activeChannel === "EMAIL" && <Mail size={15} style={{ color: "#2563eb" }} />}
                {activeChannel === "SMS" && <Smartphone size={15} style={{ color: "#8b5cf6" }} />}
                <span>Live Preview</span>
              </div>

              {validLeads.length > 1 && (
                <div className="outreach-preview-nav">
                  <button
                    type="button"
                    disabled={previewIndex === 0}
                    onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                    className="outreach-nav-btn"
                    title="Previous student"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="outreach-nav-counter">
                    {previewIndex + 1} of {validLeads.length}
                  </span>
                  <button
                    type="button"
                    disabled={previewIndex >= validLeads.length - 1}
                    onClick={() => setPreviewIndex((prev) => Math.min(validLeads.length - 1, prev + 1))}
                    className="outreach-nav-btn"
                    title="Next student"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* WHATSAPP MOCKUP */}
            {activeChannel === "WHATSAPP" && (
              <div className="outreach-phone-frame">
                <div className="outreach-wa-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="outreach-wa-avatar">
                      {currentLead.full_name ? currentLead.full_name.charAt(0).toUpperCase() : "S"}
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700", lineHeight: "1.2" }}>
                        {currentLead.full_name || "Student"}
                      </div>
                      <div style={{ fontSize: "10.5px", opacity: 0.85 }}>
                        +91 {currentLead.mobile || "9876543210"}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: "10.5px", background: "rgba(0,0,0,0.2)", padding: "2px 8px", borderRadius: "4px" }}>
                    {currentLead.domain || "DizitalAdda"}
                  </span>
                </div>

                <div className="outreach-wa-body">
                  <div className="outreach-wa-bubble">
                    {attachGraphic && graphicUrl.trim() && (
                      <div className="outreach-wa-banner">
                        <img
                          src={graphicUrl}
                          alt="Flyer"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      </div>
                    )}
                    <div>{renderedBody}</div>
                    <div className="outreach-wa-meta">
                      <span>10:30 AM</span>
                      <span style={{ color: "#3B82F6", fontWeight: "700" }}>✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EMAIL MOCKUP */}
            {activeChannel === "EMAIL" && (
              <div className="outreach-phone-frame" style={{ background: "#ffffff" }}>
                <div className="outreach-email-header">
                  <div className="outreach-email-to">
                    <span>To:</span>
                    <strong>{currentLead.email || "student@gmail.com"}</strong>
                  </div>
                  <div className="outreach-email-subject">
                    {renderedSubject || "Subject: Admissions Update"}
                  </div>
                </div>

                <div className="outreach-email-body">
                  {attachGraphic && graphicUrl.trim() && (
                    <div className="outreach-wa-banner">
                      <img
                        src={graphicUrl}
                        alt="Flyer Banner"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    </div>
                  )}
                  <div>{renderedBody}</div>
                </div>
              </div>
            )}

            {/* SMS MOCKUP */}
            {activeChannel === "SMS" && (
              <div className="outreach-phone-frame">
                <div className="outreach-sms-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Smartphone size={16} style={{ color: "#c084fc" }} />
                    <span style={{ fontSize: "13px", fontWeight: "700" }}>{currentLead.full_name || "Student"}</span>
                  </div>
                  <span style={{ fontSize: "11px", opacity: 0.8 }}>+91 {currentLead.mobile || "9876543210"}</span>
                </div>

                <div className="outreach-sms-body">
                  <div className="outreach-sms-bubble">
                    <div>{renderedBody}</div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", textAlign: "right", marginTop: "4px" }}>
                      SMS • Delivered
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Footer */}
            <div className="outreach-preview-footer">
              <span>
                Previewing: <strong>{currentLead.full_name}</strong>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="outreach-copy-btn"
              >
                {copied ? <Check size={13} style={{ color: "#10b981" }} /> : <Copy size={13} />}
                <span>{copied ? "Copied!" : "Copy Text"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. MODAL FOOTER */}
        <div className="outreach-modal-footer">
          <div className="outreach-footer-status">
            <span className="status-dot" />
            <span><strong>{validLeads.length}</strong> students ready for outreach</span>
            {sentStudentIds.size > 0 && (
              <span style={{ color: "#065f46", background: "#d1fae5", padding: "2px 8px", borderRadius: "10px", fontSize: "11.5px", fontWeight: "700" }}>
                {sentStudentIds.size} sent
              </span>
            )}
          </div>

          <div className="outreach-footer-actions">
            <button
              type="button"
              onClick={onClose}
              className="outreach-btn-cancel"
            >
              Cancel
            </button>

            {sendingMode === "launcher" ? (
              <button
                type="button"
                onClick={() => handleLaunchChannel(currentLead)}
                className={`outreach-btn-primary ${
                  activeChannel === "WHATSAPP"
                    ? "btn-wa"
                    : activeChannel === "EMAIL"
                    ? "btn-email"
                    : "btn-sms"
                }`}
              >
                {activeChannel === "WHATSAPP" && <MessageCircle size={16} />}
                {activeChannel === "EMAIL" && <Mail size={16} />}
                {activeChannel === "SMS" && <Smartphone size={16} />}
                <span>
                  Launch {activeChannel === "WHATSAPP" ? "WhatsApp" : activeChannel === "EMAIL" ? "Gmail" : "SMS"} ({previewIndex + 1}/{validLeads.length})
                </span>
                <ExternalLink size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleApiBroadcast}
                className="outreach-btn-primary btn-api"
              >
                <Send size={16} />
                <span>
                  {submitting ? "Broadcasting..." : `Send to All ${validLeads.length} Students`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BulkOutreachModal;
