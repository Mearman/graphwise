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
- **Async support**: Generator coroutine protocol, sync/async runners, all algorithms available as `*Async` variants

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

**Boundary-free Adaptive Seeded Expansion** (BASE) discovers the neighbourhood around seed nodes without any configuration. You provide seeds and a priority function; BASE expands outward, visiting the most interesting nodes first and recording paths when search frontiers from different seeds collide. It stops naturally when there is nothing left to explore — no depth limits, no size thresholds, no parameters to tune.

$$G_S = (V_S, E_S) \quad \text{where} \quad V_S = \bigcup_{v \in S} \text{Expand}(v, \pi)$$

Three key properties:

1. **Priority-ordered exploration**: the vertex with globally minimum priority $\pi(v)$ is expanded next across all frontiers
2. **Frontier collision detection**: when a vertex is reached by multiple frontiers, the connecting path is recorded
3. **Implicit termination**: halts when all frontier queues are empty; no depth bound or size threshold

---

#### DOME: Degree-Ordered Multi-seed Expansion

Explores low-connectivity nodes before hubs. In a social network, DOME visits niche specialists before reaching the well-connected influencers, discovering the quiet corners of the graph before the busy crossroads.

$$\pi(v) = \frac{\deg^{+}(v) + \deg^{-}(v)}{w_V(v) + \varepsilon}$$

where $\deg^{+}(v)$ is weighted out-degree, $\deg^{-}(v)$ is weighted in-degree, $w_V(v)$ is node weight, and $\varepsilon > 0$ prevents division by zero.

---

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

---

#### EDGE: Entropy-Driven Graph Expansion

Finds nodes that sit at the boundary between different kinds of things. If a person's friends include scientists, artists, and engineers (high type diversity), EDGE visits them early — they are likely bridges between communities.

$$\pi_{\text{EDGE}}(v) = \frac{1}{H_{\text{local}}(v) + \varepsilon} \times \log(\deg(v) + 1)$$

where $H_{\text{local}}(v) = -\sum_{\tau} p(\tau) \log p(\tau)$ is the Shannon entropy of the neighbour type distribution.

---

#### PIPE: Path-potential Informed Priority Expansion

Rushes towards nodes that are about to connect two search frontiers. When expanding from multiple seeds, PIPE detects that a node's neighbours have already been reached by another seed's frontier — meaning a connecting path is one step away.

$$\pi_{\text{PIPE}}(v) = \frac{\deg(v)}{1 + \mathrm{pathPotential}(v)}$$

where $\mathrm{pathPotential}(v) = \lvert N(v) \cap \bigcup_{j \neq i} V_j \rvert$ counts neighbours already visited by other seed frontiers.

---

#### SAGE: Salience-Accumulation Guided Expansion

Learns from its own discoveries. Phase 1 explores by degree (like DOME). Once the first path is found, SAGE switches to Phase 2: nodes that appear in many discovered paths get top priority, guiding expansion towards structurally rich regions.

$$
\pi_{\text{SAGE}}(v) = \begin{cases} \log(\deg(v) + 1) & \text{Phase 1 (before first path)} \\ -(\text{salience}(v) \times 1000 - \deg(v)) & \text{Phase 2 (after first path)} \end{cases}
$$

where $\text{salience}(v)$ counts discovered paths containing $v$.

---

#### REACH: Retrospective Expansion with Adaptive Convergence

Uses the quality of already-discovered paths to steer future exploration. Phase 1 explores by degree. Once paths are found, REACH asks "which unexplored nodes look structurally similar to the endpoints of my best paths?" and prioritises those — seeking more of what already worked.

$$
\pi_{\text{REACH}}(v) = \begin{cases} \log(\deg(v) + 1) & \text{Phase 1} \\ \log(\deg(v) + 1) \times (1 - \widehat{\text{MI}}(v)) & \text{Phase 2} \end{cases}
$$

where $\widehat{\text{MI}}(v) = \frac{1}{\lvert \mathcal{P}\_{\text{top}} \rvert} \sum\_{p} J(N(v), N(p\_{\text{endpoint}}))$ estimates MI via Jaccard similarity to discovered path endpoints.

