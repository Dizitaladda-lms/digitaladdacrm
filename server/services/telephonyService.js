import pool from "../config/db.js";
import ApiError from "../utils/ApiError.js";

/**
 * Clean phone number to 10 digits
 */
const cleanPhoneNumber = (number) => {
  if (!number) return "";
  const cleaned = String(number).replace(/\D/g, "");
  return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
};

/**
 * Format duration in seconds to "Xm Ys"
 */
export const formatDuration = (seconds) => {
  const secs = Number(seconds) || 0;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
};

/**
 * Initiate Click-To-Call bridging Counsellor and Student
 */
export const initiateClickToCallService = async ({ leadId, employeeId, customCallerNumber = null }) => {
  // 1. Fetch Lead
  const leadRes = await pool.query(
    "SELECT id, full_name, mobile, domain, interested_course, assigned_to FROM leads WHERE id = $1 AND is_deleted = FALSE",
    [leadId]
  );
  if (leadRes.rows.length === 0) {
    throw new ApiError(404, "Lead not found");
  }
  const lead = leadRes.rows[0];

  // 2. Fetch Employee / Counsellor
  const empRes = await pool.query(
    "SELECT id, full_name, email, phone, role FROM employees WHERE id = $1 AND is_deleted = FALSE",
    [employeeId]
  );
  if (empRes.rows.length === 0) {
    throw new ApiError(404, "Employee not found");
  }
  const employee = empRes.rows[0];

  const leadPhone = cleanPhoneNumber(lead.mobile);
  const counsellorPhone = cleanPhoneNumber(customCallerNumber || employee.phone);

  if (!leadPhone || leadPhone.length !== 10) {
    throw new ApiError(400, "Student has an invalid 10-digit mobile number.");
  }
  if (!counsellorPhone || counsellorPhone.length !== 10) {
    throw new ApiError(
      400,
      "Counsellor's phone number is missing or invalid. Please update your profile phone number first."
    );
  }

  const provider = (process.env.TELEPHONY_PROVIDER || "DEV_MOCK").toUpperCase();

  // Resolve Domain-Specific Caller ID / Virtual Number
  let domainCallerId = null;
  if (lead.domain) {
    const domainQuery = await pool.query(
      "SELECT caller_id, virtual_number FROM lead_domains WHERE LOWER(name) = LOWER($1)",
      [lead.domain]
    );
    if (domainQuery.rows.length > 0) {
      domainCallerId =
        domainQuery.rows[0].caller_id || domainQuery.rows[0].virtual_number;
    }
    if (!domainCallerId) {
      const envKey = `CALLER_ID_${lead.domain.toUpperCase().replace(/\W/g, "_")}`;
      domainCallerId = process.env[envKey] || null;
    }
  }

  const callerId =
    domainCallerId ||
    process.env.EXOTEL_CALLER_ID ||
    process.env.TELEPHONY_CALLER_ID ||
    "01140000000";

  const webhookUrl =
    process.env.TELEPHONY_WEBHOOK_URL ||
    `${process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, "") : "https://leads.dizitaladda.com"}/api/public/telephony/webhook`;

  let callSid = null;
  let callStatus = "INITIATED";
  let externalResponse = null;

  // 3. Provider execution
  if (provider === "EXOTEL" && process.env.EXOTEL_API_KEY && process.env.EXOTEL_API_TOKEN) {
    const accountSid = process.env.EXOTEL_ACCOUNT_SID;
    const apiKey = process.env.EXOTEL_API_KEY;
    const apiToken = process.env.EXOTEL_API_TOKEN;

    const url = `https://${apiKey}:${apiToken}@api.exotel.com/v1/Accounts/${accountSid}/Calls/connect.json`;

    const formParams = new URLSearchParams();
    formParams.append("From", `0${counsellorPhone}`);
    formParams.append("To", `0${leadPhone}`);
    formParams.append("CallerId", callerId);
    formParams.append("CallType", "trans");
    formParams.append("Record", "true");
    formParams.append("StatusCallback", webhookUrl);
    formParams.append("StatusCallbackEvents[0]", "terminal");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formParams.toString(),
      });
      const data = await response.json();
      externalResponse = data;

      if (!response.ok || !data?.Call?.Sid) {
        throw new Error(data?.RestException?.Message || "Failed to initiate call via Exotel");
      }

      callSid = data.Call.Sid;
      callStatus = data.Call.Status || "INITIATED";
    } catch (err) {
      console.error("Exotel Call Error:", err.message);
      throw new ApiError(502, `Exotel error: ${err.message}`);
    }
  } else if (provider === "MYOPERATOR" && process.env.MYOPERATOR_TOKEN) {
    // MyOperator API integration
    const url = "https://developers.myoperator.com/search-api/v1/outbound-call";
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MYOPERATOR_TOKEN}`,
        },
        body: JSON.stringify({
          company_id: process.env.MYOPERATOR_COMPANY_ID,
          secret_token: process.env.MYOPERATOR_TOKEN,
          user_id: process.env.MYOPERATOR_USER_ID,
          agent_number: counsellorPhone,
          customer_number: leadPhone,
        }),
      });
      const data = await response.json();
      externalResponse = data;
      callSid = data?.call_id || `myop_${Date.now()}`;
      callStatus = "INITIATED";
    } catch (err) {
      console.error("MyOperator Call Error:", err.message);
      throw new ApiError(502, `MyOperator error: ${err.message}`);
    }
  } else if (
    provider === "TWILIO" &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN
  ) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;

    // TwiML: Calls counsellor, upon answer connects student with automatic recording
    const twiml = `
      <Response>
        <Say>Connecting to student</Say>
        <Dial record="record-from-answer" recordingStatusCallback="${webhookUrl}">
          <Number>+91${leadPhone}</Number>
        </Dial>
      </Response>
    `.trim();

    const formParams = new URLSearchParams();
    formParams.append("To", `+91${counsellorPhone}`);
    formParams.append("From", callerId.startsWith("+") ? callerId : `+${callerId}`);
    formParams.append("Twiml", twiml);
    formParams.append("StatusCallback", webhookUrl);
    formParams.append("StatusCallbackEvent", "completed");

    try {
      const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formParams.toString(),
      });
      const data = await response.json();
      externalResponse = data;

      if (!response.ok || !data?.sid) {
        throw new Error(data?.message || "Failed to initiate call via Twilio");
      }

      callSid = data.sid;
      callStatus = data.status ? data.status.toUpperCase() : "INITIATED";
    } catch (err) {
      console.error("Twilio Call Error:", err.message);
      throw new ApiError(502, `Twilio error: ${err.message}`);
    }
  } else {
    // DEV_MOCK Mode (Instant out-of-the-box working simulation when credentials are not yet added)
    callSid = `mock_call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    callStatus = "RINGING";
  }

  // 4. Record call in database
  const insertRes = await pool.query(
    `
    INSERT INTO lead_call_logs (
      lead_id, employee_id, call_sid, provider, counsellor_number, lead_number, caller_id, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
    `,
    [lead.id, employee.id, callSid, provider, counsellorPhone, leadPhone, callerId, callStatus]
  );
  const callRecord = insertRes.rows[0];

  // 5. Add initial timeline note
  await pool.query(
    `
    INSERT INTO lead_timeline (lead_id, employee_id, activity_type, title, description)
    VALUES ($1, $2, 'CALL_LOGGED', 'Outbound Call Initiated', $3);
    `,
    [
      lead.id,
      employee.id,
      `Call initiated by ${employee.full_name} (${counsellorPhone}) to ${lead.full_name} (${leadPhone}). [${provider}]`,
    ]
  );

  return {
    success: true,
    message: "Call initiated successfully. Your phone will ring shortly.",
    call: callRecord,
    mode: provider,
  };
};

