import { Trash2, X } from "lucide-react";

const DeleteLeadModal = ({
  open = false,
  lead = null,
  isBulk = false,
  bulkCount = 0,
  loading = false,
  onClose,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-3">
                <Trash2
                  size={22}
                  className="text-red-600"
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {isBulk ? "Delete Selected Leads" : "Delete Lead"}
                </h2>

                <p className="text-sm text-slate-500">
                  {isBulk
                    ? `${bulkCount} leads will be moved to trash.`
                    : "This action can be restored later."}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 px-6 py-6">
            <p className="text-sm text-slate-600">
              {isBulk
                ? `Are you sure you want to delete these ${bulkCount} selected leads?`
                : "Are you sure you want to delete this lead?"}
            </p>

            {isBulk ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <h3 className="font-semibold text-red-900 flex items-center gap-2">
                  <span>⚠️</span> {bulkCount} Leads Selected
                </h3>
                <p className="mt-1 text-xs text-red-700 leading-relaxed">
                  These leads will be soft-deleted and removed from counsellor call lists. You can restore them anytime from the trash filter.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <h3 className="font-semibold text-slate-800">
                  {lead?.full_name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {lead?.lead_code}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {lead?.mobile}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => onConfirm?.(lead)}
              className="rounded-xl bg-red-600 px-5 py-2.5 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Deleting..."
                : isBulk
                ? `Delete ${bulkCount} Leads`
                : "Delete Lead"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteLeadModal;