import type { DataverseConnectionProfile } from "@drs/storage";
import {
  CheckCircle2,
  Database,
  KeyRound,
  Pencil,
  PlugZap,
  Plus,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

interface CredentialsManagerProps {
  connectionProfiles: DataverseConnectionProfile[];
  activeConnectionProfileId: string;
  testingCredentialId: string;
  onSave: (profile: DataverseConnectionProfile) => void;
  onDelete: (profileId: string) => void;
  onUse: (profileId: string) => void;
  onTest: (profile: DataverseConnectionProfile) => void;
}

type ConnectionProfileDraft = Pick<
  DataverseConnectionProfile,
  "id" | "name" | "orgUrl" | "clientId" | "tenantId"
>;

const emptyDraft: ConnectionProfileDraft = {
  id: "",
  name: "",
  orgUrl: "",
  clientId: "",
  tenantId: "common",
};

export function CredentialsManager({
  connectionProfiles,
  activeConnectionProfileId,
  testingCredentialId,
  onSave,
  onDelete,
  onUse,
  onTest,
}: CredentialsManagerProps) {
  const [draft, setDraft] = useState<ConnectionProfileDraft>(() => ({
    ...emptyDraft,
    id: createConnectionProfileId(),
  }));
  const [saveMessage, setSaveMessage] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const sortedConnectionProfiles = useMemo(
    () =>
      [...connectionProfiles].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    [connectionProfiles],
  );
  const selectedConnectionProfile = connectionProfiles.find(
    (profile) => profile.id === draft.id,
  );
  const canSave = Boolean(
    draft.name.trim() && isValidOrganizationUrl(draft.orgUrl),
  );
  const isTestingDraft = Boolean(draft.id && testingCredentialId === draft.id);

  function startNewConnectionProfile() {
    setSaveMessage("");
    setDraft({
      ...emptyDraft,
      id: createConnectionProfileId(),
    });
    nameInputRef.current?.focus();
    nameInputRef.current?.scrollIntoView({ block: "center" });
  }

  function editConnectionProfile(profile: DataverseConnectionProfile) {
    setSaveMessage("");
    setDraft({
      id: profile.id,
      name: profile.name,
      orgUrl: profile.orgUrl,
      clientId: profile.clientId,
      tenantId: profile.tenantId,
    });
  }

  function saveConnectionProfile() {
    if (!canSave) return;
    const now = new Date().toISOString();
    const profile: DataverseConnectionProfile = {
      id: draft.id || createConnectionProfileId(),
      name: draft.name.trim(),
      orgUrl: draft.orgUrl.trim(),
      clientId: draft.clientId.trim(),
      tenantId: draft.tenantId.trim() || "common",
      updatedAt: now,
    };
    if (selectedConnectionProfile?.lastTestedAt) {
      profile.lastTestedAt = selectedConnectionProfile.lastTestedAt;
    }
    if (selectedConnectionProfile?.lastTestStatus) {
      profile.lastTestStatus = selectedConnectionProfile.lastTestStatus;
    }
    if (selectedConnectionProfile?.lastTestMessage) {
      profile.lastTestMessage = selectedConnectionProfile.lastTestMessage;
    }
    onSave(profile);
    setDraft({ ...draft, id: profile.id });
    setSaveMessage("Connection saved");
  }

  return (
    <section className="credentials-module" aria-label="Connections manager">
      <div className="module-heading">
        <div>
          <div className="eyebrow">YOUR ENVIRONMENTS</div>
          <h2>Connections</h2>
          <p>Save your environments. Switch context with confidence.</p>
        </div>
        <button
          type="button"
          className="primary-action"
          onClick={startNewConnectionProfile}
        >
          <Plus size={16} />
          <span>New connection</span>
        </button>
      </div>

      <div className="credentials-layout">
        <section className="panel credentials-list-panel">
          <div className="panel-heading compact">
            <h2>Saved Connections</h2>
            <span className="status-pill">{connectionProfiles.length}</span>
          </div>
          <div className="credentials-list">
            {sortedConnectionProfiles.length ? (
              sortedConnectionProfiles.map((profile) => (
                <article
                  className={
                    profile.id === activeConnectionProfileId
                      ? "credential-card active"
                      : "credential-card"
                  }
                  key={profile.id}
                >
                  <div className="credential-card-main">
                    <KeyRound size={18} />
                    <div>
                      <h3>{profile.name}</h3>
                      <span>{profile.orgUrl}</span>
                    </div>
                  </div>
                  <div className="credential-meta">
                    <span>{profile.tenantId || "common"}</span>
                    <ConnectionTestStatus profile={profile} />
                  </div>
                  <div className="credential-actions">
                    <button
                      type="button"
                      title="Use connection"
                      onClick={() => onUse(profile.id)}
                    >
                      <PlugZap size={15} />
                      <span>
                        {profile.id === activeConnectionProfileId
                          ? "Selected"
                          : "Use connection"}
                      </span>
                    </button>
                    <button
                      type="button"
                      title="Edit connection"
                      onClick={() => editConnectionProfile(profile)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      title="Delete connection"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete the saved connection “${profile.name}”?`,
                          )
                        )
                          onDelete(profile.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state spacious">
                <div className="empty-icon">
                  <Database size={26} />
                </div>
                <h3>A home for your environments</h3>
                <p>
                  Add your first Dataverse connection using the form. Profiles
                  are saved in this browser.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="panel credential-editor-panel">
          <div className="panel-heading compact">
            <h2>
              {selectedConnectionProfile
                ? "Connection details"
                : "Add a connection"}
            </h2>
          </div>
          <form
            className="credential-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveConnectionProfile();
            }}
            onChange={() => setSaveMessage("")}
          >
            <label>
              <span>Connection name</span>
              <input
                ref={nameInputRef}
                required
                autoComplete="off"
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                placeholder="Production sales"
              />
            </label>
            <label>
              <span>Organization URL</span>
              <input
                type="url"
                required
                value={draft.orgUrl}
                onChange={(event) =>
                  setDraft({ ...draft, orgUrl: event.target.value })
                }
                placeholder="https://org.crm.dynamics.com"
                aria-describedby="organization-url-hint"
                aria-invalid={Boolean(
                  draft.orgUrl && !isValidOrganizationUrl(draft.orgUrl),
                )}
              />
              <small id="organization-url-hint">
                Enter the full HTTPS URL of your Dataverse environment.
              </small>
            </label>
            <label>
              <span>
                Application ID <small>Optional</small>
              </span>
              <input
                value={draft.clientId}
                onChange={(event) =>
                  setDraft({ ...draft, clientId: event.target.value })
                }
                placeholder="Use the default Dataverse application"
              />
              <small>Leave blank to use the built-in public client ID.</small>
            </label>
            <label>
              <span>Tenant</span>
              <input
                value={draft.tenantId}
                onChange={(event) =>
                  setDraft({ ...draft, tenantId: event.target.value })
                }
                placeholder="common"
              />
              <small>
                Use “common” or enter your organization’s tenant ID.
              </small>
            </label>
            <output className="copy-status">{saveMessage}</output>
            <div className="credential-editor-actions">
              <button
                type="submit"
                className="primary-action"
                disabled={!canSave}
              >
                <Save size={16} />
                <span>Save connection</span>
              </button>
              <button
                type="button"
                disabled={!canSave || isTestingDraft}
                onClick={() =>
                  onTest({
                    id: draft.id || createConnectionProfileId(),
                    name: draft.name.trim(),
                    orgUrl: draft.orgUrl.trim(),
                    clientId: draft.clientId.trim(),
                    tenantId: draft.tenantId.trim() || "common",
                    updatedAt:
                      selectedConnectionProfile?.updatedAt ??
                      new Date().toISOString(),
                  })
                }
              >
                <PlugZap size={16} />
                <span>{isTestingDraft ? "Testing" : "Test"}</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}

function ConnectionTestStatus({
  profile,
}: {
  profile: DataverseConnectionProfile;
}) {
  if (!profile.lastTestStatus) {
    return <span>Not tested</span>;
  }
  if (profile.lastTestStatus === "success") {
    return (
      <span className="credential-test-status success">
        <CheckCircle2 size={14} />
        {profile.lastTestMessage || "Connected"}
      </span>
    );
  }
  return (
    <span className="credential-test-status error">
      <XCircle size={14} />
      {profile.lastTestMessage || "Failed"}
    </span>
  );
}

function createConnectionProfileId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `connection-${Date.now()}`;
}

function isValidOrganizationUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}
