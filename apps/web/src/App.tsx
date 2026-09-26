import {
  type FetchQueryModel,
  readFetchQueryModel,
  validateFetchXml,
  writeFetchQueryModel,
} from "@drs/core";
import {
  DEFAULT_DATAVERSE_CLIENT_ID,
  type DataverseConnectionConfig,
  type DataverseSession,
  createDataverseSession,
} from "@drs/dataverse";
import type { DataverseConnectionProfile } from "@drs/storage";
import {
  AlertCircle,
  ArrowRight,
  Blocks,
  CheckCircle2,
  ChevronDown,
  Code2,
  Copy,
  Database,
  Download,
  FileCode2,
  FileJson2,
  FileUp,
  KeyRound,
  LoaderCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  PlugZap,
  RotateCcw,
  Sparkles,
  Table2,
  Wand2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CredentialsManager } from "./components/CredentialsManager";
import { MetadataBrowser } from "./components/MetadataBrowser";
import {
  getFormattedXml,
  getOutput,
  outputTabs,
} from "./components/OutputPanel";
import { QueryBuilderPanel } from "./components/QueryBuilderPanel";
import { ResultGrid } from "./components/ResultGrid";
import { XmlEditor } from "./components/XmlEditor";
import {
  type AppModule,
  type ConnectionStatus,
  type OutputTab,
  type WorkbenchPane,
  sampleFetchXml,
  useWorkbenchStore,
} from "./store/workbenchStore";

const sidebarItems: Array<
  | {
      type: "pane";
      id: WorkbenchPane;
      label: string;
      icon: typeof Sparkles;
    }
  | {
      type: "module";
      id: AppModule;
      label: string;
      icon: typeof Sparkles;
    }
> = [
  { type: "pane", id: "builder", label: "Query builder", icon: Blocks },
  { type: "pane", id: "editor", label: "XML editor", icon: Code2 },
  { type: "pane", id: "metadata", label: "Metadata", icon: Database },
  { type: "pane", id: "results", label: "Results", icon: Table2 },
  { type: "module", id: "credentials", label: "Connections", icon: KeyRound },
];

