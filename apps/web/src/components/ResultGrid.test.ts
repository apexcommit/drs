import { describe, expect, it } from "vitest";
import { getResultColumns, toCsv } from "./ResultGrid";

describe("result grid data helpers", () => {
  const rows = [
    { accountid: "1", name: "First" },
    { accountid: "2", "contact.fullname": "Second Contact" },
  ];

  it("includes columns that appear after the first row", () => {
    expect(getResultColumns(rows)).toEqual([
      "accountid",
      "name",
      "contact.fullname",
    ]);
  });

  it("exports later-row columns to CSV", () => {
    expect(toCsv(rows)).toBe(
      "accountid,name,contact.fullname\n1,First,\n2,,Second Contact",
    );
  });
});
