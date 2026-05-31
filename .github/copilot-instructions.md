# Copilot Instructions

This repository is DRS: Dataverse Retrieval System, a TypeScript web application for Dataverse FetchXML workflows.

- Treat `apps/web`, `packages/core`, `packages/dataverse`, and `packages/storage` as the active source tree.
- Keep FetchXML parsing, formatting, validation, query modeling, and converters in `packages/core`.
- Keep Dataverse connectivity and API integration code in `packages/dataverse`.
- Keep browser persistence code in `packages/storage`.
- Keep React UI components, styling, and workbench state in `apps/web`.
- Prefer concise, practical changes over broad rewrites.
- Preserve package boundaries unless a feature clearly needs a shared API.
- Add or update Vitest coverage when changing shared FetchXML behavior.
- Do not commit generated output such as `dist`, `node_modules`, `bin`, `obj`, or `.tsbuildinfo`.
