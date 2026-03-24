# graphwise

[![DOI](https://zenodo.org/badge/1190809040.svg)](https://doi.org/10.5281/zenodo.19209820)
[![npm](https://img.shields.io/badge/npm-cb3837?logo=npm)](https://www.npmjs.com/package/graphwise)
[![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github)](https://github.com/Mearman/graphwise)

Low-dependency TypeScript graph algorithms for citation network analysis: novel expansion, MI variants, and path ranking.

## Features

- **Expansion algorithms**: BASE, DOME, EDGE, HAE, PIPE, SAGE, REACH, MAZE + 6 variants (TIDE, LACE, WARP, FUSE, SIFT, FLUX) + baselines
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
import { AdjacencyMapGraph, dome, parse, jaccard } from "graphwise";

const graph = AdjacencyMapGraph.undirected();
// add nodes and edges...

const result = dome(graph, seeds);
const ranked = parse(graph, result.paths, { mi: jaccard });
```

## Algorithms

### Expansion: BASE Framework

**Boundary-free Adaptive Seeded Expansion** (BASE) is a parameter-free graph expansion algorithm. Given a graph $G = (V, E)$ and seed nodes $S \subseteq V$, BASE produces the subgraph induced by all vertices visited during priority-ordered expansion until frontier exhaustion:

$$G_S = (V_S, E_S) \quad \text{where} \quad V_S = \bigcup_{v \in S} \text{Expand}(v, \pi)$$

Three key properties:

1. **Priority-ordered exploration**: the vertex with globally minimum priority $\pi(v)$ is expanded next across all frontiers
2. **Frontier collision detection**: when a vertex is reached by multiple frontiers, the connecting path is recorded
3. **Implicit termination**: halts when all frontier queues are empty; no depth bound or size threshold

#### DOME: Degree-Ordered Multi-seed Expansion

The default priority function uses degree-based hub deferral:

$$\pi(v) = \frac{\deg^{+}(v) + \deg^{-}(v)}{w_V(v) + \varepsilon}$$

where $\deg^{+}(v)$ is weighted out-degree, $\deg^{-}(v)$ is weighted in-degree, $w_V(v)$ is node weight, and $\varepsilon > 0$ prevents division by zero.

#### Expansion Variants

| Algorithm | Priority Function                                      | Phases |
| --------- | ------------------------------------------------------ | ------ |
| **DOME**  | Degree (hub deferral)                                  | 1      |
| **EDGE**  | Local neighbourhood type entropy                       | 1      |
| **HAE**   | User-supplied type entropy (generalises EDGE)          | 1      |
| **PIPE**  | Path potential (neighbours visited by other frontiers) | 1      |
| **SAGE**  | Salience accumulation from discovered paths            | 2      |
| **REACH** | Rolling MI estimates of discovered path quality        | 2      |
| **MAZE**  | PIPE + SAGE + adaptive termination                     | 3      |
| **TIDE**  | Sum of node + all-neighbour degrees                    | 1      |
| **LACE**  | Average MI to same-frontier visited nodes              | 1      |
| **WARP**  | Cross-frontier bridge score                            | 1      |
| **FUSE**  | Weighted degree + MI blend                             | 1      |
| **SIFT**  | MI threshold with degree fallback                      | 1      |
| **FLUX**  | Density-adaptive strategy switching                    | 1      |

### Path Ranking: PARSE

**Path Aggregation Ranked by Salience Estimation** (PARSE) scores paths by the geometric mean of per-edge mutual information, eliminating length bias:

$$M(P) = \exp\left( \frac{1}{k} \sum_{i=1}^{k} \log I(u_i, v_i) \right)$$

where $k$ is path length (number of edges) and $I(u_i, v_i)$ is the per-edge MI score from any variant below. The geometric mean ensures a 10-hop path with consistently high-MI edges scores equally to a 2-hop path with the same average MI.

---

### MI Variants

Seven MI variants serve as per-edge estimators within PARSE. All build on Jaccard neighbourhood overlap, then weight by domain-specific structural properties.

---

#### Jaccard (baseline)

$$I_{\text{Jac}}(u, v) = \frac{|N(u) \cap N(v)|}{|N(u) \cup N(v)|}$$

Standard neighbourhood overlap. Default MI estimator.

---

#### Adamic-Adar

$$I_{\text{AA}}(u, v) = \sum_{w \in N(u) \cap N(v)} \frac{1}{\log(\deg(w) + 1)}$$

Downweights common neighbours with high degree. Shared hub neighbours are less informative than shared rare neighbours.

---

#### SCALE: Structural Correction via Adjusted Local Estimation

$$I_{\text{SCALE}}(u, v) = \frac{J(N(u), N(v))}{\rho(G)}$$

where $\rho(G) = \frac{2|E|}{|V|(|V|-1)}$ is graph density. Normalises Jaccard by density so that overlap in dense subgraphs is not artificially inflated.

---

#### SKEW: Sparse-weighted Knowledge Emphasis Weighting

$$I_{\text{SKEW}}(u, v) = J(N(u), N(v)) \cdot \log\!\left(\frac{N}{\deg(u) + 1}\right) \cdot \log\!\left(\frac{N}{\deg(v) + 1}\right)$$

where $N = |V|$. IDF-style rarity weighting on both endpoints. Paths through low-degree (rare) nodes score higher; paths through hubs score lower.

---

#### SPAN: Spanning-community Penalty for Adjacent Nodes

$$I_{\text{SPAN}}(u, v) = J(N(u), N(v)) \cdot \bigl(1 - \max(C(u), C(v))\bigr)$$

where $C(v)$ is the local clustering coefficient. Penalises edges within tight clusters; rewards edges bridging communities (structural holes).

---

#### ETCH: Edge Type Contrast Heuristic

$$I_{\text{ETCH}}(u, v) = J(N(u), N(v)) \cdot \log\!\left(\frac{|E|}{\text{count}(\text{edges with type}(u,v))}\right)$$

Weights Jaccard by edge-type rarity. Paths traversing rare edge types receive higher scores. Requires edge-type annotations; falls back to Jaccard when unavailable.

---

#### NOTCH: Node Type Contrast Heuristic

$$I_{\text{NOTCH}}(u, v) = J(N(u), N(v)) \cdot \log\!\left(\frac{|V|}{c(\tau_u)}\right) \cdot \log\!\left(\frac{|V|}{c(\tau_v)}\right)$$

where $c(\tau_u)$ is the count of nodes with the same type as $u$. Weights Jaccard by node-type rarity for both endpoints.

---

### Ranking Baselines

| Measure                     | Formula                                             |
| --------------------------- | --------------------------------------------------- |
| **Katz Index**              | $\sum_{k=1}^{\infty} \beta^k (A^k)_{st}$            |
| **Communicability**         | $(e^A)_{st}$                                        |
| **Resistance Distance**     | $L^{+}_{ss} + L^{+}_{tt} - 2L^{+}_{st}$             |
| **Jaccard Arithmetic Mean** | $\frac{1}{k} \sum J(N(u), N(v))$                    |
| **Degree-Sum**              | $\sum_{v \in P} \deg(v)$                            |
| **Widest Path**             | $\min_{(u,v) \in P} w(u,v)$                         |
| **PageRank**                | Stationary distribution of random walk with damping |
| **Betweenness**             | Fraction of shortest paths through node             |
| **Random**                  | Uniform random score (null baseline)                |

### Seed Selection: GRASP

**Graph-agnostic Representative seed pAir Sampling**: selects structurally representative seed pairs from an unknown graph using reservoir sampling and structural feature clustering. Operates blind: no full graph loading, no ground-truth labels, no human-defined strata.

Three phases:

1. **Reservoir sampling**: stream graph edges; maintain a reservoir of $N$ nodes
2. **Structural features**: for each sampled node compute $\log(\deg + 1)$, clustering coefficient, approximate PageRank
3. **Cluster and sample**: MiniBatchKMeans into $K$ groups; sample within-cluster and cross-cluster pairs

## Module Exports

```typescript
import { ... } from 'graphwise';           // Everything
import { ... } from 'graphwise/graph';      // Graph data structures
import { ... } from 'graphwise/expansion';  // Expansion algorithms
import { ... } from 'graphwise/ranking';    // PARSE + baselines
import { ... } from 'graphwise/ranking/mi'; // MI variants
import { ... } from 'graphwise/seeds';      // Seed selection
import { ... } from 'graphwise/traversal';  // Graph traversal
import { ... } from 'graphwise/structures'; // Data structures
import { ... } from 'graphwise/extraction'; // Subgraph extraction
import { ... } from 'graphwise/utils';      // Utilities
import { ... } from 'graphwise/gpu';        // WebGPU acceleration
import { ... } from 'graphwise/schemas';    // Zod schemas
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
