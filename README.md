# graphwise

Low-dependency TypeScript graph algorithms for citation network analysis.

## Features

- **Expansion algorithms**: BASE, DOME, EDGE, HAE, PIPE, SAGE, REACH, MAZE + baselines
- **MI variants**: Jaccard, Adamic-Adar, SCALE, SKEW, SPAN, ETCH, NOTCH, Unified Adaptive
- **Path ranking**: PARSE + baselines (Katz, Communicability, PageRank, etc.)
- **Seed selection**: GRASP, Stratified
- **Subgraph extraction**: ego-network, k-core, k-truss, motif, induced, filter
- **Optional WebGPU acceleration**

## Installation

```bash
pnpm add graphwise
```

## Usage

```typescript
import { AdjacencyMapGraph, dome, parse, jaccard } from 'graphwise';

const graph = AdjacencyMapGraph.undirected();
// add nodes and edges...

const result = dome(graph, seeds);
const ranked = parse(graph, result.paths, { mi: jaccard });
```

## Commands

```bash
pnpm build          # Build ESM + CJS + UMD
pnpm test           # Run tests
pnpm test:coverage  # Run tests with coverage
pnpm typecheck      # Type check only
pnpm lint           # Run ESLint
pnpm validate       # Full QA: typecheck + lint + test + build
```

## Architecture

### Module Structure
- `src/graph/` - Core types, interfaces (ReadableGraph, MutableGraph), AdjacencyMapGraph
- `src/structures/` - PriorityQueue
- `src/traversal/` - BFS, DFS
- `src/expansion/` - BASE engine + all expansion algorithms
- `src/ranking/mi/` - MI variants (Jaccard, Adamic-Adar, SCALE, etc.)
- `src/ranking/` - PARSE + ranking baselines
- `src/seeds/` - GRASP, Stratified seed selection
- `src/extraction/` - Subgraph extraction utilities
- `src/utils/` - Shared utilities (neighbours, clustering, entropy, kmeans)
- `src/gpu/` - Optional WebGPU backend

### Key Types
- `NodeId = string`
- `ReadableGraph<N, E>` - Interface all algorithms accept
- `PriorityFunction` - (nodeId, context) => number (lower = expanded first)

## Code Standards

- **No `any`** - Use `unknown` with type guards
- **No type assertions** - Use user-defined type predicates
- **No eslint-disable** - Fix the code, not the linter
- **Explicit return types** - Required on all exported functions
- **Strict booleans** - No implicit coercion

## Testing

- 90% coverage threshold
- Property-based tests with fast-check
- Co-located `*.test.ts` files

## License

MIT