---

#### MAZE: Multi-frontier Adaptive Zone Expansion

Combines the best of PIPE and SAGE across three phases. First, it races to find initial paths using path potential (like PIPE). Then it refines exploration using salience feedback (like SAGE). Finally, it decides when to stop based on whether it's still discovering diverse, high-quality paths.

$$
\pi^{(1)}(v) = \frac{\deg(v)}{1 + \mathrm{pathPotential}(v)} \qquad \pi^{(2)}(v) = \pi^{(1)}(v) \times \frac{1}{1 + \lambda \cdot \text{salience}(v)}
$$

Phase 1 uses path potential until $M$ paths found. Phase 2 adds salience feedback. Phase 3 evaluates diversity, path count, and salience plateau for termination.

---

#### TIDE: Total Interconnected Degree Expansion

Avoids dense clusters by looking at total neighbourhood connectivity. A node surrounded by other well-connected nodes gets deferred; a node in a quiet corner of the graph gets explored first.

$$\pi_{\text{TIDE}}(v) = \deg(v) + \sum_{w \in N(v)} \deg(w)$$

Related to EDGE but uses raw degree sums rather than entropy.

---

#### LACE: Local Affinity-Computed Expansion

Explores towards nodes that are most similar to what the frontier has already seen. If a candidate node shares many neighbours with the explored region, it gets priority — building outward from a coherent core.

$$\pi_{\text{LACE}}(v) = 1 - \overline{\text{MI}}(v, \text{frontier})$$

Related to HAE but uses MI to visited nodes rather than type entropy.

---

#### WARP: Weighted Adjacent Reachability Priority

Aggressively prioritises nodes that look like they will connect two search frontiers, regardless of their degree. If a node's neighbours have been visited by another seed's search, it gets top priority.

$$\pi_{\text{WARP}}(v) = \frac{1}{1 + \text{bridge}(v)}$$

Related to PIPE but omits the degree numerator, making it more aggressive at prioritising bridge nodes.

---

#### FUSE: Fused Utility-Salience Expansion

Balances two signals simultaneously: how connected a node is (degree) and how strongly it relates to the explored region (MI). The weight $w$ controls the trade-off — at $w=0$ it behaves like DOME, at $w=1$ it behaves like LACE.

$$\pi_{\text{FUSE}}(v) = (1 - w) \cdot \deg(v) + w \cdot (1 - \overline{\text{MI}})$$

Related to SAGE but uses continuous blending rather than two-phase transition.

---

#### SIFT: Salience-Informed Frontier Threshold

Acts as a gate: nodes with MI above a threshold get MI-based priority (explore the promising ones); nodes below the threshold get deferred with a large degree-based penalty (ignore the unpromising ones). A binary version of REACH's continuous approach.

$$
\pi_{\text{SIFT}}(v) = \begin{cases} 1 - \overline{\text{MI}} & \text{if } \overline{\text{MI}} \geq \tau \\ \deg(v) + 100 & \text{otherwise} \end{cases}
$$

Related to REACH but uses a hard threshold instead of continuous MI-weighted priority.

---

#### FLUX: Flexible Local Utility Crossover

Adapts its strategy to the local topology of each node. In dense regions it uses low-degree-first exploration (like EDGE); near frontier boundaries it uses bridge detection (like PIPE); in sparse regions it falls back to degree ordering (like DOME). Different parts of the graph are explored with different strategies simultaneously.

Related to MAZE but adapts spatially (per-node) rather than temporally (per-phase).

---

#### Expansion Baselines

| Algorithm             | Priority Function              | Description                                |
| --------------------- | ------------------------------ | ------------------------------------------ |
| **BFS**               | Discovery order (FIFO)         | Standard breadth-first search              |
| **DFS**               | Negative iteration (LIFO)      | Depth-first exploration                    |
| **Frontier-Balanced** | Round-robin across frontiers   | Fair inter-frontier distribution           |
| **Random Priority**   | Seeded hash (FNV-1a)           | Null hypothesis baseline                   |
| **k-Hop**             | BFS with depth limit $k$       | Fixed-depth ego-network extraction         |
| **Random Walk**       | Stochastic neighbour selection | Random walk with restart ($\alpha = 0.15$) |

