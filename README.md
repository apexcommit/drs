# DRS: Dataverse Retrieval System

DRS is a browser-based workbench for working with Microsoft Dataverse FetchXML queries. It is built for exploring Dataverse metadata, composing and formatting FetchXML, transforming queries into related developer-friendly outputs, and running FetchXML against Dataverse for data retrieval.

This project started from a practical need to use some of the capabilities available in the FetchXML Builder plugin for XrmToolBox. DRS is heavily inspired by the functionality and workflow ideas present in FetchXML Builder and XrmToolBox, while experimenting with a dedicated web workbench experience for FetchXML and Dataverse retrieval workflows.

## Features

- Visual FetchXML query builder for entities, attributes, filters, sorting, and linked entities.
- XML editor with import, export, reset, and formatting actions.
- Dataverse connection support using Microsoft Authentication Library (MSAL) in the browser.
- Metadata browser for Dataverse entities and attributes.
- FetchXML execution against the Dataverse Web API.
- Results grid for retrieved Dataverse rows.
- Query transformation outputs for Power Automate parameters, OData URLs, C#, and JavaScript.
- FetchXML validation and warning states before execution.
- Saved connection profiles, preferences, and metadata caching in browser storage.

## Workspace Structure

The repository is organized as an npm workspace:

- `apps/web`: React/Vite browser workbench.
- `packages/core`: FetchXML parsing, formatting, validation, query modeling, and converters.
- `packages/dataverse`: Dataverse authentication and Web API access.
- `packages/storage`: Browser persistence for preferences, connection profiles, and metadata cache.

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

Run lint checks:

```bash
npm run lint
```

## Dataverse Authentication

DRS authenticates from the browser with MSAL and requests Dataverse delegated access for the selected organization URL. You can use the default public Dataverse client ID included in the app or provide your own Entra application client ID and tenant ID in a saved connection profile.

The app stores connection profile details, preferences, and metadata caches locally in the browser. Access tokens are handled through MSAL browser storage for the current session.

## Project Status

DRS is an early prototype/workbench. The current focus is FetchXML authoring, metadata exploration, query execution, and useful transformations for Dataverse developers and makers.

## Acknowledgements

DRS is heavily inspired by [FetchXML Builder](https://fetchxmlbuilder.com) and [XrmToolBox](https://www.xrmtoolbox.com). Those tools have shaped many Dataverse development workflows, including the workflow this project is exploring in a web-based form.

## License

DRS is licensed under the GNU General Public License v3.0 or later. See `LICENSE` for details.
