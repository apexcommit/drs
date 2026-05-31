# DRS: Dataverse Retrieval System

DRS is a TypeScript web application for building, validating, converting, and running Dataverse FetchXML queries.

The workspace is organized into focused packages:

- `apps/web`: React/Vite browser workbench
- `packages/core`: FetchXML parsing, formatting, validation, query modeling, and converters
- `packages/dataverse`: Dataverse authentication and API access
- `packages/storage`: Browser persistence for preferences, profiles, and metadata cache

## Getting Started

Install dependencies:

```bash
npm install
```

Run the web app locally:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build all workspaces:

```bash
npm run build
```

## License

DRS is licensed under the GNU General Public License v3.0 or later. See `LICENSE` for details.
