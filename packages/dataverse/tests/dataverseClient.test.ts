import { afterEach, describe, expect, it, vi } from "vitest";
import { createDataverseClient } from "../src/index";

describe("Dataverse client paging", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retrieves a continuation page from the Dataverse next link", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          value: [{ accountid: "1" }],
          "@odata.nextLink":
            "https://org.crm.dynamics.com/api/data/v9.2/accounts?$skiptoken=first",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ value: [{ accountid: "2" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createDataverseClient(
      { organizationUrl: "https://org.crm.dynamics.com" },
      async () => "token",
    );

    const firstPage = await client.executeFetchXml("accounts", "<fetch />");
    const secondPage = await client.executeNextPage(firstPage.nextLink ?? "");

    expect(firstPage.rows).toEqual([{ accountid: "1" }]);
    expect(secondPage.rows).toEqual([{ accountid: "2" }]);
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(firstPage.nextLink);
  });

  it("rejects continuation links from another origin", async () => {
    const client = createDataverseClient(
      { organizationUrl: "https://org.crm.dynamics.com" },
      async () => "token",
    );

    await expect(
      client.executeNextPage("https://example.com/api/data/v9.2/accounts"),
    ).rejects.toThrow(
      "Dataverse continuation URL belongs to a different origin.",
    );
  });
});

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
