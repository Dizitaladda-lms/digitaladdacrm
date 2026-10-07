import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { getReadOnlyLeadOverview } from "../../services/leadService";
import LeadFilters from "../../components/LeadManagement/LeadFilters";
import LeadPagination from "../../components/LeadManagement/LeadPagination";

const INITIAL_FILTERS = {
  search: "",
  status: "",
  source: "",
  domain: "",
  date_from: "",
  date_to: "",
};

const ReadOnlyLeadOverview = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    totalPages: 1,
    totalRecords: 0,
  });
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getReadOnlyLeadOverview({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      const result = response?.data;
      setLeads(result?.leads || []);
      setPagination((current) => ({
        ...current,
        ...(result?.pagination || {}),
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load the read-only lead overview.");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const updateFilter = (field, value) => {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const resetFilters = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters(INITIAL_FILTERS);
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
            <ShieldCheck size={17} />
            Read-only access
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Company Lead Overview</h1>
          <p className="mt-1 text-sm text-slate-600">
            View and filter leads across the company. Changes and lead details are not available.
          </p>
        </div>
        <button
          type="button"
          onClick={loadLeads}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <LeadFilters filters={filters} onChange={updateFilter} onReset={resetFilters} />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">All Leads</h2>
            <p className="text-sm text-slate-500">
              {pagination.totalRecords} records · view-only
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Lead Code", "Name", "Mobile", "Email", "Status", "Source", "Domain", "Course", "Assigned To", "Received"].map((label) => (
                  <th key={label} className="whitespace-nowrap px-4 py-3 font-semibold">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">Loading leads…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">No leads found for these filters.</td></tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} className="text-slate-700 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-indigo-700">{lead.lead_code || "—"}</td>
                  <td className="px-4 py-3">{lead.full_name || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{lead.mobile || "—"}</td>
                  <td className="px-4 py-3">{lead.email || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{lead.status || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{lead.source || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{lead.domain || "—"}</td>
                  <td className="px-4 py-3">{lead.interested_course || lead.course_name || "—"}</td>
                  <td className="px-4 py-3">{lead.assigned_employee || "Unassigned"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <LeadPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.totalRecords}
        limit={pagination.limit}
        onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
      />
    </div>
  );
};

export default ReadOnlyLeadOverview;
