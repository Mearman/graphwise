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
