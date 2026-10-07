import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../config/db.js", () => ({
  default: { query },
}));

import { getLeadsRepository } from "../repositories/leadRepository.js";

describe("lead overview repository filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query
      .mockResolvedValueOnce({ rows: [{ total: "0" }] })
      .mockResolvedValueOnce({ rows: [] });
  });

  it("includes regular and agency leads in one paginated query", async () => {
    const result = await getLeadsRepository({
      page: "2",
      limit: "25",
      is_agency_lead: "all",
    });

    expect(result.pagination).toMatchObject({
      page: 2,
      limit: 25,
      totalRecords: 0,
      totalPages: 1,
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).not.toContain("l.is_agency_lead IS NOT TRUE");
    expect(query.mock.calls[0][0]).not.toContain("l.is_agency_lead = TRUE");
  });

  it("keeps agency-only filtering for existing agency leads requests", async () => {
    await getLeadsRepository({ is_agency_lead: true });

    expect(query.mock.calls[0][0]).toContain("l.is_agency_lead = TRUE");
  });

  it("keeps regular-only filtering for existing standard leads requests", async () => {
    await getLeadsRepository({});

    expect(query.mock.calls[0][0]).toContain("l.is_agency_lead IS NOT TRUE");
  });
});
