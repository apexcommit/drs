import type {
  ODataConversionOptions,
  XmlElementNode,
} from "../models/fetchXml";
import { parseFetchXml } from "../parser/parseFetchXml";

const operatorMap: Record<string, string> = {
  eq: "eq",
  ne: "ne",
  neq: "ne",
  lt: "lt",
  le: "le",
  gt: "gt",
  ge: "ge",
  "on-or-after": "ge",
  "on-or-before": "le",
};

export function toODataUrl(xml: string, options: ODataConversionOptions = {}) {
  const document = parseFetchXml(xml);
  if (document.root.name !== "fetch") {
    throw new Error("OData conversion requires a <fetch> root element.");
  }
  const entity = directChildren(document.root, "entity").at(0);
  if (!entity?.attributes.name) {
    throw new Error("OData conversion requires a root entity name.");
  }
  if (directChildren(entity, "link-entity").length) {
    throw new Error(
      "OData conversion does not support linked entities without relationship metadata.",
    );
  }
  if (
    document.root.attributes.aggregate === "true" ||
    document.root.attributes.distinct === "true"
  ) {
    throw new Error(
      "OData conversion does not support aggregate or distinct FetchXML.",
    );
  }

  const selects = directChildren(entity, "attribute").flatMap((attribute) =>
    attribute.attributes.name ? [attribute.attributes.name] : [],
  );
  const orders = directChildren(entity, "order").flatMap((order) =>
    order.attributes.attribute
      ? [
          `${order.attributes.attribute} ${
            order.attributes.descending === "true" ? "desc" : "asc"
          }`,
        ]
      : [],
  );
  const filters = directChildren(entity, "filter").flatMap((filter) => {
    const expression = filterToOData(filter);
    return expression ? [expression] : [];
  });

  const query: Array<[string, string]> = [];
  if (selects.length) query.push(["$select", selects.join(",")]);
  if (filters.length) query.push(["$filter", filters.join(" and ")]);
  if (orders.length) query.push(["$orderby", orders.join(",")]);
  if (document.root.attributes.top) {
    query.push(["$top", document.root.attributes.top]);
  }

  const qs = query
    .map(([key, value]) => `${key}=${encodeODataQueryValue(value)}`)
    .join("&");
  const entitySetName = options.entitySetName?.trim();
  if (!entitySetName) {
    throw new Error(
      "OData conversion requires the Dataverse entity-set name. Connect and load metadata first.",
    );
  }
  return `/${entitySetName}${qs ? `?${qs}` : ""}`;
}

function filterToOData(filter: XmlElementNode): string | undefined {
  const expressions = filter.children.flatMap((child) => {
    if (child.type !== "element") return [];
    if (child.name === "condition") return [conditionToOData(child)];
    if (child.name === "filter") {
      const nested = filterToOData(child);
      return nested ? [nested] : [];
    }
    return [];
  });
  if (!expressions.length) return undefined;
  if (expressions.length === 1) return expressions[0];
  const conjunction = filter.attributes.type === "or" ? " or " : " and ";
  return `(${expressions.join(conjunction)})`;
}

function conditionToOData(condition: XmlElementNode) {
  const attribute = condition.attributes.attribute;
  const operator = condition.attributes.operator;
  if (!attribute || !operator) {
    throw new Error(
      "OData conversion requires condition attributes and operators.",
    );
  }
  if (condition.attributes.valueof) {
    throw new Error("OData conversion does not support valueof conditions.");
  }
  if (operator === "null") return `${attribute} eq null`;
  if (operator === "not-null") return `${attribute} ne null`;

  const values = readConditionValues(condition);
  if (operator === "in" || operator === "not-in") {
    if (!values.length) {
      throw new Error(`OData conversion requires values for ${operator}.`);
    }
    const comparison = operator === "in" ? "eq" : "ne";
    const conjunction = operator === "in" ? " or " : " and ";
    const expression = values
      .map((value) => `${attribute} ${comparison} ${formatValue(value)}`)
      .join(conjunction);
    return values.length > 1 ? `(${expression})` : expression;
  }

  const value = values[0];
  if (value === undefined) {
    throw new Error(`OData conversion requires a value for ${operator}.`);
  }
  if (operator === "like" || operator === "not-like") {
    const expression = likeToOData(attribute, value);
    return operator === "not-like" ? `not (${expression})` : expression;
  }
  if (operator === "begins-with") {
    return `startswith(${attribute}, ${formatValue(value)})`;
  }
  if (operator === "ends-with") {
    return `endswith(${attribute}, ${formatValue(value)})`;
  }
  const mapped = operatorMap[operator];
  if (!mapped) {
    throw new Error(
      `OData conversion does not support operator "${operator}".`,
    );
  }
  return `${attribute} ${mapped} ${formatValue(value)}`;
}

function likeToOData(attribute: string, value: string) {
  if (value.includes("_")) {
    throw new Error("OData conversion does not support '_' LIKE wildcards.");
  }
  const startsWithWildcard = value.startsWith("%");
  const endsWithWildcard = value.endsWith("%");
  const literal = value.replace(/^%|%$/g, "");
  if (literal.includes("%")) {
    throw new Error(
      "OData conversion does not support embedded LIKE wildcards.",
    );
  }
  if (startsWithWildcard && endsWithWildcard) {
    return `contains(${attribute}, ${formatValue(literal)})`;
  }
  if (startsWithWildcard) {
    return `endswith(${attribute}, ${formatValue(literal)})`;
  }
  if (endsWithWildcard) {
    return `startswith(${attribute}, ${formatValue(literal)})`;
  }
  return `${attribute} eq ${formatValue(literal)}`;
}

function readConditionValues(condition: XmlElementNode) {
  if (condition.attributes.value !== undefined) {
    return [condition.attributes.value];
  }
  return directChildren(condition, "value").flatMap((value) => {
    const text = value.children.find((child) => child.type === "text");
    return text?.type === "text" ? [text.text] : [];
  });
}

function directChildren(node: XmlElementNode, name: string) {
  return node.children.filter(
    (child): child is XmlElementNode =>
      child.type === "element" && child.name === name,
  );
}

function formatValue(value: string) {
  if (/^(true|false)$/i.test(value)) return value.toLowerCase();
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return value;
  }
  if (/^\d{4}-\d{2}-\d{2}(?:T[\d:.+-]+Z?)?$/.test(value)) return value;
  return `'${value.replace(/'/g, "''")}'`;
}

function encodeODataQueryValue(value: string) {
  return encodeURI(value).replace(/#/g, "%23").replace(/&/g, "%26");
}
