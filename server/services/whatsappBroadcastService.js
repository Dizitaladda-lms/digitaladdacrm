import pool from "../config/db.js";
import ApiError from "../utils/ApiError.js";

/**
 * Clean phone number to 10 digits
 */
const cleanPhoneNumber = (phone) => {
  if (!phone) return "";
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 10) return cleaned;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned.slice(2);
  if (cleaned.length === 11 && cleaned.startsWith("0")) return cleaned.slice(1);
  return cleaned.slice(-10);
};

/**
 * Replace template variables with real lead data
 */
export const renderTemplateForLead = (template, lead, counsellorName = "Admissions Team") => {
  if (!template) return "";
  const name = lead.full_name || "Student";
  const course = lead.course_name || lead.interested_course || "Digital Marketing";
  const batch = lead.preferred_centre || "Upcoming Batch";
  const domain = lead.domain || "DizitalAdda";

  return template
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*course\s*\}\}/gi, course)
    .replace(/\{\{\s*batch\s*\}\}/gi, batch)
    .replace(/\{\{\s*domain\s*\}\}/gi, domain)
    .replace(/\{\{\s*counsellor\s*\}\}/gi, counsellorName);
};

/**
 * Bulk WhatsApp Broadcast Service
 */
export const sendBulkWhatsAppService = async ({
  leadIds = [],
  messageTemplate = "",
  mediaUrl = null,
  sendViaApi = false,
  currentUser = {},
}) => {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    throw new ApiError(400, "Please select at least one lead to broadcast.");
  }
  if (!messageTemplate || !messageTemplate.trim()) {
    throw new ApiError(400, "Message template cannot be empty.");
  }

  // 1. Fetch leads
  const leadsRes = await pool.query(
    `SELECT id, full_name, mobile, domain, interested_course, preferred_centre, assigned_to
     FROM leads
     WHERE id = ANY($1::bigint[]) AND is_deleted = FALSE`,
    [leadIds]
  );

  const leads = leadsRes.rows;
  if (leads.length === 0) {
    throw new ApiError(404, "No active leads found for the selected IDs.");
  }

  const counsellorName = currentUser.full_name || "Admissions Team";
  const employeeId = currentUser.id || null;

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  // 2. Iterate and process each lead
  for (const lead of leads) {
    const rawMobile = cleanPhoneNumber(lead.mobile);
    const personalizedText = renderTemplateForLead(messageTemplate, lead, counsellorName);

    // Final message with media link if provided
    let finalMessage = personalizedText;
    if (mediaUrl && !finalMessage.includes(mediaUrl)) {
      finalMessage = `${personalizedText}\n\n📎 View Attachment: ${mediaUrl}`;
    }

    let apiStatus = "SKIPPED";
    let apiErrorMsg = null;

    // Send via Twilio WhatsApp API if requested & configured
    if (sendViaApi && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioWhatsappFrom =
          process.env.TWILIO_WHATSAPP_NUMBER ||
          process.env.TWILIO_CALLER_ID ||
          "+14155238886";

        const fromFormatted = twilioWhatsappFrom.startsWith("whatsapp:")
          ? twilioWhatsappFrom
          : `whatsapp:${twilioWhatsappFrom.startsWith("+") ? twilioWhatsappFrom : `+${twilioWhatsappFrom}`}`;
        const toFormatted = `whatsapp:+91${rawMobile}`;

        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const params = new URLSearchParams();
        params.append("From", fromFormatted);
        params.append("To", toFormatted);
        params.append("Body", personalizedText);
        if (mediaUrl) {
          params.append("MediaUrl", mediaUrl);
        }

        const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });
        const data = await resp.json();

        if (resp.ok && data?.sid) {
          apiStatus = "SENT";
          successCount++;
        } else {
          apiStatus = "FAILED";
          apiErrorMsg = data?.message || "Twilio WhatsApp delivery error";
          failureCount++;
        }
      } catch (err) {
        apiStatus = "FAILED";
        apiErrorMsg = err.message;
        failureCount++;
      }
    } else {
      apiStatus = "PREPARED";
      successCount++;
    }

    // 3. Log to lead_timeline
    try {
      await pool.query(
        `INSERT INTO lead_timeline 
         (lead_id, employee_id, activity_type, title, description, action, created_by)
         VALUES ($1, $2, 'WHATSAPP', 'WhatsApp Broadcast', $3, 'WHATSAPP_BROADCAST', $4)`,
        [
          lead.id,
          employeeId,
          `Broadcast message sent to +91${rawMobile} (Status: ${apiStatus}). Content: ${finalMessage.substring(0, 180)}...`,
          employeeId,
        ]
      );
    } catch (e) {
      console.warn("Timeline log warning:", e.message);
    }

    // 4. Log follow-up entry
    try {
      await pool.query(
        `INSERT INTO lead_followups
         (lead_id, employee_id, followup_type, remarks, status)
         VALUES ($1, $2, 'WHATSAPP', $3, 'COMPLETED')`,
        [lead.id, employeeId, `Bulk WhatsApp sent: ${personalizedText.substring(0, 100)}...`]
      );
    } catch (e) {
      console.warn("Followup log warning:", e.message);
    }

    results.push({
      lead_id: lead.id,
      name: lead.full_name,
      mobile: rawMobile,
      message: finalMessage,
      status: apiStatus,
      error: apiErrorMsg,
      whatsapp_url: `https://wa.me/91${rawMobile}?text=${encodeURIComponent(finalMessage)}`,
    });
  }

  return {
    success: true,
    total_requested: leadIds.length,
    processed_count: leads.length,
    success_count: successCount,
    failure_count: failureCount,
    results,
  };
};