/**
 * Handle Webhook from Telephony Provider (Exotel / MyOperator / Twilio / Mock)
 */
export const processTelephonyWebhookService = async (payload) => {
  const callSid = payload.CallSid || payload.call_sid || payload.call_id || payload.id;
  if (!callSid) {
    return { success: false, message: "Missing CallSid in webhook" };
  }

  // Normalize fields across providers
  const rawStatus = payload.Status || payload.status || payload.call_status || "COMPLETED";
  const status = String(rawStatus).toUpperCase();

  const duration =
    Number(
      payload.RecordingDuration ||
        payload.DialCallDuration ||
        payload.CallDuration ||
        payload.duration ||
        payload.call_duration ||
        0
    ) || 0;

  let recordingUrl =
    payload.RecordingUrl || payload.recording_url || payload.recording || payload.audio_url || null;
  if (recordingUrl && recordingUrl.includes("twilio.com") && !recordingUrl.endsWith(".mp3")) {
    recordingUrl = `${recordingUrl}.mp3`;
  }

  // Update lead_call_logs
  const updateRes = await pool.query(
    `
    UPDATE lead_call_logs
    SET 
      status = $1,
      duration = GREATEST(duration, $2),
      recording_url = COALESCE($3, recording_url),
      recording_duration = GREATEST(recording_duration, $2),
      updated_at = CURRENT_TIMESTAMP
    WHERE call_sid = $4
    RETURNING *;
    `,
    [status, duration, recordingUrl, callSid]
  );

  if (updateRes.rows.length === 0) {
    return { success: false, message: `No call found for CallSid: ${callSid}` };
  }

  const callLog = updateRes.rows[0];

  // Add recorded audio to timeline
  if (recordingUrl) {
    const formatted = formatDuration(duration);
    await pool.query(
      `
      INSERT INTO lead_timeline (lead_id, employee_id, activity_type, title, description)
      VALUES ($1, $2, 'CALL_RECORDING_READY', 'Call Recording Available', $3);
      `,
      [
        callLog.lead_id,
        callLog.employee_id,
        `Phone call (${formatted}) recorded. Status: ${status}. Recording is ready to play.`,
      ]
    );
  }

  return { success: true, callLog };
};

