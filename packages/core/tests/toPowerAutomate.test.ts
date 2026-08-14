import { describe, expect, it } from "vitest";
import {
  formatFetchXml,
  readFetchQueryModel,
  toCSharpFetchXml,
  toJavaScriptFetchXml,
  toODataUrl,
  toPowerAutomateParameters,
  validateFetchXml,
  writeFetchQueryModel,
} from "../src";

const accountQuery = `<fetch>
  <entity name="account">
    <attribute name="name" />
    <attribute name="accountid" />
    <filter type="and">
      <condition attribute="name" operator="like" value="%Contoso%" />
      <condition attribute="statecode" operator="eq" value="0" />
      <condition attribute="createdon" operator="on-or-after" value="2024-01-01" />
    </filter>
  </entity>
</fetch>`;

describe("toPowerAutomateParameters", () => {
  it("replaces condition value attributes with Power Automate parameter tokens", () => {
    expect(toPowerAutomateParameters(accountQuery)).toMatchSnapshot();
  });

  it("supports nested condition value elements and duplicate attributes", () => {
    const query = `<fetch><entity name="contact"><filter><condition attribute="emailaddress1" operator="in"><value>a@example.com</value><value>b@example.com</value></condition></filter></entity></fetch>`;

    expect(toPowerAutomateParameters(query)).toMatchSnapshot();
  });

  it("accepts custom parameter names", () => {
    const result = toPowerAutomateParameters(accountQuery, {
      parameterNames: {
        name: "accountName",
        statecode: "state",
      },
    });

    expect(result.parameters.map((parameter) => parameter.name)).toEqual([
      "accountName",
      "state",
      "createdon",
    ]);
  });
});

describe("core offline workbench functions", () => {
  it("formats and validates FetchXML", () => {
    expect(
      formatFetchXml(
        `<fetch><entity name="account"><attribute name="name"/></entity></fetch>`,
      ),
    ).toMatchSnapshot();
    expect(validateFetchXml(accountQuery)).toEqual([]);
  });

  it("generates first-release converter outputs", () => {
    expect(
      toODataUrl(accountQuery, { entitySetName: "accounts" }),
    ).toMatchInlineSnapshot(
      `"/accounts?$select=name,accountid&$filter=(contains(name,%20'Contoso')%20and%20statecode%20eq%200%20and%20createdon%20ge%202024-01-01)"`,
    );
    expect(toJavaScriptFetchXml(accountQuery)).toContain("const fetchXml");
    expect(toCSharpFetchXml(accountQuery)).toContain("var fetchXml");
  });

  it("round-trips the visual builder query model", () => {
    const model = readFetchQueryModel(accountQuery);
    expect(model).toMatchObject({
      entity: "account",
      top: "",
      attributes: [{ name: "name" }, { name: "accountid" }],
      conditions: [
        { attribute: "name", operator: "like", value: "%Contoso%" },
        { attribute: "statecode", operator: "eq", value: "0" },
        {
          attribute: "createdon",
          operator: "on-or-after",
          value: "2024-01-01",
        },
      ],
    });

    expect(writeFetchQueryModel(model)).toContain('<entity name="account">');
  });

  it("round-trips fetch root properties in the visual builder query model", () => {
    const model =
      readFetchQueryModel(`<fetch top="25" distinct="true" returntotalrecordcount="true" useraworderby="true" count="10" page="2" paging-cookie="cookie-value">
  <entity name="account" />
</fetch>`);

    expect(model).toMatchObject({
      top: "25",
      distinct: true,
      returnTotalRecordCount: true,
      orderByRawValue: true,
      count: "10",
      page: "2",
      pagingCookie: "cookie-value",
    });

    const xml = writeFetchQueryModel(model);
    expect(xml).toContain('returntotalrecordcount="true"');
    expect(xml).toContain('useraworderby="true"');
    expect(xml).toContain('count="10"');
    expect(xml).toContain('page="2"');
    expect(xml).toContain('paging-cookie="cookie-value"');
  });

  it("preserves nested linked entities in the visual builder query model", () => {
    const model = readFetchQueryModel(`<fetch>
  <entity name="account">
    <link-entity name="contact" from="parentcustomerid" to="accountid" link-type="outer" alias="primarycontact">
      <link-entity name="aaduser" from="systemuserid" to="ownerid" link-type="inner" alias="owner" />
    </link-entity>
  </entity>
</fetch>`);

    expect(model.links[0]?.links[0]).toMatchObject({
      name: "aaduser",
      from: "systemuserid",
      to: "ownerid",
      alias: "owner",
    });
    expect(writeFetchQueryModel(model)).toContain(
      '<link-entity name="aaduser" from="systemuserid" to="ownerid"',
    );
  });

  it("round-trips nested filter groups in the visual builder query model", () => {
    const model = readFetchQueryModel(`<fetch>
  <entity name="account">
    <filter type="and">
      <condition attribute="name" operator="like" value="%Contoso%" />
      <filter type="or">
        <condition attribute="statecode" operator="eq" value="0" />
      </filter>
    </filter>
  </entity>
</fetch>`);

    expect(model.conditions).toHaveLength(1);
    expect(model.filters[0]).toMatchObject({
      type: "or",
      conditions: [{ attribute: "statecode", operator: "eq", value: "0" }],
    });

    const xml = writeFetchQueryModel(model);
    expect(xml).toContain('<filter type="or">');
    expect(xml).toContain(
      '<condition attribute="statecode" operator="eq" value="0" />',
    );
  });

  it("preserves sibling filters and every value in multi-value conditions", () => {
    const model = readFetchQueryModel(`<fetch>
  <entity name="account">
    <filter type="and">
      <condition attribute="statecode" operator="in">
        <value>0</value>
        <value>1</value>
      </condition>
    </filter>
    <filter type="or">
      <condition attribute="name" operator="eq" value="Contoso" />
    </filter>
  </entity>
</fetch>`);

    expect(model.filters).toHaveLength(2);
    expect(model.filters[0]?.conditions[0]?.values).toEqual(["0", "1"]);

    const xml = writeFetchQueryModel(model);
    expect(xml).toContain('<condition attribute="statecode" operator="in">');
    expect(xml).toContain("<value>0</value>");
    expect(xml).toContain("<value>1</value>");
    expect(xml).toContain('<filter type="or">');
    expect(xml).toContain(
      '<condition attribute="name" operator="eq" value="Contoso" />',
    );
  });

  it("preserves OR groups when converting to OData", () => {
    const query = `<fetch><entity name="account"><filter type="or"><condition attribute="name" operator="eq" value="A" /><condition attribute="name" operator="eq" value="B" /></filter></entity></fetch>`;

    expect(toODataUrl(query, { entitySetName: "accounts" })).toBe(
      "/accounts?$filter=(name%20eq%20'A'%20or%20name%20eq%20'B')",
    );
  });

  it("reports unsupported OData operations instead of silently dropping them", () => {
    const query = `<fetch><entity name="account"><filter><condition attribute="createdon" operator="last-x-days" value="7" /></filter></entity></fetch>`;

    expect(() => toODataUrl(query)).toThrow(
      'OData conversion does not support operator "last-x-days".',
    );
  });

  it("rejects multiple XML root elements", () => {
    const query = `<fetch><entity name="account" /></fetch><fetch><entity name="contact" /></fetch>`;

    expect(validateFetchXml(query)).toEqual([
      {
        severity: "error",
        message: "XML document must contain exactly one root element.",
        path: "/",
      },
    ]);
    expect(() => formatFetchXml(query)).toThrow(
      "XML document must contain exactly one root element.",
    );
  });
});
