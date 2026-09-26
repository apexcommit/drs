import { describe, expect, it } from "vitest";
import { filterResultRows, getResultColumns, toCsv } from "./ResultGrid";

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

describe("searching loaded results", () => {
  const records = [
    { name: "Contoso", revenue: 0, active: false, note: null },
    { name: "Fabrikam", "contact.fullname": "Ada Lovelace" },
  ];
  it("searches all columns without case or surrounding whitespace affecting the match", () => {
    expect(filterResultRows(records, "  ADA  ")).toEqual([records[1]]);
  });
  it("keeps zero and false searchable while treating null as empty", () => {
    expect(filterResultRows(records, "0")).toEqual([records[0]]);
    expect(filterResultRows(records, "false")).toEqual([records[0]]);
    expect(filterResultRows(records, "null")).toEqual([]);
  });
  it("returns every loaded row when search is cleared", () => {
    expect(filterResultRows(records, "   ")).toBe(records);
  });
});
