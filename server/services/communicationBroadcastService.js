import pool from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import nodemailer from "nodemailer";

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
export const renderTemplate = (text, lead, counsellorName = "Admissions Team") => {
  if (!text) return "";
  const name = lead.full_name || "Student";
  const course = lead.course_name || lead.interested_course || "Digital Marketing";
  const batch = lead.preferred_centre || "Upcoming Batch";
  const domain = lead.domain || "DizitalAdda";

  return text
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*course\s*\}\}/gi, course)
    .replace(/\{\{\s*batch\s*\}\}/gi, batch)
    .replace(/\{\{\s*domain\s*\}\}/gi, domain)
    .replace(/\{\{\s*counsellor\s*\}\}/gi, counsellorName);
};

/**
 * Create reusable Nodemailer transporter if SMTP credentials are provided
 */
let mailTransporter = null;
const getMailTransporter = () => {
  if (mailTransporter) return mailTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    mailTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return mailTransporter;
  }
  return null;
};

/**
 * Bulk Communication Broadcast Service (WhatsApp / Email / SMS)
 */
export const sendBulkCommunicationService = async ({
  channel = "WHATSAPP", // "WHATSAPP" | "EMAIL" | "SMS"
  leadIds = [],
  subjectTemplate = "",
  messageTemplate = "",
  mediaUrl = null,
  sendViaApi = false,
  currentUser = {},
}) => {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    throw new ApiError(400, "Please select at least one lead.");
  }
  if (!messageTemplate || !messageTemplate.trim()) {
    throw new ApiError(400, "Message content cannot be empty.");
  }

  const validChannel = channel.toUpperCase();
  if (!["WHATSAPP", "EMAIL", "SMS"].includes(validChannel)) {
    throw new ApiError(400, `Unsupported channel: ${channel}`);
  }

  // 1. Fetch leads from database
  const leadsRes = await pool.query(
    `SELECT id, full_name, mobile, email, domain, interested_course, preferred_centre, assigned_to
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

  const transporter = validChannel === "EMAIL" ? getMailTransporter() : null;

  // 2. Iterate and process each lead
  for (const lead of leads) {
    const rawMobile = cleanPhoneNumber(lead.mobile);
    const email = lead.email ? lead.email.trim() : null;
    const personalizedSubject = renderTemplate(subjectTemplate, lead, counsellorName);
    const personalizedText = renderTemplate(messageTemplate, lead, counsellorName);

    let dispatchStatus = "PREPARED";
    let dispatchError = null;

    // A. EMAIL DISPATCH
    if (validChannel === "EMAIL") {
      if (!email || !email.includes("@")) {
        results.push({
          lead_id: lead.id,
          name: lead.full_name,
          email: null,
          status: "FAILED",
          error: "Missing or invalid email address",
        });
        failureCount++;
        continue;
      }

      if (sendViaApi && transporter) {
        try {
          const fromAddress =
            process.env.EMAIL_FROM ||
            `"Dizital Adda Admissions" <${process.env.SMTP_USER}>`;

          let htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
          `;

          if (mediaUrl) {
            htmlBody += `
              <div style="margin-bottom: 20px; border-radius: 12px; overflow: hidden;">
                <img src="${mediaUrl}" alt="Course Flyer" style="width: 100%; max-height: 300px; object-fit: cover; display: block;" />
              </div>
            `;
          }

          htmlBody += `
              <div style="background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <div style="white-space: pre-wrap; font-size: 15px;">${personalizedText}</div>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
                <p style="font-size: 12px; color: #64748b; margin: 0;">
                  This is an official communication regarding your enquiry with <strong>${lead.domain || "DizitalAdda"}</strong>.
                </p>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: fromAddress,
            to: email,
            subject: personalizedSubject || `Admissions Update - ${lead.domain || "DizitalAdda"}`,
            text: personalizedText,
            html: htmlBody,
          });

          dispatchStatus = "SENT";
          successCount++;
        } catch (err) {
          dispatchStatus = "FAILED";
          dispatchError = err.message;
          failureCount++;
        }
      } else {
        dispatchStatus = "PREPARED";
        successCount++;
      }
    }

    // B. SMS DISPATCH
    else if (validChannel === "SMS") {
      if (!rawMobile || rawMobile.length !== 10) {
        results.push({
          lead_id: lead.id,
          name: lead.full_name,
          mobile: null,
          status: "FAILED",
          error: "Invalid 10-digit mobile number",
        });
        failureCount++;
        continue;
      }

      if (sendViaApi && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        try {
          const accountSid = process.env.TWILIO_ACCOUNT_SID;
          const authToken = process.env.TWILIO_AUTH_TOKEN;
          const twilioFrom = process.env.TWILIO_CALLER_ID || "+14155238886";

          const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
          const params = new URLSearchParams();
          params.append("From", twilioFrom.startsWith("+") ? twilioFrom : `+${twilioFrom}`);
          params.append("To", `+91${rawMobile}`);
          params.append("Body", personalizedText);

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
            dispatchStatus = "SENT";
            successCount++;
          } else {
            dispatchStatus = "FAILED";
            dispatchError = data?.message || "Twilio SMS delivery failure";
            failureCount++;
          }
        } catch (err) {
          dispatchStatus = "FAILED";
          dispatchError = err.message;
          failureCount++;
        }
      } else {
        dispatchStatus = "PREPARED";
        successCount++;
      }
    }

    // C. WHATSAPP DISPATCH
    else if (validChannel === "WHATSAPP") {
      if (!rawMobile || rawMobile.length !== 10) {
        results.push({
          lead_id: lead.id,
          name: lead.full_name,
          mobile: null,
          status: "FAILED",
          error: "Invalid 10-digit mobile number",
        });
        failureCount++;
        continue;
      }

      let finalWhatsappText = personalizedText;
      if (mediaUrl && !finalWhatsappText.includes(mediaUrl)) {
        finalWhatsappText = `${personalizedText}\n\n📎 *View Attachment:* ${mediaUrl}`;
      }

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
          if (mediaUrl) params.append("MediaUrl", mediaUrl);

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
            dispatchStatus = "SENT";
            successCount++;
          } else {
            dispatchStatus = "FAILED";
            dispatchError = data?.message || "Twilio WhatsApp delivery failure";
            failureCount++;
          }
        } catch (err) {
          dispatchStatus = "FAILED";
          dispatchError = err.message;
          failureCount++;
        }
      } else {
        dispatchStatus = "PREPARED";
        successCount++;
      }
    }

    // 3. Log to lead_timeline
    try {
      await pool.query(
        `INSERT INTO lead_timeline 
         (lead_id, employee_id, activity_type, title, description, action, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          lead.id,
          employeeId,
          validChannel,
          `Bulk ${validChannel} Broadcast`,
          `Broadcast sent via ${validChannel} (Status: ${dispatchStatus}). Preview: ${personalizedText.substring(0, 150)}...`,
          `BULK_${validChannel}_SENT`,
          employeeId,
        ]
      );
    } catch (e) {
      console.warn("Timeline log warning:", e.message);
    }

    // 4. Log to lead_followups
    try {
      await pool.query(
        `INSERT INTO lead_followups
         (lead_id, employee_id, followup_type, remarks, status)
         VALUES ($1, $2, $3, $4, 'COMPLETED')`,
        [lead.id, employeeId, validChannel, `Bulk ${validChannel} sent: ${personalizedText.substring(0, 100)}...`]
      );
    } catch (e) {
      console.warn("Followup log warning:", e.message);
    }

    results.push({
      lead_id: lead.id,
      name: lead.full_name,
      mobile: rawMobile,
      email: email,
      status: dispatchStatus,
      error: dispatchError,
    });
  }

  return {
    success: true,
    channel: validChannel,
    total_requested: leadIds.length,
    processed_count: leads.length,
    success_count: successCount,
    failure_count: failureCount,
    results,
  };
};