---

### Path Ranking: PARSE

**Path Aggregation Ranked by Salience Estimation** (PARSE) ranks discovered paths by asking "how consistently strong is every edge along this path?" It uses the geometric mean of per-edge MI scores, which means one weak link drags down the entire path — unlike arithmetic mean where a strong edge can compensate for a weak one. A 10-hop path with consistently good edges scores the same as a 2-hop path with equally good edges.

$$M(P) = \exp\left( \frac{1}{k} \sum_{i=1}^{k} \log I(u_i, v_i) \right)$$

where $k$ is path length (number of edges) and $I(u_i, v_i)$ is the per-edge MI score from any variant below.

---

### MI Variants

MI variants answer the question "how strongly are two connected nodes related?" Each measures the overlap between their neighbourhoods, then optionally weights by structural properties like density, degree rarity, clustering, or entity type. PARSE uses these as per-edge scores in its geometric mean.

---

#### Jaccard (baseline)

What fraction of combined neighbours do two nodes share? If Alice and Bob know 3 of the same people out of 10 total acquaintances between them, their Jaccard score is 0.3.

$$I_{\text{Jac}}(u, v) = \frac{|N(u) \cap N(v)|}{|N(u) \cup N(v)|}$$

---

#### Adamic-Adar

Counts shared neighbours, but recognises that sharing a rare connection is more meaningful than sharing a popular one. If two researchers both cite a niche paper, that says more about their relationship than both citing a famous textbook.

$$I_{\text{AA}}(u, v) = \sum_{w \in N(u) \cap N(v)} \frac{1}{\log(\deg(w) + 1)}$$

---

#### SCALE: Structural Correction via Adjusted Local Estimation

Adjusts for graph density. In a dense network where everyone knows everyone, sharing neighbours is expected and less meaningful. In a sparse network, the same overlap is rare and significant. SCALE divides Jaccard by density to make scores comparable across differently-dense regions.

$$I_{\text{SCALE}}(u, v) = \frac{J(N(u), N(v))}{\rho(G)}$$

where $\rho(G) = \frac{2|E|}{|V|(|V|-1)}$ is graph density.

---

#### SKEW: Sparse-weighted Knowledge Emphasis Weighting

Rewards edges between rare (low-degree) nodes and penalises edges involving hubs. Like TF-IDF in search engines: a connection between two niche nodes is more informative than a connection between two mega-hubs that connect to everything.

$$I_{\text{SKEW}}(u, v) = J(N(u), N(v)) \cdot \log\!\left(\frac{N}{\deg(u) + 1}\right) \cdot \log\!\left(\frac{N}{\deg(v) + 1}\right)$$

where $N = |V|$.

---

#### SPAN: Spanning-community Penalty for Adjacent Nodes

Rewards edges that bridge separate communities and penalises edges within tight-knit groups. If both endpoints sit in dense clusters where everyone knows everyone (high clustering coefficient), the edge is probably redundant. If at least one endpoint is a bridge between groups, the edge is structurally interesting.

$$I_{\text{SPAN}}(u, v) = J(N(u), N(v)) \cdot \bigl(1 - \max(C(u), C(v))\bigr)$$

where $C(v)$ is the local clustering coefficient.

---

#### ETCH: Edge Type Contrast Heuristic

Boosts edges of rare types. If a graph has 1000 "knows" edges but only 5 "mentors" edges, a mentoring relationship is worth more than an acquaintanceship. ETCH multiplies Jaccard by the log-rarity of the edge type.

$$I_{\text{ETCH}}(u, v) = J(N(u), N(v)) \cdot \log\!\left(\frac{|E|}{\text{count}(\text{edges with type}(u,v))}\right)$$

Requires edge-type annotations; falls back to Jaccard when unavailable.

---

#### NOTCH: Node Type Contrast Heuristic

Boosts edges connecting rare node types. In a graph with 500 people but only 10 organisations, an edge involving an organisation is more distinctive. NOTCH multiplies Jaccard by the log-rarity of both endpoint types.

