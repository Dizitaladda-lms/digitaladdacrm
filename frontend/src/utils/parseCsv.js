/**
 * Universal CSV Parser and Template Generator for Lead Data Import
 */

/**
 * Splits CSV text into rows and columns, correctly handling quoted cells with commas and escaped quotes.
 * @param {string} text - Raw CSV text
 * @returns {Array<Array<string>>}
 */
export const parseRawCsv = (text) => {
  if (!text || typeof text !== "string") return [];

  // Remove Byte Order Mark (BOM) if present
  const cleanText = text.replace(/^\uFEFF/, "").trim();
  if (!cleanText) return [];

  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++; // skip \n in CRLF
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  // Push last cell/row
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
};

/**
 * Normalizes header names to target database lead attributes
 */
const normalizeHeader = (rawHeader) => {
  const h = String(rawHeader || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  if (["fullname", "name", "studentname", "candidatename", "student"].includes(h)) return "full_name";
  if (["mobile", "phone", "phonenumber", "contact", "whatsapp", "mobilenumber", "cell"].includes(h)) return "mobile";
  if (["email", "emailid", "emailaddress"].includes(h)) return "email";
  if (["course", "interestedcourse", "program", "subject"].includes(h)) return "interested_course";
  if (["centre", "center", "campus", "preferredcentre", "preferredcenter", "branch"].includes(h)) return "preferred_centre";
  if (["domain", "brand", "website", "company"].includes(h)) return "domain";
  if (["source", "leadsource", "platform"].includes(h)) return "source";
  if (["status", "leadstatus"].includes(h)) return "status";
  if (["priority"].includes(h)) return "priority";
  if (["remarks", "notes", "comment", "feedback"].includes(h)) return "remarks";
  if (["createdat", "date", "leaddate", "timestamp", "datetime"].includes(h)) return "created_at";

  return null;
};

/**
 * Parses CSV text into an array of normalized lead objects ready for API submission
 * @param {string} text - Raw CSV text
 * @returns {{ leads: Array<Object>, errors: Array<string>, totalRows: number }}
 */
export const parseLeadsCsv = (text) => {
  const rows = parseRawCsv(text);
  if (rows.length < 2) {
    return {
      leads: [],
      errors: ["CSV must contain a header row and at least one data row."],
      totalRows: 0,
    };
  }

  const rawHeaders = rows[0];
  const headerMap = rawHeaders.map((h) => normalizeHeader(h));

  const hasName = headerMap.includes("full_name");
  const hasMobile = headerMap.includes("mobile");

  if (!hasName || !hasMobile) {
    return {
      leads: [],
      errors: [
        "CSV header must contain at least 'Full Name' (or Name) and 'Mobile' (or Phone) columns.",
      ],
      totalRows: rows.length - 1,
    };
  }

  const leads = [];
  const errors = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const leadObj = {};

    for (let c = 0; c < row.length; c++) {
      const key = headerMap[c];
      if (key) {
        leadObj[key] = row[c] || null;
      }
    }

    // Clean Mobile Number
    const rawMobile = leadObj.mobile ? String(leadObj.mobile).replace(/\D/g, "") : "";
    const cleanMobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;

    if (!leadObj.full_name || leadObj.full_name.trim().length === 0) {
      errors.push(`Row ${r}: Missing Name.`);
      continue;
    }

    if (!cleanMobile || cleanMobile.length !== 10) {
      errors.push(`Row ${r} (${leadObj.full_name}): Invalid mobile number '${leadObj.mobile || ""}'. Must be 10 digits.`);
      continue;
    }

    leads.push({
      full_name: leadObj.full_name.trim(),
      mobile: cleanMobile,
      email: leadObj.email && leadObj.email.includes("@") ? leadObj.email.trim().toLowerCase() : null,
      interested_course: leadObj.interested_course ? leadObj.interested_course.trim() : null,
      preferred_centre: leadObj.preferred_centre ? leadObj.preferred_centre.trim() : null,
      domain: leadObj.domain ? leadObj.domain.trim() : "DizitalAdda",
      source: leadObj.source ? String(leadObj.source).trim().toUpperCase() : "IMPORT",
      status: leadObj.status ? String(leadObj.status).trim().toUpperCase() : "NEW",
      priority: leadObj.priority ? String(leadObj.priority).trim().toUpperCase() : "MEDIUM",
      remarks: leadObj.remarks ? leadObj.remarks.trim() : "Historical data import",
      created_at: leadObj.created_at ? leadObj.created_at.trim() : null,
    });
  }

  return {
    leads,
    errors,
    totalRows: rows.length - 1,
  };
};

/**
 * Generates and downloads a sample CSV template for the user
 */
export const downloadSampleLeadsTemplate = () => {
  const headers = [
    "Full Name",
    "Mobile",
    "Email",
    "Interested Course",
    "Domain",
    "Source",
    "Status",
    "Priority",
    "Remarks",
    "Created Date"
  ];

  const sampleRows = [
    [
      "Rahul Sharma",
      "9876543210",
      "rahul.sharma@example.com",
      "Full Stack Web Development",
      "DizitalAdda",
      "WEBSITE",
      "NEW",
      "HIGH",
      "Inquired via old batch list",
      "2026-08-15"
    ],
    [
      "Priya Patel",
      "9811223344",
      "priya.patel@example.com",
      "Data Science & AI Masterclass",
      "Nidads",
      "META",
      "CONTACTED",
      "MEDIUM",
      "Spoke with counsellor earlier",
      "2026-08-20"
    ],
    [
      "Amit Kumar",
      "9870011223",
      "amit.kumar@example.com",
      "GenAI & Prompt Engineering",
      "Nigape",
      "GOOGLE",
      "FOLLOW_UP",
      "HIGH",
      "Wants offline batch in Delhi",
      "2026-09-01"
    ]
  ];

  const csvContent =
    "\uFEFF" +
    [headers.join(","), ...sampleRows.map((row) => row.map((c) => `"${c}"`).join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "sample_leads_import_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
