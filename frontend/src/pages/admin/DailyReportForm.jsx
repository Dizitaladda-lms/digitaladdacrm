import React from "react";
import DailyReportForm from "../../components/reports/DailyReportForm";

const DailyReportPage = (props) => {
  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <DailyReportForm {...props} />
    </div>
  );
};

export default DailyReportPage;
