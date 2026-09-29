import { ChevronLeft, ChevronRight } from "lucide-react";

const CampaignPagination = ({
  page,
  totalPages,
  totalRecords,
  limit,
  onPageChange,
}) => {
  const start =
    totalRecords === 0
      ? 0
      : (page - 1) * limit + 1;

  const end = Math.min(
    page * limit,
    totalRecords
  );

  return (
    <div className="campaign-pagination">
      <div className="pagination-info">
        Showing <strong>{start}–{end}</strong> of <strong>{totalRecords}</strong> campaigns
      </div>

      <div className="pagination-actions">
        <button
          type="button"
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>

        <span className="pagination-current">
          Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong>
        </span>

        <button
          type="button"
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default CampaignPagination;