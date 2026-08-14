# Domain Docs

## Before exploring, read these

- `CONTEXT.md` at the repository root.
- `docs/adr/` decisions relevant to the area being changed.

If these files do not exist, proceed silently. The domain-modeling workflow creates them when terms or decisions are resolved.

## Layout

This repository uses single-context domain docs:

```text
/
├── CONTEXT.md
└── docs/
    └── adr/
```

## Vocabulary and decisions

Use terms defined in `CONTEXT.md`. Surface any conflict with an existing ADR instead of silently overriding it.
