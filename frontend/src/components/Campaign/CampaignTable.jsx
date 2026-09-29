import { useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
} from "lucide-react";

import "./CampaignTable.css";

const PLATFORM_CONFIG = {
  META: {
    label: "Meta",
    className: "platform-meta",
  },
  GOOGLE: {
    label: "Google",
    className: "platform-google",
  },
  WEBSITE: {
    label: "Website",
    className: "platform-website",
  },
  INSTAGRAM: {
    label: "Instagram",
    className: "platform-instagram",
  },
  WHATSAPP: {
    label: "WhatsApp",
    className: "platform-whatsapp",
  },
  REFERRAL: {
    label: "Referral",
    className: "platform-referral",
  },
  WALK_IN: {
    label: "Walk-In",
    className: "platform-walkin",
  },
};

const STATUS_CONFIG = {
  ACTIVE: {
    label: "Active",
    className: "status-active",
  },
  PAUSED: {
    label: "Paused",
    className: "status-paused",
  },
  COMPLETED: {
    label: "Completed",
    className: "status-completed",
  },
};

const CampaignTable = ({
  loading = false,
  campaigns = [],
  selectedCampaigns = [],
  setSelectedCampaigns,
  onView,
  onEdit,
  onDelete,
}) => {

  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });

  const isAllSelected =
    campaigns.length > 0 &&
    campaigns.length === selectedCampaigns.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCampaigns([]);
      return;
    }

    setSelectedCampaigns(
      campaigns.map((item) => item.id)
    );
  };

  const handleSelect = (id) => {

    if (selectedCampaigns.includes(id)) {

      setSelectedCampaigns(
        selectedCampaigns.filter(
          (item) => item !== id
        )
      );

      return;

    }

    setSelectedCampaigns([
      ...selectedCampaigns,
      id,
    ]);

  };

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

  const sortedCampaigns = useMemo(() => {

    const data = [...campaigns];

    data.sort((a, b) => {

      const valueA =
        a[sortConfig.key] ?? "";

      const valueB =
        b[sortConfig.key] ?? "";

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

    return data;

  }, [campaigns, sortConfig]);

  if (loading) {

    return (

      <div className="campaign-table-loading">

        Loading Campaigns...

      </div>

    );

  }

  if (!campaigns.length) {

    return (

      <div className="campaign-empty-state">

        <h3>No Campaign Found</h3>

        <p>

          No campaign available.

        </p>

      </div>

    );

  }

  return (

    <div className="campaign-table-container">
      <div className="campaign-table-scroll">
        <table className="campaign-table">

        <thead>

          <tr>

            <th>

              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
              />

            </th>

            <th>#</th>

            <th onClick={() => handleSort("campaign_name")}>

              <div className="table-heading">

                Campaign

                <ArrowUpDown size={15} />

              </div>

            </th>

            <th>

              Platform

            </th>

            <th>

              Status

            </th>

            <th onClick={() => handleSort("budget")}>

              <div className="table-heading">

                Budget

                <ArrowUpDown size={15} />

              </div>

            </th>

            <th>

              Start Date

            </th>

            <th>

              End Date

            </th>

            <th onClick={() => handleSort("created_at")}>

              <div className="table-heading">

                Created

                <ArrowUpDown size={15} />

              </div>

            </th>

            <th>

              Actions

            </th>

          </tr>

        </thead>
       
       
        <tbody>


          {sortedCampaigns.map((campaign, index) => {

            const platform =
              PLATFORM_CONFIG[campaign.platform] || {
                label: campaign.platform || "--",
                className: "platform-default",
              };

            const status =
              STATUS_CONFIG[campaign.status] || {
                label: campaign.status || "--",
                className: "status-default",
              };

            return (

              <tr key={campaign.id}>

                {/* Checkbox */}

                <td>

                  <input
                    type="checkbox"
                    checked={selectedCampaigns.includes(campaign.id)}
                    onChange={() => handleSelect(campaign.id)}
                  />

                </td>

                {/* Sr No */}

                <td>

                  {index + 1}

                </td>

                {/* Campaign */}

                <td>

                  <div className="campaign-name">

                    <h4>

                      {campaign.campaign_name}

                    </h4>

                    <span>

                      {campaign.campaign_code}

                    </span>

                  </div>

                </td>

                {/* Platform */}

                <td>

                  <span
                    className={`platform-badge ${platform.className}`}
                  >

                    {platform.label}

                  </span>

                </td>

                {/* Status */}

                <td>

                  <span
                    className={`status-badge ${status.className}`}
                  >

                    {status.label}

                  </span>

                </td>

                {/* Budget */}

                <td>

                  ₹
                  {Number(
                    campaign.budget || 0
                  ).toLocaleString("en-IN")}

                </td>

                {/* Start Date */}

                <td>

                  {

                    campaign.start_date

                      ?

                      new Date(

                        campaign.start_date

                      ).toLocaleDateString("en-IN")

                      :

                      "--"

                  }

                </td>

                {/* End Date */}

                <td>

                  {

                    campaign.end_date

                      ?

                      new Date(

                        campaign.end_date

                      ).toLocaleDateString("en-IN")

                      :

                      "--"

                  }

                </td>

                {/* Created */}

                <td>

                  {

                    campaign.created_at

                      ?

                      new Date(

                        campaign.created_at

                      ).toLocaleDateString("en-IN")

                      :

                      "--"

                  }

                </td>

                {/* Actions */}

                <td>

                  <div className="campaign-actions">

                    <button
                      className="view-btn"
                      title="View Campaign"
                      onClick={() => onView(campaign)}
                    >

                      <Eye size={18} />

                    </button>

                    <button
                      className="edit-btn"
                      title="Edit Campaign"
                      onClick={() => onEdit(campaign)}
                    >

                      <Pencil size={18} />

                    </button>

                    <button
                      className="delete-btn"
                      title="Delete Campaign"
                      onClick={() => onDelete(campaign)}
                    >

                      <Trash2 size={18} />

                    </button>

                  </div>

                </td>

              </tr>

            );

          })}

        </tbody>

      </table>
      </div>

      <div className="campaign-table-footer">

        <div>

          Showing

          <strong>

            {" "}

            {campaigns.length}

          </strong>

          Campaign

          {campaigns.length > 1 ? "s" : ""}

        </div>

        <div>

          Selected

          <strong>

            {" "}

            {selectedCampaigns.length}

          </strong>

        </div>

      </div>

    </div>

  );

};

export default CampaignTable;
        