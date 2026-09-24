import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
  createLeadService,
  getAllLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
  deleteBulkLeadsService,
  restoreLeadService,

  getLeadStatisticsService,

  assignLeadService,
  assignBulkLeadsService,

  updateLeadStatusService,

  addLeadNoteService,
  getLeadNotesService,
  getLeadTimelineService,
  importLeadsService,

} from "../services/leadService.js";

/**
 * =====================================================
 * Create Lead
 * =====================================================
 */

export const createLead = asyncHandler(async (req, res) => {

  const lead = await createLeadService(
    req.body,
    req.user,
    req
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      lead,
      "Lead created successfully."
    )
  );

});

/**
 * =====================================================
 * Get All Leads
 * NOTE: req.user is now passed through so the service
 * can force assigned_to scoping for Counsellor accounts.
 * Do not remove this without re-checking leadService.js
 * =====================================================
 */

export const getAllLeads = asyncHandler(async (req, res) => {

  const leads = await getAllLeadsService(
    req.query,
    req.user
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      leads,
      "Leads fetched successfully."
    )
  );

});

/**
 * =====================================================
 * Get Lead By ID
 * NOTE: req.user is now passed through so the service
 * can reject access to leads not owned by a Counsellor.
 * =====================================================
 */

export const getLeadById = asyncHandler(async (req, res) => {

  const lead = await getLeadByIdService(
    req.params.id,
    req.user
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      lead,
      "Lead fetched successfully."
    )
  );

});

/**
 * =====================================================
 * Update Lead
 * =====================================================
 */

export const updateLead = asyncHandler(async (req, res) => {

  const lead = await updateLeadService(

    req.params.id,

    req.body,

    req.user,

    req

  );

  return res.status(200).json(

    new ApiResponse(

      200,

      lead,

      "Lead updated successfully."

    )

  );

});

/**
 * =====================================================
 * Soft Delete Lead
 * =====================================================
 */

export const deleteLead = asyncHandler(async (req, res) => {

  const lead = await deleteLeadService(

    req.params.id,

    req.user,

    req

  );

  return res.status(200).json(

    new ApiResponse(

      200,

      lead,

      "Lead deleted successfully."

    )

  );

});

/**
 * =====================================================
 * Soft Delete Bulk Leads
 * =====================================================
 */

export const deleteBulkLeads = asyncHandler(async (req, res) => {

  const leadIds = req.body.lead_ids || req.body.leadIds;

  const result = await deleteBulkLeadsService(
    leadIds,
    req.user,
    req
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      `${result.deletedCount} leads deleted successfully.`
    )
  );

});

/**
 * =====================================================
 * Restore Lead
 * =====================================================
 */

export const restoreLead = asyncHandler(async (req, res) => {

  const lead = await restoreLeadService(

    req.params.id,

    req.user,

    req

  );

  return res.status(200).json(

    new ApiResponse(

      200,

      lead,

      "Lead restored successfully."

    )

  );

});

/**
 * =====================================================
 * Lead Statistics
 * NOTE: req.user now passed through. This route is
 * currently unrestricted by role in leadRoutes.js -
 * see audit notes. Scoping added defensively so a
 * Counsellor calling this endpoint gets their own
 * numbers, not company-wide totals, until the route
 * itself is reviewed for whether it should be
 * Admin-only.
 * =====================================================
 */

export const getLeadStatistics = asyncHandler(async (req, res) => {

  const statistics =
    await getLeadStatisticsService(req.user, req.query);

  return res.status(200).json(

    new ApiResponse(

      200,

      statistics,

      "Lead statistics fetched successfully."

    )

  );

});

/**
 * =====================================================
 * Assign Lead
 * =====================================================
 */

export const assignLead = asyncHandler(async (req, res) => {

  const lead = await assignLeadService(
    req.params.id,
    req.body.employee_id,
    req.user,
    req,
    req.body.remarks || req.body.note || null,
    req.body.assignment_type || null,
    req.body.priority || null
  );

  return res.status(200).json(

    new ApiResponse(

      200,

      lead,

      "Lead assigned successfully."

    )

  );

});

/**
 * =====================================================
 * Update Lead Status
 * =====================================================
 */

export const updateLeadStatus = asyncHandler(async (req, res) => {

  const lead = await updateLeadStatusService(

    req.params.id,

    req.body.status,

    req.body.feedback,

    req.user,

    req

  );

  return res.status(200).json(

    new ApiResponse(

      200,

      lead,

      "Lead status updated successfully."

    )

  );

});

/**
 * =====================================================
 * Add Lead Note
 * =====================================================
 */

export const addLeadNote = asyncHandler(async (req, res) => {

  const note = await addLeadNoteService(

    req.params.id,

    req.body.note,

    req.user,

    req

  );

  return res.status(201).json(

    new ApiResponse(

      201,

      note,

      "Lead note added successfully."

    )

  );

});

/**
 * =====================================================
 * Get Lead Notes
 * NOTE: req.user now passed through for ownership check.
 * =====================================================
 */

export const getLeadNotes = asyncHandler(async (req, res) => {

  const notes = await getLeadNotesService(

    req.params.id,

    req.user

  );

  return res.status(200).json(

    new ApiResponse(

      200,

      notes,

      "Lead notes fetched successfully."

    )

  );

});

/**
 * =====================================================
 * Get Lead Timeline
 * NOTE: req.user now passed through for ownership check.
 * =====================================================
 */

export const getLeadTimeline = asyncHandler(async (req, res) => {

  const timeline = await getLeadTimelineService(

    req.params.id,

    req.user

  );

  return res.status(200).json(

    new ApiResponse(

      200,

      timeline,

      "Lead timeline fetched successfully."

    )

  );

});

// =====================================================
// Bulk Assign Leads
// =====================================================

export const assignBulkLeads = asyncHandler(async (req, res) => {

  const result = await assignBulkLeadsService(

    req.body,

    req.user,

    req

  );

  return res.status(200).json(

    new ApiResponse(

      200,

      result,

      "Leads assigned successfully."

    )

  );

});

/**
 * =====================================================
 * Import Historical Leads Data
 * =====================================================
 */
export const importLeads = asyncHandler(async (req, res) => {
  const result = await importLeadsService(
    req.body,
    req.user,
    req
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      `Successfully imported ${result.inserted} new leads (${result.updated} updated, ${result.skipped} skipped).`
    )
  );
});