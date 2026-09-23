import { useMemo, useState } from "react";

import {
  Eye,
  UserCheck,
  CalendarDays,
  Trash2,
  ArrowUpDown,
} from "lucide-react";
const STATUS_CONFIG = {
  NEW: {
    label: "New",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  CONTACTED: {
    label: "Contacted",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  FOLLOW_UP: {
    label: "Follow Up",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  QUALIFIED: {
    label: "Qualified",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  ADMISSION: {
    label: "Admission",
    className: "bg-violet-100 text-violet-700 border-violet-200",
  },
  LOST: {
    label: "Lost",
    className: "bg-red-100 text-red-700 border-red-200",
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

  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

    {/* ====================================== */}
    {/* Header */}
    {/* ====================================== */}

    <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">

      <div>

        <h2 className="text-xl font-bold text-slate-800">

          Incoming Leads

        </h2>

        <p className="mt-1 text-sm text-slate-500">

          Manage and assign all captured leads from Meta Ads,
          Google Ads, Website and other sources.

        </p>

      </div>

      <div className="flex items-center gap-3">

        <div className="rounded-xl bg-blue-50 px-4 py-2">

          <p className="text-xs text-slate-500">

            Total Leads

          </p>

          <h3 className="text-lg font-bold text-blue-700">

            {sortedLeads.length}

          </h3>

        </div>

        <div className="rounded-xl bg-emerald-50 px-4 py-2">

          <p className="text-xs text-slate-500">

            Selected

          </p>

          <h3 className="text-lg font-bold text-emerald-700">

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

        <thead className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-md">

          <tr className="border-b border-slate-200">

            <th className="sticky left-0 z-30 bg-white px-4 py-4">

              <input

                type="checkbox"

                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600"

                checked={isAllSelected}

                onChange={(e)=>

                  handleSelectAll(

                    e.target.checked

                  )

                }

              />

            </th>

            <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

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

                  className="cursor-pointer select-none px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"

                >

                 <div className="flex items-center gap-2">

  <span>

    {label}

  </span>

  {

    sortConfig.key === key ? (

      <span className="text-blue-600">

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

            <th className="sticky right-0 z-30 bg-white px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">

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

<td className="px-4 py-4">

  <span className="font-mono font-semibold text-blue-700">

    {lead.lead_code}

  </span>

</td>

        {/* Domain */}

        <td className="px-4 py-4">

          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">

            {lead.domain || "DizitalAdda"}

          </span>

        </td>

        {/* Student */}

        <td className="px-4 py-4">

          <div>

            <p className="font-medium text-slate-800">

              {lead.full_name}

            </p>

            <p className="text-xs text-slate-500">

              {lead.email || "--"}

            </p>

          </div>

        </td>

        {/* Mobile */}

      <td className="px-4 py-4">

  <a
    href={`tel:${lead.mobile}`}
    className="font-medium text-slate-700 hover:text-blue-600"
  >

    {lead.mobile}

  </a>

</td>

        {/* Course */}

      <td className="px-4 py-4">

  <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm">

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

        <td className="px-4 py-4">

          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              PRIORITY_CONFIG[lead.priority]?.className ||
              "bg-slate-100 text-slate-700"
            }`}
          >

            {PRIORITY_CONFIG[lead.priority]?.label || lead.priority}

          </span>

        </td>

        {/* Assigned Employee */}

        <td className="px-4 py-4">

          {
  lead.assigned_employee ? (

    <div>

      <p className="font-semibold text-slate-800">

        {lead.assigned_employee}

      </p>

      <span className="mt-1 inline-flex rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700">

        Assigned

      </span>

    </div>

  ) : (

    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">

      Unassigned

    </span>

  )
}

        </td>

        {/* Follow-up */}

        <td className="px-4 py-4">

          {
  lead.next_followup ? (

    <span className="text-slate-700">

      {formatDate(lead.next_followup)}

    </span>

  ) : (

    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">

      Pending

    </span>

  )
}

        </td>

        {/* Created */}

        <td className="px-4 py-4">

          {formatDate(lead.created_at)}

        </td>

        {/* Actions */}

        <td className="sticky right-0 z-10 bg-white px-4 py-4">

          <div className="flex items-center justify-center gap-2">

            <button

              onClick={() => onView?.(lead)}

              title="View Lead"

              className="rounded-xl p-2 text-slate-500 transition-all duration-200 hover:-translate-y-0.5

hover:scale-105

active:scale-95 hover:bg-blue-100 hover:text-blue-600"

            >

              <Eye size={18} />

            </button>

            <button
  onClick={() => onDelete?.(lead)}
  className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
  title="Delete Lead"
>
  <Trash2 size={18} />
</button>

            {
  !lead.assigned_employee && (

    <button
      onClick={() => onAssign?.(lead)}
      title="Assign Lead"
      className="rounded-xl p-2 text-slate-500 transition-all duration-200
      hover:-translate-y-0.5
      hover:scale-105
      active:scale-95
      hover:bg-emerald-100
      hover:text-emerald-600"
    >

      <UserCheck size={18} />

    </button>

  )
}

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