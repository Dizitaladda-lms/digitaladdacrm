const statusStyles = {
  INTERESTED: "bg-emerald-100 text-emerald-700",
  FOLLOW_UP: "bg-amber-100 text-amber-700",
  WALK_IN: "bg-blue-100 text-blue-700",
  ENROLLED: "bg-purple-100 text-purple-700",
  NOT_INTERESTED: "bg-rose-100 text-rose-700",
  NEW: "bg-emerald-100 text-emerald-700",
  QUALIFIED: "bg-emerald-100 text-emerald-700",
  CONTACTED: "bg-amber-100 text-amber-700",
  ADMISSION: "bg-purple-100 text-purple-700",
  ADMISSION_DONE: "bg-purple-100 text-purple-700",
  LOST: "bg-rose-100 text-rose-700",
};

const statusLabels = {
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow Up",
  WALK_IN: "Walkin",
  ENROLLED: "Enrolled",
  NOT_INTERESTED: "Not Interested",
  NEW: "Interested",
  QUALIFIED: "Interested",
  CONTACTED: "Follow Up",
  ADMISSION: "Enrolled",
  ADMISSION_DONE: "Enrolled",
  LOST: "Not Interested",
};

const LeadStatusBadge = ({ status }) => {
  const norm = (status || "").toUpperCase();
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        statusStyles[norm] || "bg-gray-100 text-gray-700"
      }`}
    >
      {statusLabels[norm] || (status ? status.replace(/_/g, " ") : "--")}
    </span>
  );
};

export default LeadStatusBadge;