export function App() {
  const {
    fetchXml,
    activeModule,
    activePane,
    sidebarCollapsed,
    orgUrl,
    clientId,
    tenantId,
    connectionProfiles,
    activeConnectionProfileId,
    resultRows,
    resultNextLink,
    connectionStatus,
    connectionError,
    userName,
    metadataEntities,
    metadataAttributesByEntity,
    metadataRelationshipsByEntity,
    metadataUpdatedAt,
    loadingAttributeEntity,
    loadingRelationshipEntity,
    setFetchXml,
    setOutputTab,
    setActiveModule,
    setActivePane,
    setSidebarCollapsed,
    hydrateStoredState,
    loadCachedMetadata,
    upsertConnectionProfile,
    deleteConnectionProfile,
    setConnectionProfileTestResult,
    useConnectionProfile,
    setResultRows,
    setConnectionStatus,
    setConnectedUser,
    setMetadataEntities,
    setEntityAttributes,
    setEntityRelationships,
    setLoadingAttributeEntity,
    setLoadingRelationshipEntity,
    clearLiveConnection,
  } = useWorkbenchStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataverseSessionRef = useRef<DataverseSession | null>(null);
  const previousOrgUrlRef = useRef(orgUrl);
  const [testingCredentialId, setTestingCredentialId] = useState("");
  const [hasLiveSession, setHasLiveSession] = useState(false);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [hasExecutedQuery, setHasExecutedQuery] = useState(false);
  const [transformDialogTab, setTransformDialogTab] =
    useState<OutputTab | null>(null);
  const [builderWarningCount, setBuilderWarningCount] = useState(0);
  const selectedEntity = safeReadModel(fetchXml).entity;
  const activeConnectionProfile = connectionProfiles.find(
    (profile) => profile.id === activeConnectionProfileId,
  );

  useEffect(() => {
    void hydrateStoredState();
  }, [hydrateStoredState]);

  useEffect(() => {
    if (connectionStatus === "local") setHasExecutedQuery(false);
  }, [connectionStatus]);

  useEffect(() => {
    if (previousOrgUrlRef.current === orgUrl) return;
    previousOrgUrlRef.current = orgUrl;
    dataverseSessionRef.current = null;
    setHasLiveSession(false);
    setHasExecutedQuery(false);
    setQueryError("");
    clearLiveConnection();
  }, [orgUrl, clearLiveConnection]);

  const loadEntityAttributes = useCallback(
    async (
      entityName: string,
      client = dataverseSessionRef.current?.client,
      forceRefresh = false,
    ) => {
      if (!forceRefresh && metadataAttributesByEntity[entityName]) {
        return metadataAttributesByEntity[entityName];
      }
      if (!client) return [];
      setLoadingAttributeEntity(entityName);
      try {
        const attributes = await client.listAttributes(entityName);
        const sortedAttributes = attributes
          .filter((attribute) => attribute.logicalName)
          .sort((left, right) =>
            left.logicalName.localeCompare(right.logicalName),
          );
        setEntityAttributes(entityName, sortedAttributes);
        return sortedAttributes;
      } catch (error) {
        setConnectionStatus("error", getErrorMessage(error));
        return [];
      } finally {
        setLoadingAttributeEntity("");
      }
    },
    [
      metadataAttributesByEntity,
      setConnectionStatus,
      setEntityAttributes,
      setLoadingAttributeEntity,
    ],
  );

  const loadEntityRelationships = useCallback(
    async (
      entityName: string,
      client = dataverseSessionRef.current?.client,
      forceRefresh = false,
    ) => {
      if (!forceRefresh && metadataRelationshipsByEntity[entityName]) {
        return metadataRelationshipsByEntity[entityName];
      }
      if (!forceRefresh && orgUrl) await loadCachedMetadata(orgUrl, entityName);
      if (!client) return [];
      setLoadingRelationshipEntity(entityName);
      try {
        const relationships = await client.listRelationships(entityName);
        setEntityRelationships(entityName, relationships);
        return relationships;
      } catch (error) {
        setConnectionStatus("error", getErrorMessage(error));
        return [];
      } finally {
        setLoadingRelationshipEntity("");
      }
    },
    [
      loadCachedMetadata,
      metadataRelationshipsByEntity,
      orgUrl,
      setConnectionStatus,
      setEntityRelationships,
      setLoadingRelationshipEntity,
    ],
  );

  useEffect(() => {
    if (connectionStatus !== "connected") return;
    void loadEntityAttributes(selectedEntity);
    void loadEntityRelationships(selectedEntity);
  }, [
    connectionStatus,
    loadEntityAttributes,
    loadEntityRelationships,
    selectedEntity,
  ]);

  async function connectToDataverse() {
    try {
      setConnectionStatus("connecting");
      await loadCachedMetadata(orgUrl, selectedEntity);
      const session = await createDataverseSession({
        organizationUrl: orgUrl,
        clientId: getDataverseClientId(clientId),
        tenantId,
      });
      dataverseSessionRef.current = session;
      setHasLiveSession(true);
      setQueryError("");
      setConnectedUser(session.account.username || session.account.name || "");
      setConnectionStatus("loadingMetadata");

      const entities = await session.client.listEntities();
      setMetadataEntities(
        entities
          .filter((entity) => entity.logicalName)
          .sort((left, right) =>
            left.logicalName.localeCompare(right.logicalName),
          ),
      );
      await loadEntityAttributes(selectedEntity, session.client, true);
      await loadEntityRelationships(selectedEntity, session.client, true);
      setConnectionStatus("connected");
      setActivePane("metadata");
    } catch (error) {
      dataverseSessionRef.current = null;
      setHasLiveSession(false);
      setConnectionStatus("error", getErrorMessage(error));
    }
  }

  async function testCredential(profile: DataverseConnectionProfile) {
    setTestingCredentialId(profile.id);
    upsertConnectionProfile(profile);
    try {
      const session = await createDataverseSession(
        getConnectionConfig(profile),
      );
      const entities = await session.client.listEntities();
      setConnectionProfileTestResult(
        profile.id,
        "success",
        `${entities.length} entities loaded`,
      );
    } catch (error) {
      setConnectionProfileTestResult(
        profile.id,
        "error",
        getErrorMessage(error),
      );
    } finally {
      setTestingCredentialId("");
    }
  }

  function useSavedCredential(profileId: string) {
    const profile = connectionProfiles.find(
      (connectionProfile) => connectionProfile.id === profileId,
    );
    useConnectionProfile(profileId);
    if (profile) {
      void loadCachedMetadata(profile.orgUrl, selectedEntity);
    }
    setActiveModule("workbench");
  }

  function disconnectFromDataverse() {
    dataverseSessionRef.current = null;
    setHasLiveSession(false);
    setQueryError("");
    clearLiveConnection();
  }

  async function selectEntity(entityName: string) {
    const attributes = await loadEntityAttributes(entityName);
    const model = safeReadModel(fetchXml);
    setFetchXml(
      writeFetchQueryModel({
        ...model,
        entity: entityName,
        attributes: attributes.slice(0, 3).map((attribute) => ({
          name: attribute.logicalName,
        })),
        conditions: [],
        filters: [],
        orders: [],
        links: [],
      }),
    );
  }

  async function executeQuery() {
    setQueryError("");
    const validationErrors = validateFetchXml(fetchXml).filter(
      (issue) => issue.severity === "error",
    );
    if (validationErrors.length) {
      setQueryError(
        `FetchXML validation failed: ${validationErrors
          .map((issue) => issue.message)
          .join(" ")}`,
      );
      return;
    }
    const model = readFetchQueryModel(fetchXml);
    if (builderWarningCount > 0) {
      setQueryError("Resolve builder warnings before executing FetchXML.");
      return;
    }
    if (!dataverseSessionRef.current?.client) {
      setConnectionStatus(
        "error",
        "Connect to Dataverse before executing FetchXML.",
      );
      return;
    }

    const liveEntity = metadataEntities.find(
      (entity) => entity.logicalName === model.entity,
    );
    const entitySetName = liveEntity?.entitySetName;

    if (!entitySetName) {
      setQueryError(
        `Entity "${model.entity}" was not found in loaded Dataverse metadata.`,
      );
      return;
    }

    setIsExecutingQuery(true);
    try {
      const result = await dataverseSessionRef.current.client.executeFetchXml(
        entitySetName,
        fetchXml,
      );
      setResultRows(result.rows, result.nextLink ?? "");
      setHasExecutedQuery(true);
      setConnectionStatus("connected");
      setActivePane("results");
    } catch (error) {
      setQueryError(getErrorMessage(error));
      setConnectionStatus("connected");
    } finally {
      setIsExecutingQuery(false);
    }
  }

  async function loadNextResultPage() {
    const client = dataverseSessionRef.current?.client;
    if (!client || !resultNextLink || isExecutingQuery) return;
    setIsExecutingQuery(true);
    setQueryError("");
    try {
      const result = await client.executeNextPage(resultNextLink);
      setResultRows([...resultRows, ...result.rows], result.nextLink ?? "");
      setConnectionStatus("connected");
    } catch (error) {
      setQueryError(getErrorMessage(error));
      setConnectionStatus("connected");
    } finally {
      setIsExecutingQuery(false);
    }
  }

  async function reloadMetadata(entityName: string) {
    const client = dataverseSessionRef.current?.client;
    if (!client) {
      setConnectionStatus(
        "error",
        "Connect to Dataverse before reloading metadata.",
      );
      return;
    }

    setConnectionStatus("loadingMetadata");
    try {
      const entities = await client.listEntities();
      setMetadataEntities(
        entities
          .filter((entity) => entity.logicalName)
          .sort((left, right) =>
            left.logicalName.localeCompare(right.logicalName),
          ),
      );
      await loadEntityAttributes(entityName, client, true);
      await loadEntityRelationships(entityName, client, true);
      setConnectionStatus("connected");
    } catch (error) {
      setConnectionStatus("error", getErrorMessage(error));
    }
  }

  const validationIssues = validateFetchXml(fetchXml);
  const validationErrorCount = validationIssues.filter(
    (issue) => issue.severity === "error",
  ).length;
  const currentPane = sidebarItems.find(
    (item) => item.type === "pane" && item.id === activePane,
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/drs-logo.svg" alt="" />
          <div>
            <h1>DRS</h1>
            <span>DATAVERSE TOOLS</span>
          </div>
        </div>
        <div className="topbar-context">
          <span>Workspace</span>
          <span>/</span>
          <strong>
            {activeModule === "credentials" ? "Connections" : "Query workbench"}
          </strong>
        </div>
        <button
          className="environment-button"
          type="button"
          onClick={() => setActiveModule("credentials")}
        >
          <span
            className={`connection-dot ${hasLiveSession ? "connected" : ""}`}
          />
          <span>
            {activeConnectionProfile?.name || "No environment selected"}
          </span>
          <ChevronDown size={14} />
        </button>
      </header>

      <div
        className={sidebarCollapsed ? "app-body sidebar-collapsed" : "app-body"}
      >
        <aside className="app-sidebar" aria-label="Application modules">
          <div className="sidebar-label">WORKSPACE</div>
          <button
            className="sidebar-toggle"
            type="button"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
            <span>Collapse</span>
          </button>
          <nav>
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.type === "module"
                  ? activeModule === item.id
                  : activeModule === "workbench" && activePane === item.id;
              return (
                <button
                  className={isActive ? "active" : ""}
                  key={`${item.type}-${item.id}`}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  type="button"
                  onClick={() => {
                    if (item.type === "module") {
                      setActiveModule(item.id);
                      return;
                    }
                    setActiveModule("workbench");
                    setActivePane(item.id);
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.id === "results" && resultRows.length > 0 ? (
                    <small className="nav-count">{resultRows.length}</small>
                  ) : null}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-note">
            <div className="sidebar-note-icon">
              <Database size={19} />
            </div>
            <strong>Your data. Your workspace.</strong>
            <p>
              Build locally. Connect when you’re ready to explore your
              Dataverse.
            </p>
            <button
              type="button"
              onClick={() => setActiveModule("credentials")}
            >
              Manage connections <ArrowRight size={14} />
            </button>
          </div>
          <div className="sidebar-footer">
            <span>DRS</span>
            <span>v0.1</span>
          </div>
        </aside>

        {activeModule === "workbench" ? (
          <div className="module-body">
            <div className="workspace-heading">
              <div>
                <div className="eyebrow">DATAVERSE RETRIEVAL SYSTEM</div>
                <h2>{currentPane?.label}</h2>
                <p>
                  {activePane === "builder"
                    ? "Shape your query. See every detail."
                    : activePane === "editor"
                      ? "Write and refine your FetchXML with confidence."
                      : activePane === "metadata"
                        ? "Explore entities and attributes in your environment."
                        : "Explore, filter, and export your query results."}
                </p>
              </div>
              <button
                className={`query-health ${validationErrorCount || builderWarningCount ? "has-issues" : ""}`}
                type="button"
                onClick={(event) => {
                  event.currentTarget.focus();
                  setTransformDialogTab("validation");
                }}
              >
                {validationErrorCount || builderWarningCount ? (
                  <AlertCircle size={15} />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                {validationErrorCount
                  ? `${validationErrorCount} XML errors`
                  : builderWarningCount
                    ? `${builderWarningCount} builder warnings`
                    : "Valid FetchXML"}
              </button>
            </div>
            <div className="query-toolbar">
              <div className="query-file">
                <FileCode2 size={17} />
                <span>{selectedEntity}.fetch.xml</span>
              </div>
              <div className="query-actions">
                <input
                  accept=".xml,.fetch,.txt"
                  hidden
                  ref={fileInputRef}
                  type="file"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) setFetchXml(await file.text());
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  title="Import XML"
                  aria-label="Import XML"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp size={16} />
                  <span>Import</span>
                </button>
                <button
                  type="button"
                  title="Format"
                  onClick={() => {
                    try {
                      setFetchXml(getFormattedXml(fetchXml));
                      setQueryError("");
                    } catch (error) {
                      setQueryError(getErrorMessage(error));
                    }
                  }}
                >
                  <Sparkles size={17} />
                  <span>Format</span>
                </button>
                <button
                  type="button"
                  title="Transform query"
                  onClick={(event) => {
                    event.currentTarget.focus();
                    setTransformDialogTab("powerAutomate");
                  }}
                >
                  <Wand2 size={16} />
                  <span>Transform</span>
                  <ChevronDown size={13} />
                </button>
                <button
                  type="button"
                  title="Reset query"
                  aria-label="Reset query"
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Replace the current query with the sample query and clear results?",
                      )
                    )
                      return;
                    setFetchXml(sampleFetchXml);
                    setHasExecutedQuery(false);
                    setQueryError("");
                    setResultRows([]);
                  }}
                >
                  <RotateCcw size={17} />
                </button>
                <button
                  type="button"
                  title="Export XML"
                  aria-label="Export XML"
                  onClick={() => download("query.fetch.xml", fetchXml)}
                >
                  <Download size={16} />
                  <span>Export</span>
                </button>
                <button
                  type="button"
                  className="primary-action"
                  title={
                    !hasLiveSession
                      ? "Connect to Dataverse to run this query"
                      : "Run query"
                  }
                  disabled={
                    !hasLiveSession ||
                    isExecutingQuery ||
                    builderWarningCount > 0 ||
                    validationErrorCount > 0
                  }
                  onClick={executeQuery}
                >
                  {isExecutingQuery ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Play size={16} />
                  )}
                  <span>{isExecutingQuery ? "Running…" : "Run query"}</span>
                </button>
              </div>
            </div>
            <div className="workspace">
              {queryError ? (
                <div className="workspace-alert" role="alert">
                  <AlertCircle size={16} />
                  {queryError}
                </div>
              ) : null}
              {!hasLiveSession && activePane === "builder" ? (
                <div className="connection-notice">
                  <PlugZap size={17} />
                  <p>
                    <strong>You’re working locally.</strong> Connect an
                    environment to explore metadata and run queries.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveModule("credentials")}
                  >
                    Set up connection <ArrowRight size={14} />
                  </button>
                </div>
              ) : null}
              <div className="left-stack">
                {activePane === "editor" ? (
                  <section
                    className="panel editor-panel"
                    aria-label="FetchXML editor"
                  >
                    <div className="panel-heading">
                      <h2>FetchXML</h2>
                      <span className="subtle">XML editor</span>
                    </div>
                    <XmlEditor value={fetchXml} onChange={setFetchXml} />
                  </section>
                ) : null}
                {activePane === "builder" ? (
                  <QueryBuilderPanel
                    attributesByEntity={metadataAttributesByEntity}
                    entities={metadataEntities}
                    fetchXml={fetchXml}
                    loadingAttributeEntity={loadingAttributeEntity}
                    loadingRelationshipEntity={loadingRelationshipEntity}
                    relationshipsByEntity={metadataRelationshipsByEntity}
                    onChange={setFetchXml}
                    onEntitySelected={(entityName) =>
                      void loadEntityAttributes(entityName)
                    }
                    onRelationshipsNeeded={(entityName) =>
                      void loadEntityRelationships(entityName)
                    }
                    onWarningsChange={setBuilderWarningCount}
                  />
                ) : null}
                {activePane === "metadata" ? (
                  <MetadataBrowser
                    attributesByEntity={metadataAttributesByEntity}
                    entities={metadataEntities}
                    loadingAttributeEntity={loadingAttributeEntity}
                    selectedEntity={selectedEntity}
                    onEntitySelected={selectEntity}
                    onLoadAttributes={(entityName) =>
                      void loadEntityAttributes(entityName)
                    }
                    onConnect={() => setActiveModule("credentials")}
                    onReload={(entityName) => void reloadMetadata(entityName)}
                    canReload={
                      hasLiveSession && connectionStatus !== "loadingMetadata"
                    }
                  />
                ) : null}
                {activePane === "results" ? (
                  <ResultGrid
                    canExecute={
                      hasLiveSession &&
                      builderWarningCount === 0 &&
                      validationErrorCount === 0
                    }
                    hasExecuted={hasExecutedQuery}
                    isConnected={hasLiveSession}
                    onConnect={() => setActiveModule("credentials")}
                    hasMore={Boolean(resultNextLink)}
                    isExecuting={isExecutingQuery}
                    rows={resultRows}
                    onExecute={executeQuery}
                    onLoadMore={loadNextResultPage}
                  />
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <CredentialsManager
            activeConnectionProfileId={activeConnectionProfileId}
            connectionProfiles={connectionProfiles}
            testingCredentialId={testingCredentialId}
            onDelete={deleteConnectionProfile}
            onSave={upsertConnectionProfile}
            onTest={(credential) => void testCredential(credential)}
            onUse={useSavedCredential}
          />
        )}
      </div>
      <ConnectionStrip
        activeConnectionProfile={activeConnectionProfile}
        entityCount={metadataEntities.length}
        error={connectionError || queryError}
        metadataUpdatedAt={metadataUpdatedAt}
        orgUrl={orgUrl}
        status={connectionStatus}
        userName={userName}
        onConnect={connectToDataverse}
        onDisconnect={disconnectFromDataverse}
        onManageCredentials={() => setActiveModule("credentials")}
      />
      {transformDialogTab ? (
        <TransformDialog
          entitySetName={
            metadataEntities.find(
              (entity) => entity.logicalName === selectedEntity,
            )?.entitySetName
          }
          fetchXml={fetchXml}
          selectedTab={transformDialogTab}
          onClose={() => setTransformDialogTab(null)}
          onSelect={(tab) => {
            setOutputTab(tab);
            setTransformDialogTab(tab);
          }}
        />
      ) : null}
    </main>
  );
}

