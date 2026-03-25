# Graphwise Demo

Interactive visualisation demo for the graphwise library.

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm validate     # Full QA: typecheck + lint + test + build
pnpm typecheck    # Type checking only
pnpm lint         # Lint only
pnpm test         # Tests only
```

## Stack

- React 19 + Mantine UI + Vanilla Extract
- Cytoscape.js (direct, not react-cytoscapejs)
- D3.js (d3-scale, d3-shape, d3-selection)
- Zustand (3 stores: graph, animation, comparison)
- graphwise (local link to ../graphwise)
- Vite build, pnpm, turbo orchestration

## Key Patterns

- `defineSchema()` attaches `.is()` type guard to Zod schemas
- No `any` types, no `as` assertions, no eslint-disable
- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- Tabs, double quotes, British English
- Conventional commits via commitlint
