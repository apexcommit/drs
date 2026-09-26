import type { AttributeSummary, EntitySummary } from "@drs/dataverse";
import {
  ArrowRight,
  Database,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { useState } from "react";

interface MetadataBrowserProps {
  selectedEntity: string;
  entities: EntitySummary[];
  attributesByEntity: Record<string, AttributeSummary[]>;
  loadingAttributeEntity: string;
  canReload: boolean;
  onEntitySelected: (entityName: string) => void;
  onLoadAttributes: (entityName: string) => void;
  onConnect: () => void;
  onReload: (entityName: string) => void;
}

export function MetadataBrowser({
  selectedEntity,
  entities,
  attributesByEntity,
  loadingAttributeEntity,
  canReload,
  onEntitySelected,
  onLoadAttributes,
  onConnect,
  onReload,
}: MetadataBrowserProps) {
  const [entityQuery, setEntityQuery] = useState("");
  const [attributeQuery, setAttributeQuery] = useState("");
  const [browsedEntity, setBrowsedEntity] = useState(selectedEntity);
  const activeEntity = entities.find(
    (entity) => entity.logicalName === browsedEntity,
  );
  const activeAttributes = activeEntity
    ? (attributesByEntity[activeEntity.logicalName] ?? [])
    : [];
  const visibleEntities = entities.filter((entity) =>
    `${entity.logicalName} ${entity.displayName} ${entity.entitySetName}`
      .toLowerCase()
      .includes(entityQuery.trim().toLowerCase()),
  );
  const attributes = activeAttributes.filter((attribute) =>
    `${attribute.logicalName} ${attribute.displayName} ${attribute.type}`
      .toLowerCase()
      .includes(attributeQuery.trim().toLowerCase()),
  );
  const isLoading = Boolean(
    activeEntity && activeEntity.logicalName === loadingAttributeEntity,
  );

  return (
    <section className="panel metadata-panel" aria-label="Metadata browser">
      <div className="panel-heading">
        <div className="heading-with-count">
          <h2>Environment metadata</h2>
          <span className="count-badge">{entities.length} entities</span>
        </div>
        <button
          type="button"
          disabled={!canReload}
          onClick={() => onReload(activeEntity?.logicalName ?? selectedEntity)}
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>
      {entities.length === 0 ? (
        <div className="empty-state spacious">
          <div className="empty-icon">
            <Database size={26} />
          </div>
          <h3>Get to know your data</h3>
          <p>
            Connect to Dataverse to browse entities, inspect attributes, and
            choose a starting point for your query.
          </p>
          <button className="primary-action" type="button" onClick={onConnect}>
            Set up connection <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <div className="metadata-layout">
          <div className="metadata-entities">
            <div className="search-box">
              <Search size={15} />
              <input
                aria-label="Search entities"
                value={entityQuery}
                onChange={(event) => setEntityQuery(event.target.value)}
                placeholder="Search entities…"
              />
            </div>
            <div className="entity-list">
              {visibleEntities.map((entity) => (
                <button
                  className={`entity-item ${entity.logicalName === activeEntity?.logicalName ? "active" : ""}`}
                  key={entity.logicalName}
                  type="button"
                  aria-pressed={
                    entity.logicalName === activeEntity?.logicalName
                  }
                  onClick={() => {
                    setBrowsedEntity(entity.logicalName);
                    setAttributeQuery("");
                    onLoadAttributes(entity.logicalName);
                  }}
                >
                  <strong>{entity.displayName || entity.logicalName}</strong>
                  <small>{entity.logicalName}</small>
                </button>
              ))}
              {visibleEntities.length === 0 ? (
                <p className="empty-state compact">
                  No entities match “{entityQuery}”.
                </p>
              ) : null}
            </div>
          </div>
          <div className="metadata-detail">
            {activeEntity ? (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>
                      {activeEntity.displayName || activeEntity.logicalName}
                    </h2>
                    <span className="subtle">
                      {activeEntity.logicalName} · {activeAttributes.length}{" "}
                      attributes
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Use ${activeEntity.logicalName} as the primary entity? This replaces the query's attributes, filters, sorting, and linked entities.`,
                        )
                      )
                        onEntitySelected(activeEntity.logicalName);
                    }}
                  >
                    Use in query <ArrowRight size={14} />
                  </button>
                </div>
                <div className="metadata-search">
                  <div className="search-box">
                    <Search size={15} />
                    <input
                      aria-label="Search attributes"
                      value={attributeQuery}
                      onChange={(event) =>
                        setAttributeQuery(event.target.value)
                      }
                      placeholder="Find an attribute by name or type…"
                    />
                  </div>
                </div>
                <div className="attribute-list">
                  {isLoading ? (
                    <output className="empty-state compact">
                      <LoaderCircle className="spin" size={20} />
                      Loading attributes…
                    </output>
                  ) : (
                    attributes.map((attribute) => (
                      <div
                        className="attribute-row"
                        key={attribute.logicalName}
                      >
                        <div>
                          <strong>
                            {attribute.displayName || attribute.logicalName}
                          </strong>
                          <small>{attribute.logicalName}</small>
                        </div>
                        <span className="type-badge">{attribute.type}</span>
                      </div>
                    ))
                  )}
                  {!isLoading && attributes.length === 0 ? (
                    <p className="empty-state compact">
                      {attributeQuery
                        ? "No matching attributes. Try a different search."
                        : "No attributes loaded. Select the entity again while connected to load its attributes."}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="empty-state spacious">
                <Database size={24} />
                <h3>Select an entity</h3>
                <p>Inspect its attributes without changing your query.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
