import React, { useState, useMemo } from "react";
import Modal from "../common/Modal/Modal";
import {
  MessageCircle,
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
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import { sendBulkWhatsApp } from "../../services/whatsappService";

const TEMPLATES = [
  {
    id: "admission_open",
    title: "🎓 Admission Open & Scholarship",
    text: `Hello {{name}}! 👋\n\nAdmissions are now open for *{{course}}* at *{{domain}}*! 🚀\n\n🗓️ *Preferred Batch:* {{batch}}\n💼 *Features:* 100% Practical Training + Live Projects + Placement Support.\n🎁 *Special Offer:* Avail up to 30% scholarship if you register this week!\n\nReply *YES* to get the complete course syllabus and scholarship details.`,
    defaultGraphic:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80",
  },
  {
    id: "batch_starting",
    title: "⏰ Batch Starting Soon (Limited Seats)",
    text: `Hi {{name}}, great news! 🌟\n\nYour *{{batch}}* for *{{course}}* at *{{domain}}* is starting this Monday!\n\n⚠️ Only 4 seats remaining in this batch to maintain small batch size for 1-on-1 mentorship.\n\nReply *CONFIRM* to lock your seat or call our counselor.`,
    defaultGraphic:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80",
  },
  {
    id: "scholarship_offer",
    title: "🎁 Special Scholarship & Fee Discount",
    text: `Dear {{name}},\n\nCongratulations! Based on your enquiry for *{{course}}*, you are eligible for an exclusive institute scholarship at *{{domain}}*! 🎉\n\n💰 Special concession available on tuition fees for {{batch}}.\n⏰ Offer valid for the next 48 hours only.\n\nReply *INTERESTED* to speak with our senior academic counsellor today!`,
    defaultGraphic:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
  },
  {
    id: "free_demo",
    title: "💻 Free Live Demo Class Invitation",
    text: `Hi {{name}}! 🎓\n\nYou are invited to attend our *Free Practical Live Demo Workshop* on *{{course}}* at *{{domain}}*.\n\n🗓️ *Date:* This Saturday at 11:00 AM\n👨‍🏫 *Mentor:* Industry Expert with 8+ years experience\n\nLearn live, see real-world projects, and ask all your doubts!\nReply *ATTEND* to receive your access pass.`,
    defaultGraphic:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
  },
  {
    id: "counsellor_followup",
    title: "📞 Counsellor Follow-up & Career Guidance",
    text: `Hello {{name}},\n\nThis is {{counsellor}} from *{{domain}}*. I tried reaching you regarding your recent career enquiry for *{{course}}*.\n\nI would love to help guide you regarding job opportunities, syllabus, and our {{batch}} timings.\n\nPlease let me know a convenient time to connect with you on a quick call. Have a great day!`,
    defaultGraphic: "",
  },
  {
    id: "custom",
    title: "✍️ Custom Message",
    text: `Hello {{name}},\n\nWe have exciting updates regarding *{{course}}* at *{{domain}}*!\n\nContact us today for batch details.`,
    defaultGraphic: "",
  },
];

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

const BulkWhatsAppModal = ({
  open = false,
  leads = [],
  onClose,
  onSuccess,
  currentUser = {},
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState("admission_open");
  const [messageText, setMessageText] = useState(TEMPLATES[0].text);
  const [attachGraphic, setAttachGraphic] = useState(true);
  const [graphicUrl, setGraphicUrl] = useState(TEMPLATES[0].defaultGraphic);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [sendingMode, setSendingMode] = useState("direct_launcher"); // "direct_launcher" | "api"
  const [sentStudentIds, setSentStudentIds] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filter valid leads with numbers
  const validLeads = useMemo(() => {
    return leads.filter((l) => {
      const clean = String(l.mobile || "").replace(/\D/g, "");
      return clean.length >= 10;
    });
  }, [leads]);

  const currentPreviewLead = validLeads[previewIndex] || validLeads[0] || {
    full_name: "Rahul Sharma",
    mobile: "9876543210",
    interested_course: "Digital Marketing",
    domain: "DizitalAdda",
    preferred_centre: "Morning Batch (9:00 AM - 12:00 PM)",
  };

  // Select a template
  const handleSelectTemplate = (tmpl) => {
    setSelectedTemplateId(tmpl.id);
    setMessageText(tmpl.text);
    if (tmpl.defaultGraphic) {
      setAttachGraphic(true);
      setGraphicUrl(tmpl.defaultGraphic);
    } else {
      setAttachGraphic(false);
    }
  };

  // Insert variable into message
  const handleInsertTag = (tag) => {
    setMessageText((prev) => `${prev} {{${tag}}}`);
  };

  // Generate personalized text for preview
  const renderedPreviewText = useMemo(() => {
    const lead = currentPreviewLead;
    const name = lead.full_name || "Student";
    const course = lead.course_name || lead.interested_course || "Digital Marketing";
    const batch = lead.preferred_centre || "Upcoming Batch";
    const domain = lead.domain || "DizitalAdda";
    const counsellor = currentUser.full_name || "Admissions Team";

    let text = messageText
      .replace(/\{\{\s*name\s*\}\}/gi, name)
      .replace(/\{\{\s*course\s*\}\}/gi, course)
      .replace(/\{\{\s*batch\s*\}\}/gi, batch)
      .replace(/\{\{\s*domain\s*\}\}/gi, domain)
      .replace(/\{\{\s*counsellor\s*\}\}/gi, counsellor);

    if (attachGraphic && graphicUrl.trim()) {
      text += `\n\n📎 *Graphic Flyer:* ${graphicUrl.trim()}`;
    }

    return text;
  }, [currentPreviewLead, messageText, attachGraphic, graphicUrl, currentUser]);

  // Clean lead phone
  const getLeadPhone = (lead) => {
    const clean = String(lead.mobile || "").replace(/\D/g, "");
    if (clean.length === 10) return `91${clean}`;
    if (clean.length === 12 && clean.startsWith("91")) return clean;
    return `91${clean.slice(-10)}`;
  };

  // Launch WhatsApp Web for current previewed student
  const handleLaunchWhatsApp = (lead) => {
    const targetLead = lead || currentPreviewLead;
    const phone = getLeadPhone(targetLead);

    // Build specific text
    const name = targetLead.full_name || "Student";
    const course = targetLead.course_name || targetLead.interested_course || "Digital Marketing";
    const batch = targetLead.preferred_centre || "Upcoming Batch";
    const domain = targetLead.domain || "DizitalAdda";
    const counsellor = currentUser.full_name || "Admissions Team";

    let text = messageText
      .replace(/\{\{\s*name\s*\}\}/gi, name)
      .replace(/\{\{\s*course\s*\}\}/gi, course)
      .replace(/\{\{\s*batch\s*\}\}/gi, batch)
      .replace(/\{\{\s*domain\s*\}\}/gi, domain)
      .replace(/\{\{\s*counsellor\s*\}\}/gi, counsellor);

    if (attachGraphic && graphicUrl.trim()) {
      text += `\n\n📎 *Graphic Flyer:* ${graphicUrl.trim()}`;
    }

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");

    // Mark as sent
    setSentStudentIds((prev) => new Set([...prev, targetLead.id]));

    // Auto-advance to next student if available
    if (previewIndex < validLeads.length - 1) {
      setPreviewIndex((prev) => prev + 1);
    }
  };

  // Submit via Server Broadcast API
  const handleApiBroadcast = async () => {
    if (validLeads.length === 0) {
      toast.error("No valid leads selected.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await sendBulkWhatsApp({
        lead_ids: validLeads.map((l) => l.id),
        message_template: messageText,
        media_url: attachGraphic ? graphicUrl.trim() : null,
        send_via_api: true,
      });

      if (res?.success) {
        toast.success(
          `WhatsApp broadcast initiated for ${res.data?.processed_count || validLeads.length} students!`
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

  const handleCopyText = () => {
    navigator.clipboard.writeText(renderedPreviewText);
    setCopied(true);
    toast.success("Message copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      title="Bulk WhatsApp Campaign & Broadcast"
      subtitle={`Send customized message templates & course graphics to ${validLeads.length} selected students.`}
      size="xl"
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Controls & Composer (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Template Selection */}
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600" />
              <span>Select WhatsApp Template</span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`rounded-lg p-2.5 text-left text-xs font-semibold transition-all border ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/80 text-blue-900 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div>{tmpl.title}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Insert Tags */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Insert Dynamic Tag:
              </span>
              <span className="text-[11px] text-slate-400">
                Click pill to add in text
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["name", "course", "batch", "domain", "counsellor"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInsertTag(tag)}
                  className="rounded-md bg-slate-100 hover:bg-blue-100 hover:text-blue-700 border border-slate-200 px-2 py-0.5 text-[11px] font-mono text-slate-700 transition-colors"
                  title={`Insert {{${tag}}}`}
                >
                  +{`{{${tag}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              WhatsApp Message Copy
            </label>
            <textarea
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-[13px] text-slate-800 leading-relaxed font-sans focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Type message text here..."
            />
          </div>

          {/* Graphic / Media Attachment Option */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachGraphic}
                  onChange={(e) => setAttachGraphic(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Image size={15} className="text-emerald-600" />
                  Attach Graphic / Course Flyer
                </span>
              </label>

              {attachGraphic && (
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                  Graphic Active
                </span>
              )}
            </div>

            {attachGraphic && (
              <div className="space-y-2 pt-1">
                {/* Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Quick Graphics:
                  </span>
                  {GRAPHIC_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setGraphicUrl(preset.url)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        graphicUrl === preset.url
                          ? "bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom URL Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={graphicUrl}
                    onChange={(e) => setGraphicUrl(e.target.value)}
                    placeholder="Enter custom image/flyer URL (https://...)"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                  {graphicUrl && (
                    <button
                      type="button"
                      onClick={() => setGraphicUrl("")}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="Clear image"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dispatch Mode Tabs */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[12px] font-semibold text-slate-600">
              Sending Mode:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSendingMode("direct_launcher")}
                className={`rounded-md px-3 py-1 transition-colors ${
                  sendingMode === "direct_launcher"
                    ? "bg-white text-emerald-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ⚡ 1-Click WhatsApp Launcher (Safe)
              </button>
              <button
                type="button"
                onClick={() => setSendingMode("api")}
                className={`rounded-md px-3 py-1 transition-colors ${
                  sendingMode === "api"
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🚀 Server API Broadcast
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: WhatsApp Real-Time Simulation (5 cols) */}
        <div className="space-y-3 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <MessageCircle size={15} className="text-emerald-600" />
              <span>Live WhatsApp Preview</span>
            </span>

            {/* Student Preview Pagination */}
            {validLeads.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>
                  {previewIndex + 1} of {validLeads.length}
                </span>
                <button
                  type="button"
                  disabled={previewIndex === 0}
                  onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded border border-slate-200 p-1 hover:bg-slate-100 disabled:opacity-30"
                  title="Previous Lead"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  disabled={previewIndex >= validLeads.length - 1}
                  onClick={() =>
                    setPreviewIndex((prev) => Math.min(validLeads.length - 1, prev + 1))
                  }
                  className="rounded border border-slate-200 p-1 hover:bg-slate-100 disabled:opacity-30"
                  title="Next Lead"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>

          {/* WhatsApp Phone Mockup Container */}
          <div
            className="rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col"
            style={{
              backgroundColor: "#EFEAE2",
              backgroundImage:
                "radial-gradient(#CBD5E1 0.75px, transparent 0.75px)",
              backgroundSize: "12px 12px",
              minHeight: "380px",
            }}
          >
            {/* WhatsApp Header */}
            <div
              style={{ backgroundColor: "#075E54" }}
              className="px-3.5 py-2.5 text-white flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center font-bold text-xs">
                  DA
                </div>
                <div>
                  <h5 className="margin-0 text-[13px] font-bold leading-tight flex items-center gap-1">
                    {currentPreviewLead.full_name || "Student"}
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  </h5>
                  <p className="margin-0 text-[10.5px] text-emerald-100 opacity-90">
                    +91 {currentPreviewLead.mobile || "9876543210"}
                  </p>
                </div>
              </div>

              <div className="text-[11px] font-medium bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-200">
                {currentPreviewLead.domain || "DizitalAdda"}
              </div>
            </div>

            {/* Chat Bubble Area */}
            <div className="p-3.5 flex-1 flex flex-col justify-end">
              <div
                className="rounded-2xl rounded-tr-none bg-white p-2.5 shadow-md border border-slate-200 max-w-[94%] ml-auto"
                style={{ backgroundColor: "#DCF8C6" }}
              >
                {/* Graphic Image Preview inside bubble */}
                {attachGraphic && graphicUrl.trim() && (
                  <div className="mb-2 overflow-hidden rounded-xl border border-emerald-200 bg-black/5">
                    <img
                      src={graphicUrl}
                      alt="Course Graphic"
                      className="w-full max-h-36 object-cover hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}

                {/* Message Text with formatting */}
                <div className="text-[12.5px] text-slate-900 whitespace-pre-wrap leading-relaxed">
                  {renderedPreviewText}
                </div>

                {/* Bubble Timestamp */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500">
                  <span>10:30 AM</span>
                  <span className="text-blue-500 font-bold">✓✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Copy / Preview Actions */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="truncate max-w-[200px]">
              Recipient: <strong>{currentPreviewLead.full_name}</strong>
            </span>
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-semibold"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copied ? "Copied!" : "Copy Text"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Leads Mini Strip & Actions */}
      <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
            {validLeads.length}
          </span>
          <span>Students selected</span>
          {sentStudentIds.size > 0 && (
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {sentStudentIds.size} sent
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          {sendingMode === "direct_launcher" ? (
            <button
              type="button"
              onClick={() => handleLaunchWhatsApp(currentPreviewLead)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-1.5 text-[13px] font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <MessageCircle size={16} />
              <span>
                Send via WhatsApp ({previewIndex + 1}/{validLeads.length})
              </span>
              <ExternalLink size={13} />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleApiBroadcast}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-1.5 text-[13px] font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send size={15} />
              <span>
                {submitting
                  ? "Broadcasting..."
                  : `Broadcast to All ${validLeads.length} Leads`}
              </span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default BulkWhatsAppModal;
