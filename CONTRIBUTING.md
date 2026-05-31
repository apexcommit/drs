# Contributing

Thanks for helping improve DRS.

## Development

- Keep shared FetchXML behavior in `packages/core`.
- Keep Dataverse service code in `packages/dataverse`.
- Keep browser persistence code in `packages/storage`.
- Keep React UI behavior in `apps/web`.
- Prefer focused changes that preserve the current workspace boundaries.
- Add or update Vitest coverage when changing parser, formatter, validator, converter, storage, or query-model behavior.

## Checks

Before handing off a change, run:

```bash
npm test
npm run build
```

Use Biome for formatting and lint checks:

```bash
npm run format
npm run lint
```

Do not commit generated output such as `dist`, `node_modules`, `.tsbuildinfo`, `bin`, or `obj`.
