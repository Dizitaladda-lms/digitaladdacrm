import React, { useEffect, useState, useCallback } from "react";
import LeadSummaryHeader from "./LeadSummaryHeader";
import LeadDetailsTabsNav from "./LeadDetailsTabsNav";
import PersonalInformationTab from "./PersonalInformationTab";
import AcademicInformationTab from "./AcademicInformationTab";
import CounsellorNotesTab from "./CounsellorNotesTab";
import AuditTimelineTab from "./AuditTimelineTab";
import CallRecordingsTab from "./CallRecordingsTab";
import LeadDrawerFooter from "./LeadDrawerFooter";
import "./LeadDetailsDrawer.css";

import { getLeadById } from "../../../services/leadService";
import {
  addLeadFeedback,
  getLeadFeedbackHistory,
} from "../../../services/leadFeedbackService";

/**
 * Shared LeadDetailsDrawer Component (Production V3)
 * High-productivity 4-Step Guided Counselling Drawer (`LeadDetailsDrawer.jsx`)
 */
const LeadDetailsDrawer = ({
  open = false,
  lead = null,
  onClose,
  onStatusUpdated,
  role = "counsellor",
}) => {
  const isCounsellor = role === "counsellor" || role === "employee";
  const isEditable = isCounsellor;

  const [loading, setLoading] = useState(false);
  const [leadDetails, setLeadDetails] = useState(null);

  // 4-Tab State: "personal" | "academic" | "counselling" | "timeline"
  const [activeTab, setActiveTab] = useState("personal");

  // Preserved Form State across all 4 tabs
  const [personalData, setPersonalData] = useState({});
  const [academicData, setAcademicData] = useState({
    education_type: "school",
    stream: "Science",
    board: "CBSE",
    interested_course: "BCA",
  });

  // Feedback & History State
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dynamic Status & Remarks State
  const [selectedStatus, setSelectedStatus] = useState("INTERESTED");
  const [feedbackFields, setFeedbackFields] = useState({});
  const [remarks, setRemarks] = useState("");

  const loadLeadData = useCallback(async () => {
    if (!lead?.id) return;

    try {
      setLoading(true);
      const response = await getLeadById(lead.id);
      const leadData = response.data || response;
      setLeadDetails(leadData);

      // Hydrate personal contact info state
      setPersonalData({
        full_name: leadData.full_name || "",
        mobile: leadData.mobile || "",
        alternate_mobile: leadData.alternate_mobile || "",
        email: leadData.email || "",
        city: leadData.city || "",
        state: leadData.state || "Uttar Pradesh",
        country: leadData.country || "India",
      });

      // Hydrate academic info state
      setAcademicData((prev) => ({
        ...prev,
        interested_course:
          leadData.interested_course || leadData.course_name || "BCA",
        preferred_centre: leadData.preferred_centre || "",
      }));

      if (leadData.status) {
        setSelectedStatus(leadData.status.toUpperCase());
      }
    } catch (error) {
      console.error("Error fetching lead details:", error);
    } finally {
      setLoading(false);
    }
  }, [lead?.id]);

  const loadFeedbackHistory = useCallback(async () => {
    if (!lead?.id) return;
    try {
      setHistoryLoading(true);
      const res = await getLeadFeedbackHistory(lead.id);
      const historyList = res.data || res || [];
      setFeedbackHistory(historyList);

      // Hydrate saved academic fields if present in history
      if (historyList.length > 0) {
        const latestFeedback = historyList[0];
        const fields = latestFeedback.feedback_fields || {};
        if (
          fields.education_type ||
          fields.school_name ||
          fields.college_name
        ) {
          setAcademicData((prev) => ({
            ...prev,
            ...fields,
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching feedback history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [lead?.id]);

  useEffect(() => {
    if (open && lead?.id) {
      setActiveTab("personal");
      loadLeadData();
      loadFeedbackHistory();
    }
  }, [open, lead?.id, loadLeadData, loadFeedbackHistory]);

  const handleFeedbackFieldChange = (field, value) => {
    setFeedbackFields((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveQuickNote = async (noteText) => {
    if (!lead?.id || !noteText) return;
    try {
      const payload = {
        status: selectedStatus,
        personal_info: personalData,
        academic_info: academicData,
        feedback_fields: {
          note_type: "INTERNAL_QUICK_NOTE",
          ...academicData,
          ...feedbackFields,
        },
        remarks: noteText,
      };

      await addLeadFeedback(lead.id, payload);
      await loadFeedbackHistory();
      await loadLeadData();
    } catch (error) {
      console.error("Failed to save quick note:", error);
      alert("Failed to save internal note");
    }
  };

  const handleSaveChanges = async () => {
    if (!lead?.id) return;

    try {
      setSaving(true);
      const payload = {
        status: selectedStatus,
        personal_info: personalData,
        academic_info: academicData,
        feedback_fields: {
          ...academicData,
          ...feedbackFields,
        },
        remarks: remarks.trim(),
      };

      await addLeadFeedback(lead.id, payload);

      setRemarks("");
      setFeedbackFields({});

      await loadFeedbackHistory();
      await loadLeadData();

      if (typeof onStatusUpdated === "function") {
        onStatusUpdated();
      }

      alert(
        "Lead profile, academic details, status & guided feedback saved successfully!"
      );
    } catch (error) {
      console.error("Failed to save changes:", error);
      alert(error?.response?.data?.message || "Failed to save lead updates");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  if (loading && !leadDetails) {
    return (
      <div
        className="crm-drawer-backdrop"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="crm-card"
          style={{
            padding: "32px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              height: "24px",
              width: "24px",
              borderRadius: "50%",
              border: "3px solid #2563EB",
              borderTopColor: "transparent",
              animation: "spin 1s linear infinite",
            }}
          />
          <span
            style={{ fontWeight: 700, color: "#0F172A", fontSize: "14px" }}
          >
            Loading Student Lead Details...
          </span>
        </div>
      </div>
    );
  }

  const currentLead = leadDetails || lead;
  const isEnrolled = ["ENROLLED", "ADMISSION", "ADMISSION_DONE", "COMPLETED"].includes(
    (currentLead?.status || selectedStatus || "").toUpperCase()
  );

  return (
    <>
      {/* Backdrop */}
      <div className="crm-drawer-backdrop" onClick={onClose} />

      {/* Spacious 4-Step Guided Counselling Drawer Panel */}
      <aside className="crm-drawer-panel">
        {/* HEADER & QUICK COMMUNICATION BAR */}
        <LeadSummaryHeader
          lead={currentLead}
          onClose={onClose}
          onOpenCallTab={() => setActiveTab("calls")}
        />

        {/* 5-STEP GUIDED TABS NAV BAR */}
        <LeadDetailsTabsNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* INDEPENDENT SCROLLING TAB CONTENT AREA */}
        <div className="crm-body-content">
          {/* STEP 1: PERSONAL CONTACT INFORMATION */}
          {activeTab === "personal" && (
            <PersonalInformationTab
              formData={personalData}
              onFormChange={setPersonalData}
              isEditable={isEditable}
              isLocked={isEnrolled}
            />
          )}

          {/* STEP 2: ACADEMIC PROFILE & PREFERENCES */}
          {activeTab === "academic" && (
            <AcademicInformationTab
              formData={academicData}
              onFormChange={setAcademicData}
              lead={currentLead}
              isEditable={isEditable}
              isLocked={isEnrolled}
            />
          )}

          {/* STEP 3: GUIDED COUNSELLING & CONTEXTUAL ACTION ENGINE */}
          {activeTab === "counselling" && (
            <CounsellorNotesTab
              selectedStatus={selectedStatus}
              onStatusSelect={setSelectedStatus}
              feedbackFields={feedbackFields}
              onFieldChange={handleFeedbackFieldChange}
              remarks={remarks}
              onRemarksChange={setRemarks}
              lead={currentLead}
              isEditable={isEditable}
            />
          )}

          {/* STEP 4: CALL RECORDINGS & TELEPHONY */}
          {activeTab === "calls" && (
            <CallRecordingsTab lead={currentLead} role={role} />
          )}

          {/* STEP 5: FULL AUDIT TIMELINE & INTERNAL NOTES */}
          {activeTab === "timeline" && (
            <AuditTimelineTab
              feedbackHistory={feedbackHistory}
              historyLoading={historyLoading}
              lead={currentLead}
              isEditable={isEditable}
              onSaveQuickNote={handleSaveQuickNote}
            />
          )}
        </div>

        {/* STICKY BOTTOM ACTION FOOTER */}
        <LeadDrawerFooter
          onCancel={onClose}
          onSave={handleSaveChanges}
          saving={saving}
          isEditable={isEditable}
        />
      </aside>
    </>
  );
};

export default LeadDetailsDrawer;