/**
 * Get call logs and recordings for a lead
 */
export const getLeadCallLogsService = async (leadId) => {
  const { rows } = await pool.query(
    `
    SELECT 
      c.*,
      e.full_name AS counsellor_name,
      e.email AS counsellor_email
    FROM lead_call_logs c
    LEFT JOIN employees e ON e.id = c.employee_id
    WHERE c.lead_id = $1
    ORDER BY c.created_at DESC;
    `,
    [leadId]
  );

  return rows;
};

/**
 * Get all call logs for admin reporting
 */
export const getAllCallLogsService = async ({ page = 1, limit = 20, employeeId = null, status = null }) => {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const params = [];

  if (employeeId) {
    params.push(employeeId);
    whereClauses.push(`c.employee_id = $${params.length}`);
  }

  if (status) {
    params.push(status.toUpperCase());
    whereClauses.push(`c.status = $${params.length}`);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const countQuery = `SELECT COUNT(*) FROM lead_call_logs c ${whereStr};`;
  const countRes = await pool.query(countQuery, params);
  const total = Number(countRes.rows[0]?.count || 0);

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const dataQuery = `
    SELECT 
      c.*,
      e.full_name AS counsellor_name,
      l.full_name AS lead_name,
      l.domain AS lead_domain,
      l.lead_code
    FROM lead_call_logs c
    LEFT JOIN employees e ON e.id = c.employee_id
    LEFT JOIN leads l ON l.id = c.lead_id
    ${whereStr}
    ORDER BY c.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const { rows } = await pool.query(dataQuery, params);

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit),
    calls: rows,
  };
};

/**
 * Mock call completion helper (for dev testing before production keys are active)
 */
export const simulateMockCallCompleteService = async (callId, customRecordingUrl = null) => {
  const demoUrl =
    customRecordingUrl ||
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; // Sample MP3 for testing player

  const res = await pool.query(
    `
    UPDATE lead_call_logs
    SET 
      status = 'COMPLETED',
      duration = 145,
      recording_duration = 145,
      recording_url = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
    `,
    [demoUrl, callId]
  );

  if (res.rows[0]) {
    const callLog = res.rows[0];
    await pool.query(
      `
      INSERT INTO lead_timeline (lead_id, employee_id, activity_type, title, description)
      VALUES ($1, $2, 'CALL_RECORDING_READY', 'Call Recording Available (Demo)', 'Call duration: 2m 25s. Sample call recording attached.');
      `,
      [callLog.lead_id, callLog.employee_id]
    );
  }

  return res.rows[0] || null;
};

/**
 * Update domain caller ID / virtual number
 */
export const updateDomainCallerIdService = async (domainId, callerId) => {
  const { rows } = await pool.query(
    `
    UPDATE lead_domains
    SET caller_id = $1, virtual_number = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
    `,
    [callerId ? String(callerId).trim() : null, domainId]
  );
  return rows[0] || null;
};

/**
 * Get all domains with their configured caller ID
 */
export const getTelephonyDomainsService = async () => {
  const { rows } = await pool.query(
    "SELECT id, name, caller_id, virtual_number, is_active FROM lead_domains ORDER BY id ASC;"
  );
  return rows;
};