function TransformDialog({
  entitySetName,
  fetchXml,
  selectedTab,
  onClose,
  onSelect,
}: {
  entitySetName: string | undefined;
  fetchXml: string;
  selectedTab: OutputTab;
  onClose: () => void;
  onSelect: (tab: OutputTab) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copyStatus, setCopyStatus] = useState("");
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  const selected = outputTabs.find((tab) => tab.id === selectedTab);
  const output = getOutput(fetchXml, selectedTab, entitySetName);
  const copyText =
    output.kind === "issues"
      ? output.issues
          .map((issue) => `${issue.severity}: ${issue.message} (${issue.path})`)
          .join("\n")
      : output.text;

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="transform-dialog"
      aria-label="Transformation result"
    >
      <div className="panel-heading builder-heading">
        <div>
          <h2>{selected?.label ?? "Transformation"}</h2>
          <span>Generated from the current FetchXML</span>
        </div>
        <div className="dialog-actions">
          <output className="copy-status">{copyStatus}</output>
          <button
            className="icon-button"
            type="button"
            title="Copy output"
            aria-label="Copy output"
            disabled={!copyText}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(copyText);
                setCopyStatus("Copied to clipboard");
              } catch {
                setCopyStatus(
                  "Could not copy. Select and copy the output manually.",
                );
              }
            }}
          >
            <Copy size={17} />
          </button>
          <button
            className="icon-button"
            type="button"
            title="Close"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>
      </div>
      <div className="panel-toolbar">
        <div className="segmented" aria-label="Transformations">
          {outputTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={tab.id === selectedTab ? "active" : ""}
                key={tab.id}
                type="button"
                title={tab.label}
                aria-pressed={tab.id === selectedTab}
                onClick={() => {
                  setCopyStatus("");
                  onSelect(tab.id);
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {output.kind === "parameters" ? (
        <div className="parameter-layout">
          <pre>{output.text}</pre>
          <div className="manifest">
            {output.parameters.map((parameter) => (
              <div className="manifest-row" key={parameter.name}>
                <FileJson2 size={15} />
                <span>{parameter.name}</span>
                <small>{parameter.inferredType}</small>
              </div>
            ))}
          </div>
        </div>
      ) : output.kind === "issues" ? (
        <div className="issues">
          {output.issues.length === 0 ? (
            <div className="empty-state">No validation issues</div>
          ) : (
            output.issues.map((issue) => (
              <div
                className={`issue ${issue.severity}`}
                key={`${issue.path}-${issue.message}`}
              >
                <AlertCircle size={16} />
                <span>{issue.message}</span>
                <small>{issue.path}</small>
              </div>
            ))
          )}
        </div>
      ) : (
        <pre>{output.text}</pre>
      )}
    </dialog>
  );
}

function ConnectionStrip({
  activeConnectionProfile,
  entityCount,
  error,
  metadataUpdatedAt,
  orgUrl,
  status,
  userName,
  onConnect,
  onDisconnect,
  onManageCredentials,
}: {
  activeConnectionProfile: DataverseConnectionProfile | undefined;
  entityCount: number;
  error: string;
  metadataUpdatedAt: string;
  orgUrl: string;
  status: ConnectionStatus;
  userName: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onManageCredentials: () => void;
}) {
  const isBusy = status === "connecting" || status === "loadingMetadata";
  const isConnected = status === "connected" || status === "loadingMetadata";
  const hasConnectionConfig = Boolean(orgUrl.trim());
  const StatusIcon = status === "error" ? AlertCircle : CheckCircle2;
  const summary =
    userName ||
    activeConnectionProfile?.name ||
    activeConnectionProfile?.orgUrl ||
    orgUrl ||
    "No environment connected";
  const profileName = activeConnectionProfile?.name || "Local workspace";

  return (
    <section
      className={
        error
          ? "connection-strip error"
          : isConnected
            ? "connection-strip ready"
            : "connection-strip"
      }
      aria-label="Connection status"
    >
      <div className="connection-strip-status">
        <StatusIcon size={16} />
        <span className="status-pill-label">{statusLabel(status)}</span>
      </div>
      <div className="connection-strip-summary">
        <div className="connection-property">
          <span>Connection</span>
          <strong>{error || summary}</strong>
        </div>
        <div className="connection-property">
          <span>Profile</span>
          <strong>{profileName}</strong>
        </div>
        <div className="connection-property metadata-property">
          <span>Metadata</span>
          <strong>
            {entityCount
              ? `${entityCount.toLocaleString()} entities cached. Last updated ${formatTimestamp(
                  metadataUpdatedAt,
                )}.`
              : "No metadata cached"}
          </strong>
        </div>
      </div>
      <div className="connection-strip-actions">
        <button type="button" onClick={onManageCredentials}>
          <KeyRound size={15} />
          <span>Connections</span>
        </button>
        {isConnected ? (
          <button type="button" onClick={onDisconnect}>
            <LogOut size={15} />
            <span>Disconnect</span>
          </button>
        ) : (
          <button
            className="primary-action"
            type="button"
            disabled={isBusy}
            onClick={hasConnectionConfig ? onConnect : onManageCredentials}
          >
            <PlugZap size={15} />
            <span>{isBusy ? "Connecting" : "Connect"}</span>
          </button>
        )}
      </div>
    </section>
  );
}

function statusLabel(status: ConnectionStatus) {
  if (status === "connecting") return "Signing in";
  if (status === "loadingMetadata") return "Loading metadata";
  if (status === "connected") return "Connected";
  if (status === "error") return "Connection error";
  return "Local mode";
}

function formatTimestamp(value: string) {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected Dataverse error.";
}

function safeReadModel(fetchXml: string): FetchQueryModel {
  try {
    return readFetchQueryModel(fetchXml);
  } catch {
    return {
      entity: "account",
      top: "50",
      distinct: false,
      returnTotalRecordCount: false,
      orderByRawValue: false,
      count: "",
      page: "",
      pagingCookie: "",
      filterType: "and",
      attributes: [{ name: "name" }],
      conditions: [],
      filters: [],
      orders: [],
      links: [],
    };
  }
}

function download(fileName: string, content: string) {
  const blob = new Blob([content], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getDataverseClientId(clientId: string) {
  return (
    clientId.trim() ||
    import.meta.env.VITE_DATAVERSE_CLIENT_ID?.trim() ||
    DEFAULT_DATAVERSE_CLIENT_ID
  );
}

function getConnectionConfig(
  credential: DataverseConnectionProfile,
): DataverseConnectionConfig {
  return {
    organizationUrl: credential.orgUrl,
    clientId: getDataverseClientId(credential.clientId),
    tenantId: credential.tenantId,
  };
}
