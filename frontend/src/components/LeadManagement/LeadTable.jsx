import { useMemo, useState } from "react";

import {
  Eye,
  UserCheck,
  CalendarDays,
  Trash2,
  ArrowUpDown,
} from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
const STATUS_CONFIG = {
  INTERESTED: {
    label: "Interested",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  FOLLOW_UP: {
    label: "Follow Up",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  WALK_IN: {
    label: "Walkin",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  ENROLLED: {
    label: "Enrolled",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  NOT_INTERESTED: {
    label: "Not Interested",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
  // Legacy aliases fallback
  NEW: {
    label: "Interested",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  QUALIFIED: {
    label: "Interested",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  CONTACTED: {
    label: "Follow Up",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  ADMISSION: {
    label: "Enrolled",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  ADMISSION_DONE: {
    label: "Enrolled",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  LOST: {
    label: "Not Interested",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

const SOURCE_CONFIG = {
  META: {
    label: "Meta",
    className: "bg-sky-100 text-sky-700",
  },
  GOOGLE: {
    label: "Google",
    className: "bg-purple-100 text-purple-700",
  },
  MAIN_WEBSITE: {
    label: "Main Website",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "MAIN WEBSITE": {
    label: "Main Website",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  WEBSITE: {
    label: "Website",
    className: "bg-slate-100 text-slate-700",
  },
  REFERRAL: {
    label: "Referral",
    className: "bg-indigo-100 text-indigo-700",
  },
  WALK_IN: {
    label: "Walk-In",
    className: "bg-amber-100 text-amber-700",
  },
  WHATSAPP: {
    label: "WhatsApp",
    className: "bg-emerald-100 text-emerald-700",
  },
  CALL: {
    label: "Direct Call",
    className: "bg-teal-100 text-teal-700",
  },
  MANUAL: {
    label: "Manual Entry",
    className: "bg-slate-100 text-slate-700",
  },
};

const PRIORITY_CONFIG = {
  HIGH: {
    label: "High",
    className: "bg-red-100 text-red-700",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-orange-100 text-orange-700",
  },
  LOW: {
    label: "Low",
    className: "bg-green-100 text-green-700",
  },
};

const LeadTable = ({
  leads = [],
  loading = false,

  selectedLeads = [],
  setSelectedLeads,

  onView,
  onAssign,
  onFollowUp,
  onDelete,
  canDelete = false,
}) => {

  /*
  ======================================
  Sorting
  ======================================
  */

  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });

  /*
  ======================================
  Select All
  ======================================
  */

  const isAllSelected =
    leads.length > 0 &&
    selectedLeads.length === leads.length;

  const handleSelectAll = (checked) => {

    if (checked) {

      setSelectedLeads(
        leads.map((lead) => lead.id)
      );

      return;

    }

    setSelectedLeads([]);

  };

  /*
  ======================================
  Select Single
  ======================================
  */

  const handleSelectLead = (id) => {

    if (selectedLeads.includes(id)) {

      setSelectedLeads(

        selectedLeads.filter(

          (leadId) => leadId !== id

        )

      );

      return;

    }

    setSelectedLeads([

      ...selectedLeads,

      id,

    ]);

  };

  /*
  ======================================
  Sorting
  ======================================
  */

  const handleSort = (key) => {

    setSortConfig((prev) => ({

      key,

      direction:

        prev.key === key &&
        prev.direction === "asc"

          ? "desc"

          : "asc",

    }));

  };

  /*
  ======================================
  Sorted Leads
  ======================================
  */

  const sortedLeads = useMemo(() => {

    const items = [...leads];

    items.sort((a, b) => {

      const valueA = a[sortConfig.key] ?? "";

      const valueB = b[sortConfig.key] ?? "";

      if (valueA < valueB) {

        return sortConfig.direction === "asc"
          ? -1
          : 1;

      }

      if (valueA > valueB) {

        return sortConfig.direction === "asc"
          ? 1
          : -1;

      }

      return 0;

    });

    return items;

  }, [leads, sortConfig]);

  /*
  ======================================
  Date Formatter
  ======================================
  */

  const formatDate = (date) => {

    if (!date) return "--";

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );

  };

  /*
  ======================================
  Loading State
  ======================================
  */

  if (loading) {

    return null;

  }

  /*
  ======================================
  Empty State
  ======================================
  */

  if (!sortedLeads.length) {

    return null;

  }

  /*
  ======================================
  JSX
  ======================================
  */

  return (

  <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
    {/* ====================================== */}
    {/* Header */}
    {/* ====================================== */}
    <div className="flex flex-col gap-3 border-b border-slate-200/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Incoming Leads
        </h2>
        <p className="mt-0.5 text-xs font-medium text-slate-500">
          Manage and assign all captured leads from Meta Ads, Google Ads, Website and other sources.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-center">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-500">
            Total Leads
          </p>
          <h3 className="text-base font-extrabold text-indigo-700 leading-tight">
            {sortedLeads.length}
          </h3>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-1.5 text-center">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-500">
            Selected
          </p>
          <h3 className="text-base font-extrabold text-emerald-700 leading-tight">
            {selectedLeads.length}
          </h3>
        </div>
      </div>
    </div>

    {/* ====================================== */}
    {/* Table */}
    {/* ====================================== */}

    <div className="overflow-x-auto">

      <table className="min-w-[1700px] w-full border-collapse">

        {/* ============================== */}
        {/* Table Head */}
        {/* ============================== */}

        <thead className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 shadow-2xs">
          <tr className="border-b border-slate-200">
            <th className="sticky left-0 z-30 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 accent-indigo-600"
                checked={isAllSelected}
                onChange={(e)=>
                  handleSelectAll(
                    e.target.checked
                  )
                }
              />
            </th>

            <th className="px-4 py-3 text-left text-[11.5px] font-bold uppercase tracking-wider text-slate-600">
              #
            </th>

            {
              [
                ["lead_code","Lead Code"],
                ["domain","Domain"],
                ["full_name","Student"],
                ["mobile","Mobile"],
                ["course_name","Course"],
                ["source","Source"],
                ["status","Status"],
                ["priority","Priority"],
                ["assigned_employee","Assigned To"],
                ["next_followup","Follow-up"],
                ["created_at","Created"],
              ].map(([key,label])=>(
                <th
                  key={key}
                  onClick={()=>handleSort(key)}
                  className="cursor-pointer select-none px-4 py-3 text-left text-[11.5px] font-bold uppercase tracking-wider text-slate-600 transition-colors hover:text-slate-900"
                >
                 <div className="flex items-center gap-1.5">
  <span>
    {label}
  </span>
  {
    sortConfig.key === key ? (
      <span className="text-indigo-600 font-extrabold">

        {

          sortConfig.direction === "asc"

            ? "↑"

            : "↓"

        }

      </span>

    ) : (

      <ArrowUpDown size={14} className="text-slate-400" />

    )

  }

</div>

                </th>

              ))

            }

            <th className="sticky right-0 z-30 bg-slate-50 px-4 py-3 text-center text-[11.5px] font-bold uppercase tracking-wider text-slate-600">
              Actions
            </th>

          </tr>

        </thead>

        {/* ============================== */}
        {/* Table Body */}
        {/* ============================== */}

        <tbody>

  {

    sortedLeads.map((lead, index) => (

      <tr
  key={lead.id}
  className={`
    border-b border-slate-100
    transition-all duration-200
    hover:bg-blue-50/40

    ${
      selectedLeads.includes(lead.id)
        ? "bg-blue-50"
          : "bg-white"
    }
  `}
>
          {/* Checkbox */}

        <td className="sticky left-0 z-10 bg-white px-4 py-4">
<input
  type="checkbox"
  className={`
    h-4
    w-4
    rounded
    border-slate-300
    text-emerald-600

    ${
      lead.assigned_employee
        ? "cursor-not-allowed opacity-100"
        : "cursor-pointer"
    }
  `}
  checked={
    lead.assigned_employee
      ? true
      : selectedLeads.includes(lead.id)
  }
  disabled={!!lead.assigned_employee}
  onChange={() => handleSelectLead(lead.id)}
/>

        </td>

        {/* Row Number */}

        <td className="px-4 py-4 text-sm text-slate-600">

          {index + 1}

        </td>

        {/* Lead Code */}
        <td className="px-4 py-3">
          <span className="font-mono font-bold text-indigo-600">
            {lead.lead_code}
          </span>
        </td>

        {/* Domain */}
        <td className="px-4 py-3">
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
            {lead.domain || "DizitalAdda"}
          </span>
        </td>

        {/* Student */}
        <td className="px-4 py-3">
          <div>
            <p className="font-bold text-slate-900 leading-tight">
              {lead.full_name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {lead.email || "--"}
            </p>
          </div>
        </td>

        {/* Mobile */}
        <td className="px-4 py-3">
          <a
            href={`tel:${lead.mobile}`}
            className="font-bold text-slate-800 hover:text-indigo-600 transition-colors"
          >
            {lead.mobile}
          </a>
        </td>

        {/* Course */}
        <td className="px-4 py-3">
          <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-200">
            {lead.course_name || "Not Selected"}
          </span>
        </td>

        {/* Source */}

        <td className="px-4 py-4">

          <div className="flex flex-col gap-1 items-start">

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                SOURCE_CONFIG[lead.source]?.className ||
                "bg-slate-100 text-slate-700"
              }`}
            >

              {SOURCE_CONFIG[lead.source]?.label || lead.source}

            </span>

            {Number(lead.received_count) > 1 && (
              <span
                className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200"
                title={`Inquiry #${lead.received_count}. Originally from ${lead.first_source || lead.previous_source || lead.source}`}
              >
                <span className="font-bold">#{lead.received_count}</span>
                <span>(1st: {lead.first_source || lead.previous_source || "Earlier"})</span>
              </span>
            )}

          </div>

        </td>

        {/* Status */}

        <td className="px-4 py-4">

          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
              STATUS_CONFIG[lead.status]?.className ||
              "border-slate-200 bg-slate-100 text-slate-700"
            }`}
          >

            {STATUS_CONFIG[lead.status]?.label || lead.status}

          </span>

        </td>

        {/* Priority */}
        <td className="px-4 py-3">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
              PRIORITY_CONFIG[lead.priority]?.className ||
              "bg-slate-100 text-slate-700"
            }`}
          >
            {PRIORITY_CONFIG[lead.priority]?.label || lead.priority}
          </span>
        </td>

        {/* Assigned Employee */}
        <td className="px-4 py-3">
          {lead.assigned_employee ? (
            <div>
              <p className="font-bold text-slate-900 leading-tight">
                {lead.assigned_employee}
              </p>
              <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                Assigned
              </span>
            </div>
          ) : (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
              Unassigned
            </span>
          )}
        </td>

        {/* Follow-up */}
        <td className="px-4 py-3">
          {lead.next_followup ? (
            <span className="font-semibold text-slate-800">
              {formatDate(lead.next_followup)}
            </span>
          ) : (
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600 border border-rose-200">
              Pending
            </span>
          )}
        </td>

        {/* Created */}
        <td className="px-4 py-3 text-xs font-medium text-slate-600">
          {formatDate(lead.created_at)}
        </td>

        {/* Actions */}

        <td className="sticky right-0 z-10 bg-white px-4 py-3 group-hover:bg-slate-50/80 transition-colors">

          <div className="flex items-center justify-center gap-1.5">

            <button

              onClick={() => onView?.(lead)}

              title="View Lead Details"

              className="rounded-lg p-2 text-slate-500 transition-all duration-150 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-105 active:scale-95"

            >

              <Eye size={17} />

            </button>

            {lead.mobile && (
              <a
                href={`https://wa.me/91${String(lead.mobile).replace(/\D/g, "").slice(-10)}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`WhatsApp ${lead.full_name || "Lead"}`}
                className="rounded-lg p-2 text-emerald-600 transition-all duration-150 hover:bg-emerald-50 hover:text-emerald-700 hover:scale-105 active:scale-95"
              >
                <WhatsAppIcon size={17} />
              </a>
            )}

            {canDelete && (
              <button
                onClick={() => onDelete?.(lead)}
                className="rounded-lg p-2 text-rose-500 transition-all duration-150 hover:bg-rose-50 hover:text-rose-600 hover:scale-105 active:scale-95"
                title="Delete Lead"
              >
                <Trash2 size={17} />
              </button>
            )}

            {!lead.assigned_employee && (
              <button
                onClick={() => onAssign?.(lead)}
                title="Assign Lead"
                className="rounded-lg p-2 text-amber-600 transition-all duration-150 hover:bg-amber-50 hover:text-amber-700 hover:scale-105 active:scale-95"
              >
                <UserCheck size={17} />
              </button>
            )}

          </div>

        </td>

      </tr>

    ))

  }

</tbody>

      </table>

    </div>

    {/* ====================================== */}
    {/* Footer */}
    {/* ====================================== */}

    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm md:flex-row md:items-center md:justify-between">

  <p className="text-slate-600">

    Showing

    <span className="mx-1 font-semibold">

      {sortedLeads.length}

    </span>

    Lead Records

  </p>

  <div className="flex items-center gap-6">

    <span>

      Selected :

      <strong>

        {" "}

        {selectedLeads.length}

      </strong>

    </span>

    <span>

      CRM v1.0

    </span>

  </div>

</div>

  </section>

);
};

export default LeadTable;
