import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Users,
  Copy,
  ArrowRight,
} from "lucide-react";
import { parseLeadsCsv, downloadSampleLeadsTemplate } from "../../utils/parseCsv";
import { importLeads } from "../../services/leadService";

const ImportLeadsModal = ({
  open = false,
  employees = [],
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState("file"); // "file" | "paste"
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState(null); // { leads, errors, totalRows }
  const [fileName, setFileName] = useState("");
  const [defaultAssignedTo, setDefaultAssignedTo] = useState("");
  const [duplicateAction, setDuplicateAction] = useState("UPDATE"); // "UPDATE" | "SKIP"
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const fileInputRef = useRef(null);

  if (!open) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSubmitError("");
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        const result = parseLeadsCsv(content);
        setParsedData(result);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handlePasteChange = (text) => {
    setRawText(text);
    setSubmitError("");
    setImportResult(null);

    if (text.trim().length > 10) {
      const result = parseLeadsCsv(text);
      setParsedData(result);
    } else {
      setParsedData(null);
    }
  };

  const handleReset = () => {
    setParsedData(null);
    setFileName("");
    setRawText("");
    setImportResult(null);
    setSubmitError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parsedData || parsedData.leads.length === 0) {
      setSubmitError("No valid leads found to import. Please check your data.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");

      const payload = {
        leads: parsedData.leads,
        default_assigned_to: defaultAssignedTo ? Number(defaultAssignedTo) : null,
        duplicate_action: duplicateAction,
      };

      const response = await importLeads(payload);
      const data = response?.data || response;

      setImportResult(data);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Import failed:", err);
      setSubmitError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to import leads. Please verify database connection."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 via-white to-blue-50/40 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-md shadow-indigo-200">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Import Historical Leads Data
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Feed old student leads from Excel/CSV directly into your database.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Top Helper Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs">
              <div className="flex items-center gap-2 text-indigo-900 font-medium">
                <Download size={16} className="text-indigo-600 shrink-0" />
                <span>Need formatting reference? Download our pre-made CSV template:</span>
              </div>
              <button
                type="button"
                onClick={downloadSampleLeadsTemplate}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-700 transition shrink-0"
              >
                <Download size={13} />
                Download Template
              </button>
            </div>

            {/* Input Mode Selector */}
            {!importResult && (
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("file");
                    handleReset();
                  }}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
                    activeTab === "file"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Upload size={16} />
                  Upload CSV File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("paste");
                    handleReset();
                  }}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
                    activeTab === "paste"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Copy size={16} />
                  Paste CSV / Table Text
                </button>
              </div>
            )}

            {/* Success Result View */}
            {importResult && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-900">
                    Import Completed Successfully!
                  </h3>
                  <p className="text-sm text-emerald-700 mt-1">
                    Your database has been updated with the historical lead records.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
                    <span className="block text-2xl font-black text-emerald-600">
                      {importResult.inserted || 0}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      New Leads Created
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
                    <span className="block text-2xl font-black text-blue-600">
                      {importResult.updated || 0}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Duplicates Updated
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
                    <span className="block text-2xl font-black text-slate-500">
                      {importResult.skipped || 0}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Skipped / Existed
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow hover:bg-emerald-700 transition"
                  >
                    Done &amp; View Leads
                  </button>
                </div>
              </div>
            )}

            {/* Input Sections */}
            {!importResult && (
              <>
                {activeTab === "file" ? (
                  <div>
                    <label
                      htmlFor="csv-file-input"
                      className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition group"
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                        <Upload size={22} />
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {fileName ? fileName : "Click to browse or drag & drop CSV file"}
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        Supports standard .csv exported from Excel or Google Sheets
                      </span>
                      <input
                        id="csv-file-input"
                        ref={fileInputRef}
                        type="file"
                        accept=".csv, text/plain"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Paste CSV or Tab-Separated Data from Excel:
                    </label>
                    <textarea
                      rows={6}
                      value={rawText}
                      onChange={(e) => handlePasteChange(e.target.value)}
                      placeholder="Full Name, Mobile, Email, Interested Course, Domain, Source&#10;Aman Sharma, 9876543210, aman@test.com, Full Stack, DizitalAdda, WEBSITE"
                      className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                )}

                {/* Parsed Summary & Preview */}
                {parsedData && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        {parsedData.leads.length} Valid Leads Ready for DB Import
                      </span>
                      {parsedData.errors.length > 0 && (
                        <span className="text-amber-700 flex items-center gap-1.5">
                          <AlertCircle size={16} className="text-amber-600" />
                          {parsedData.errors.length} Rows with formatting issues (skipped)
                        </span>
                      )}
                    </div>

                    {/* Preview Table */}
                    {parsedData.leads.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <div className="bg-slate-100/80 px-3 py-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          Data Preview (First {Math.min(5, parsedData.leads.length)} Rows)
                        </div>
                        <div className="overflow-x-auto max-h-48">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                              <tr>
                                <th className="p-2">Name</th>
                                <th className="p-2">Mobile</th>
                                <th className="p-2">Email</th>
                                <th className="p-2">Course</th>
                                <th className="p-2">Domain</th>
                                <th className="p-2">Source</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {parsedData.leads.slice(0, 5).map((lead, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-2 font-medium text-slate-900">{lead.full_name}</td>
                                  <td className="p-2 font-mono">{lead.mobile}</td>
                                  <td className="p-2 text-slate-500">{lead.email || "-"}</td>
                                  <td className="p-2 text-slate-600">{lead.interested_course || "-"}</td>
                                  <td className="p-2">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      {lead.domain || "DizitalAdda"}
                                    </span>
                                  </td>
                                  <td className="p-2 text-slate-500">{lead.source}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Assignment & Duplicate Policy Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Assign Imported Leads to Counsellor:
                        </label>
                        <select
                          value={defaultAssignedTo}
                          onChange={(e) => setDefaultAssignedTo(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-indigo-500 font-medium"
                        >
                          <option value="">Keep Unassigned (Admin assigns later)</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.full_name} ({emp.designation || "Counsellor"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          If Lead Already Exists in Database:
                        </label>
                        <select
                          value={duplicateAction}
                          onChange={(e) => setDuplicateAction(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-indigo-500 font-medium"
                        >
                          <option value="UPDATE">Update &amp; Record as Re-inquiry (Recommended)</option>
                          <option value="SKIP">Skip (Leave existing lead untouched)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Error */}
                {submitError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!importResult && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!parsedData || parsedData.leads.length === 0 || isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Importing Data to Database...</span>
                ) : (
                  <>
                    <span>Import {parsedData?.leads?.length ? `${parsedData.leads.length} Leads` : "Data"}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ImportLeadsModal;