$$I_{\text{NOTCH}}(u, v) = J(N(u), N(v)) \cdot \log\!\left(\frac{|V|}{c(\tau_u)}\right) \cdot \log\!\left(\frac{|V|}{c(\tau_v)}\right)$$

where $c(\tau_u)$ is the count of nodes with the same type as $u$.

---

#### MI Baselines

| Measure                 | Formula                                                                                          | Description                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Cosine Similarity**   | $\frac{\lvert N(u) \cap N(v) \rvert}{\sqrt{\lvert N(u) \rvert} \cdot \sqrt{\lvert N(v) \rvert}}$ | Neighbourhood vector cosine; more tolerant of degree asymmetry than Jaccard          |
| **Sorensen-Dice**       | $\frac{2 \lvert N(u) \cap N(v) \rvert}{\lvert N(u) \rvert + \lvert N(v) \rvert}$                 | Harmonic mean variant of Jaccard; equivalent to F1-score                             |
| **Resource Allocation** | $\sum_{w \in N(u) \cap N(v)} \frac{1}{\deg(w)}$                                                  | Like Adamic-Adar but without the log; penalises hubs more aggressively               |
| **Overlap Coefficient** | $\frac{\lvert N(u) \cap N(v) \rvert}{\min(\lvert N(u) \rvert, \lvert N(v) \rvert)}$              | Fraction of smaller neighbourhood that is shared; less sensitive to degree asymmetry |
| **Hub Promoted**        | $\frac{\lvert N(u) \cap N(v) \rvert}{\min(\deg(u), \deg(v))}$                                    | Promotes hub connections; edges involving high-degree nodes score higher             |

---

### Ranking Baselines

| Measure                     | Formula                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------- |
| **Katz Index**              | $\sum_{k=1}^{\infty} \beta^k (A^k)_{st}$                                               |
| **Communicability**         | $(e^A)_{st}$                                                                           |
| **Resistance Distance**     | $L^{+}\_{ss} + L^{+}\_{tt} - 2L^{+}\_{st}$                                             |
| **Jaccard Arithmetic Mean** | $\frac{1}{k} \sum J(N(u), N(v))$                                                       |
| **Degree-Sum**              | $\sum_{v \in P} \deg(v)$                                                               |
| **Widest Path**             | $\min_{(u,v) \in P} w(u,v)$                                                            |
| **PageRank**                | Stationary distribution of random walk with damping                                    |
| **Betweenness**             | Fraction of shortest paths through node                                                |
| **Hitting Time**            | $H(s,t) = \left((I - Q)^{-1} \mathbf{1}\right)_s$ (exact) or Monte Carlo approximation |
| **Shortest Path**           | Hop count on unweighted graphs                                                         |
| **Random**                  | Uniform random score (null baseline)                                                   |

---

---

### Seed Selection: GRASP

**Graph-agnostic Representative seed pAir Sampling** picks starting points for expansion algorithms. Given a graph you have never seen before, GRASP streams through its edges, samples a representative set of nodes, clusters them by structural role (hubs, bridges, peripherals), and returns seed pairs that cover the full range of structural diversity — without loading the entire graph into memory.

Three phases:

1. **Reservoir sampling**: stream graph edges; maintain a reservoir of $N$ nodes
2. **Structural features**: for each sampled node compute $\log(\deg + 1)$, clustering coefficient, approximate PageRank
3. **Cluster and sample**: MiniBatchKMeans into $K$ groups; sample within-cluster and cross-cluster pairs

---

---

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
import { ... } from 'graphwise/async';      // Async runners & protocol
```

### Async Usage

All algorithms are available as `*Async` variants for use with remote or lazy graph data sources:

```typescript
import { domeAsync, parseAsync, jaccardAsync } from "graphwise";
import type { AsyncReadableGraph } from "graphwise/graph";

// Your async graph implementation
const remoteGraph: AsyncReadableGraph = createRemoteGraph();

const result = await domeAsync(remoteGraph, seeds, {
    signal: controller.signal,
    onProgress: (stats) => console.log(stats),
});

const ranked = await parseAsync(remoteGraph, result.paths, {
    mi: jaccardAsync,
});
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
