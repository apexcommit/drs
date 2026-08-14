import "fake-indexeddb/auto";
import { resetWebStorageDatabaseForTests } from "@drs/storage";
import { afterEach, describe, expect, it } from "vitest";
import { useWorkbenchStore } from "./workbenchStore";

describe("workbench metadata isolation", () => {
  afterEach(async () => {
    useWorkbenchStore.setState({
      orgUrl: "",
      connectionProfiles: [],
      activeConnectionProfileId: "",
      metadataEntities: [],
      metadataAttributesByEntity: {},
      metadataRelationshipsByEntity: {},
      metadataUpdatedAt: "",
      selectedEntityMetadataUpdatedAt: "",
    });
    await resetWebStorageDatabaseForTests();
  });

  it("clears in-memory metadata when switching organizations", () => {
    useWorkbenchStore.setState({
      orgUrl: "https://org-a.crm.dynamics.com",
      activeConnectionProfileId: "org-a",
      connectionProfiles: [
        {
          id: "org-a",
          name: "Org A",
          orgUrl: "https://org-a.crm.dynamics.com",
          clientId: "",
          tenantId: "common",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "org-b",
          name: "Org B",
          orgUrl: "https://org-b.crm.dynamics.com",
          clientId: "",
          tenantId: "common",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      metadataEntities: [
        {
          logicalName: "account",
          displayName: "Account A",
          entitySetName: "accounts",
        },
      ],
      metadataAttributesByEntity: {
        account: [
          { logicalName: "org_a_only", displayName: "Org A", type: "String" },
        ],
      },
      metadataRelationshipsByEntity: {
        account: [
          {
            schemaName: "org_a_relationship",
            referencedEntity: "account",
            referencedAttribute: "accountid",
            referencingEntity: "contact",
            referencingAttribute: "parentcustomerid",
          },
        ],
      },
      resultRows: [{ accountid: "org-a-account" }],
      resultNextLink:
        "https://org-a.crm.dynamics.com/api/data/v9.2/accounts?$skiptoken=1",
    });

    useWorkbenchStore.getState().useConnectionProfile("org-b");

    expect(useWorkbenchStore.getState()).toMatchObject({
      orgUrl: "https://org-b.crm.dynamics.com",
      activeConnectionProfileId: "org-b",
      metadataEntities: [],
      metadataAttributesByEntity: {},
      metadataRelationshipsByEntity: {},
      resultRows: [],
      resultNextLink: "",
    });
  });
});
