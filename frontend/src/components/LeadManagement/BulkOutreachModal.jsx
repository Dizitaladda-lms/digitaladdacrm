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

    let text = (messageText || "")
      .replace(/\{\{\s*name\s*\}\}/gi, name)
      .replace(/\{\{\s*course\s*\}\}/gi, course)
      .replace(/\{\{\s*batch\s*\}\}/gi, batch)
      .replace(/\{\{\s*domain\s*\}\}/gi, domain)
      .replace(/\{\{\s*counsellor\s*\}\}/gi, counsellor);

    if (activeChannel === "WHATSAPP" && attachGraphic && graphicUrl.trim()) {
      text += `\n\n📎 *Graphic Flyer:* ${graphicUrl.trim()}`;
    }

    return text;
  }, [messageText, currentLead, currentUser, activeChannel, attachGraphic, graphicUrl]);

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
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(renderedBody)}`;
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
      subtitle={`Broadcast personalized messages via WhatsApp, Email, or SMS to ${validLeads.length} selected students.`}
      size="2xl"
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Top Channel Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 flex-wrap gap-2.5">
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl gap-1 border border-slate-200/60">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={() => handleChannelSwitch("WHATSAPP")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeChannel === "WHATSAPP"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <MessageCircle size={15} />
              <span>WhatsApp</span>
            </button>

            {/* Email */}
            <button
              type="button"
              onClick={() => handleChannelSwitch("EMAIL")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeChannel === "EMAIL"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Mail size={15} />
              <span>Email Campaign</span>
            </button>

            {/* SMS */}
            <button
              type="button"
              onClick={() => handleChannelSwitch("SMS")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeChannel === "SMS"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Smartphone size={15} />
              <span>SMS Blast</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-xs font-semibold text-blue-800">
              <User size={13} className="text-blue-600" />
              <span><strong>{validLeads.length}</strong> Students Selected</span>
            </span>
          </div>
        </div>

        {/* 2-Columns Layout: Composer (Left 7) & Live Preview (Right 5) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
          {/* LEFT: Composer & Configuration */}
          <div className="space-y-3.5 lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
            {/* 1. Template Selector (Clean Dropdown) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Choose Template</span>
                </label>
                <span className="text-[11px] text-slate-400">Pre-approved outreach templates</span>
              </div>
              <div className="relative">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const tmpl = currentTemplates.find((t) => t.id === e.target.value);
                    if (tmpl) handleSelectTemplate(tmpl);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 pr-9 text-[13px] font-semibold text-slate-800 transition-all hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  {currentTemplates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-slate-400" />
              </div>
            </div>

            {/* 2. Email Subject Line (Only for Email) */}
            {activeChannel === "EMAIL" && (
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={subjectText}
                  onChange={(e) => setSubjectText(e.target.value)}
                  placeholder="e.g. Admissions Open: {{course}} at {{domain}}"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] text-slate-800 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            )}

            {/* 3. Message Body + Dynamic Tag Toolbar */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-[12px] font-bold text-slate-700">
                  {activeChannel === "EMAIL"
                    ? "Email Body"
                    : activeChannel === "SMS"
                    ? "SMS Content"
                    : "WhatsApp Message"}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[10.5px] text-slate-400 font-medium mr-1">Insert tag:</span>
                  {["name", "course", "batch", "domain", "counsellor"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertTag(tag)}
                      className="rounded-md bg-slate-100 hover:bg-blue-100 hover:text-blue-700 border border-slate-200 px-1.5 py-0.5 text-[10.5px] font-mono text-slate-600 transition-colors cursor-pointer"
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
                className="w-full rounded-xl border border-slate-200 p-3 text-[13px] text-slate-800 leading-relaxed font-sans focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="Type your message copy..."
              />

              {activeChannel === "SMS" && (
                <div className="text-right text-[11px] font-mono text-slate-500 mt-1">
                  {renderedBody.length} / 160 characters ({Math.ceil(renderedBody.length / 160) || 1} SMS unit)
                </div>
              )}
            </div>

            {/* 4. Graphic / Course Flyer Attachment (WhatsApp & Email) */}
            {activeChannel !== "SMS" && (
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={attachGraphic}
                      onChange={(e) => setAttachGraphic(e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Image size={14} className="text-blue-600" />
                      Attach Course Flyer / Promotional Banner
                    </span>
                  </label>

                  {attachGraphic && (
                    <span className="text-[10.5px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      Flyer Active
                    </span>
                  )}
                </div>

                {attachGraphic && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500 font-medium">Flyer Presets:</span>
                      {GRAPHIC_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setGraphicUrl(preset.url)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            graphicUrl === preset.url
                              ? "bg-blue-50 border-blue-400 text-blue-800 font-bold shadow-2xs"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={graphicUrl}
                        onChange={(e) => setGraphicUrl(e.target.value)}
                        placeholder="Image URL (https://...)"
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {graphicUrl && (
                        <button
                          type="button"
                          onClick={() => setGraphicUrl("")}
                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Remove image"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. Sending Mode Selector */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px] font-bold text-slate-600">Sending Mode:</span>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSendingMode("launcher")}
                  className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                    sendingMode === "launcher"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ⚡ 1-Click Launcher (Direct)
                </button>
                <button
                  type="button"
                  onClick={() => setSendingMode("api")}
                  className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                    sendingMode === "api"
                      ? "bg-white text-blue-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🚀 Cloud Broadcast
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Live Simulation Preview */}
          <div className="space-y-3 lg:col-span-5">
            {/* Header with Lead Switcher */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200/80 px-3.5 py-2 shadow-2xs">
              <div className="flex items-center gap-1.5">
                {activeChannel === "WHATSAPP" && <MessageCircle size={15} className="text-emerald-600" />}
                {activeChannel === "EMAIL" && <Mail size={15} className="text-blue-600" />}
                {activeChannel === "SMS" && <Smartphone size={15} className="text-purple-600" />}
                <span className="text-[12px] font-bold text-slate-800">Live Preview</span>
              </div>

              {validLeads.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <button
                    type="button"
                    disabled={previewIndex === 0}
                    onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                    className="rounded-md border border-slate-200 p-1 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    title="Previous student"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="font-semibold text-slate-700 text-[11.5px] px-1">
                    {previewIndex + 1} of {validLeads.length}
                  </span>
                  <button
                    type="button"
                    disabled={previewIndex >= validLeads.length - 1}
                    onClick={() => setPreviewIndex((prev) => Math.min(validLeads.length - 1, prev + 1))}
                    className="rounded-md border border-slate-200 p-1 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    title="Next student"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* ==================================================== */}
            {/* WHATSAPP MOCKUP */}
            {/* ==================================================== */}
            {activeChannel === "WHATSAPP" && (
              <div
                className="rounded-2xl border border-slate-300/80 shadow-xs overflow-hidden flex flex-col"
                style={{
                  backgroundColor: "#EFEAE2",
                  backgroundImage: "radial-gradient(#CBD5E1 0.75px, transparent 0.75px)",
                  backgroundSize: "12px 12px",
                  height: "390px",
                }}
              >
                <div style={{ backgroundColor: "#075E54" }} className="px-3.5 py-2.5 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center font-bold text-xs">
                      {currentLead.full_name ? currentLead.full_name.charAt(0).toUpperCase() : "S"}
                    </div>
                    <div>
                      <h5 className="m-0 text-[12.5px] font-bold leading-tight">{currentLead.full_name || "Student"}</h5>
                      <p className="m-0 text-[10.5px] text-emerald-100/90">+91 {currentLead.mobile || "9876543210"}</p>
                    </div>
                  </div>
                  <span className="text-[10.5px] bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-200 font-semibold">{currentLead.domain || "DizitalAdda"}</span>
                </div>

                <div className="p-3.5 flex-1 overflow-y-auto flex flex-col justify-end">
                  <div className="rounded-2xl rounded-tr-none bg-white p-3 shadow-md border border-slate-200 max-w-[94%] ml-auto" style={{ backgroundColor: "#DCF8C6" }}>
                    {attachGraphic && graphicUrl.trim() && (
                      <div className="mb-2 overflow-hidden rounded-xl border border-emerald-200/80">
                        <img src={graphicUrl} alt="Flyer" className="w-full max-h-32 object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                      </div>
                    )}
                    <div className="text-[12.5px] text-slate-900 whitespace-pre-wrap leading-relaxed">{renderedBody}</div>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500">
                      <span>10:30 AM</span>
                      <span className="text-blue-500 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* EMAIL MOCKUP */}
            {/* ==================================================== */}
            {activeChannel === "EMAIL" && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col" style={{ height: "390px" }}>
                <div className="bg-slate-50/90 border-b border-slate-200/80 px-4 py-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">To:</span>
                    <span className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 font-mono text-[10.5px]">
                      {currentLead.email || "student@gmail.com"}
                    </span>
                  </div>
                  <div className="text-[13px] font-bold text-slate-900 truncate">
                    {renderedSubject || "Subject: Admissions Update"}
                  </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto text-slate-800 space-y-3">
                  {attachGraphic && graphicUrl.trim() && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                      <img src={graphicUrl} alt="Email Banner" className="w-full max-h-32 object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                    </div>
                  )}
                  <div className="text-[12.5px] whitespace-pre-wrap leading-relaxed text-slate-700">
                    {renderedBody}
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* SMS MOCKUP */}
            {/* ==================================================== */}
            {activeChannel === "SMS" && (
              <div
                className="rounded-2xl border border-slate-300/80 shadow-xs overflow-hidden flex flex-col"
                style={{
                  backgroundColor: "#F8FAFC",
                  height: "390px",
                }}
              >
                <div className="bg-slate-800 text-white px-3.5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-purple-400" />
                    <span className="text-[12.5px] font-bold">{currentLead.full_name || "Student"}</span>
                  </div>
                  <span className="text-[10.5px] text-slate-300">+91 {currentLead.mobile || "9876543210"}</span>
                </div>

                <div className="p-3.5 flex-1 overflow-y-auto flex flex-col justify-end">
                  <div className="rounded-2xl rounded-tl-none bg-white p-3.5 shadow-xs border border-slate-200 max-w-[90%] space-y-1">
                    <div className="text-[12.5px] text-slate-900 whitespace-pre-wrap leading-relaxed">
                      {renderedBody}
                    </div>
                    <div className="text-[9.5px] text-slate-400 text-right">SMS • Delivered</div>
                  </div>
                </div>
              </div>
            )}

            {/* Student Chip & Quick Copy Bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="truncate max-w-[200px] text-slate-700">
                Lead: <strong>{currentLead.full_name}</strong>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-semibold cursor-pointer py-0.5 px-2 rounded-md hover:bg-slate-100 transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copied ? "Copied!" : "Copy Content"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3.5 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
              ✓
            </span>
            <span><strong>{validLeads.length}</strong> students ready for outreach</span>
            {sentStudentIds.size > 0 && (
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                {sentStudentIds.size} sent
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {sendingMode === "launcher" ? (
              <button
                type="button"
                onClick={() => handleLaunchChannel(currentLead)}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold text-white shadow-xs transition-all cursor-pointer ${
                  activeChannel === "WHATSAPP"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                    : activeChannel === "EMAIL"
                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                    : "bg-purple-600 hover:bg-purple-700 shadow-purple-200"
                }`}
              >
                {activeChannel === "WHATSAPP" && <MessageCircle size={15} />}
                {activeChannel === "EMAIL" && <Mail size={15} />}
                {activeChannel === "SMS" && <Smartphone size={15} />}
                <span>
                  Launch {activeChannel === "WHATSAPP" ? "WhatsApp" : activeChannel === "EMAIL" ? "Gmail" : "SMS"} ({previewIndex + 1}/{validLeads.length})
                </span>
                <ExternalLink size={13} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleApiBroadcast}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-[13px] font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Send size={15} />
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
