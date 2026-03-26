import { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";
import type { GraphClassConfig } from "./graph-class";

export interface GeneratedGraph {
	readonly graph: AdjacencyMapGraph;
	readonly seeds: readonly Seed[];
}

/**
 * Mulberry32 PRNG - fast, deterministic 32-bit seeded RNG
 * https://gist.github.com/tommyettinger/46a692c3
 */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b9f6d) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
		t ^= (t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const GREEK_LABELS = [
	"Alpha",
	"Beta",
	"Gamma",
	"Delta",
	"Epsilon",
	"Zeta",
	"Eta",
	"Theta",
	"Iota",
	"Kappa",
	"Lambda",
	"Mu",
	"Nu",
	"Xi",
	"Omicron",
	"Pi",
	"Rho",
	"Sigma",
	"Tau",
	"Upsilon",
	"Phi",
	"Chi",
	"Psi",
	"Omega",
] as const;

const NODE_TYPES = ["person", "organisation", "location", "event"] as const;
const EDGE_TYPES = ["knows", "collaborates", "reports_to", "funds"] as const;

/** Fisher-Yates shuffle (in-place, deterministic via provided RNG). */
function shuffle(arr: unknown[], rng: () => number): void {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const tmp = arr[i];
		const tmp2 = arr[j];
		if (tmp !== undefined && tmp2 !== undefined) {
			arr[i] = tmp2;
			arr[j] = tmp;
		}
	}
}

/** Pick a random element from a readonly array. */
function pick(arr: readonly string[], rng: () => number): string {
	const idx = Math.floor(rng() * arr.length);
	return arr[idx] ?? arr[0] ?? "unknown";
}

/**
 * Generate a deterministic graph matching the given class configuration.
 *
 * @param nodeCount - Number of nodes (clamped to 3–100)
 * @param seed - Random seed for reproducibility
 * @param config - Atomic graph class configuration
 * @param edgeDensity - Probability of additional edges beyond the backbone (0–1, default 0.3)
 */
export function generateRandomGraph(
	nodeCount: number,
	seed: number,
	config: GraphClassConfig,
	edgeDensity = 0.3,
): GeneratedGraph {
	const n = Math.max(3, Math.min(100, nodeCount));
	const density = Math.max(0, Math.min(1, edgeDensity));
	const rng = mulberry32(seed);

	// Phase A: Create graph container
	const graph = config.isDirected
		? AdjacencyMapGraph.directed()
		: AdjacencyMapGraph.undirected();

	// Phase B: Create nodes
	const nodeIds: string[] = [];
	for (let i = 0; i < n; i++) {
		const label = pick(GREEK_LABELS, rng);
		const nodeId = `${label.toLowerCase()}_${String(i)}`;
		nodeIds.push(nodeId);

		const nodeType = config.isHeterogeneous ? pick(NODE_TYPES, rng) : "node";
		graph.addNode({
			id: nodeId,
			label: `${label} ${String(i + 1)}`,
			type: nodeType,
			weight: 1,
		});
	}

	// Phase C: Create structural backbone
	if (config.isComplete) {
		addCompleteEdges(graph, nodeIds, config, rng);
	} else if (config.isConnected && !config.isCyclic) {
		addAcyclicConnectedEdges(graph, nodeIds, config, rng);
	} else if (config.isConnected && config.isCyclic) {
		addCyclicConnectedEdges(graph, nodeIds, config, density, rng);
	} else if (!config.isConnected && config.isCyclic) {
		addCyclicDisconnectedEdges(graph, nodeIds, config, density, rng);
	} else {
		// !connected && !cyclic — disconnected forest/DAG
		addAcyclicDisconnectedEdges(graph, nodeIds, config, rng);
	}

	// Phase D: Self-loops
	if (config.hasSelfLoops) {
		addSelfLoops(graph, nodeIds, config, rng);
	}

	// Phase E: Multigraph (phantom intermediate nodes)
	if (config.isMultigraph) {
		addParallelEdges(graph, nodeIds, config, rng);
	}

	// Select seed nodes
	const sourceSeed = nodeIds[0] ?? "node_0";
	const targetSeed = nodeIds[n - 1] ?? "node_0";

	return {
		graph,
		seeds: [
			{ id: sourceSeed, role: "source" },
			{ id: targetSeed, role: "target" },
		],
	};
}

// ---------------------------------------------------------------------------
// Edge creation helpers
// ---------------------------------------------------------------------------

function edgeProps(
	source: string,
	target: string,
	config: GraphClassConfig,
	rng: () => number,
): { source: string; target: string; type: string; weight: number } {
	return {
		source,
		target,
		type: config.isHeterogeneous ? pick(EDGE_TYPES, rng) : "connected",
		weight: config.isWeighted ? Math.floor(rng() * 20) + 1 : 1,
	};
}

/** Complete graph: edge between every distinct pair. */
function addCompleteEdges(
	graph: AdjacencyMapGraph,
	nodeIds: string[],
	config: GraphClassConfig,
	rng: () => number,
): void {
	for (let i = 0; i < nodeIds.length; i++) {
		for (let j = i + 1; j < nodeIds.length; j++) {
			const src = nodeIds[i];
			const tgt = nodeIds[j];
			if (src === undefined || tgt === undefined) continue;
			graph.addEdge(edgeProps(src, tgt, config, rng));
			// For directed: add reverse edge too (complete tournament)
			if (config.isDirected) {
				graph.addEdge(edgeProps(tgt, src, config, rng));
			}
		}
	}
}

/** Connected acyclic: spanning tree (undirected) or DAG tree (directed). */
function addAcyclicConnectedEdges(
	graph: AdjacencyMapGraph,
	nodeIds: string[],
	config: GraphClassConfig,
	rng: () => number,
): void {
	if (config.isDirected) {
		// Random topological ordering — edges go from lower rank to higher rank
		const ranks = [...Array(nodeIds.length).keys()];
		shuffle(ranks, rng);
		// Build a spanning tree following the topological order
		const order = ranks.map((_, idx) => idx);
		order.sort((a, b) => (ranks[a] ?? 0) - (ranks[b] ?? 0));
		for (let i = 1; i < order.length; i++) {
			const parentIdx = order[Math.floor(rng() * i)];
			const childIdx = order[i];
			const parent = parentIdx !== undefined ? nodeIds[parentIdx] : undefined;
			const child = childIdx !== undefined ? nodeIds[childIdx] : undefined;
			if (parent !== undefined && child !== undefined) {
				graph.addEdge(edgeProps(parent, child, config, rng));
			}
		}
	} else {
		// Undirected random spanning tree: each node attaches to a random earlier node
		const indices = [...Array(nodeIds.length).keys()];
		shuffle(indices, rng);
		for (let i = 1; i < indices.length; i++) {
			const parentIdx = indices[Math.floor(rng() * i)];
			const childIdx = indices[i];
			const parent = parentIdx !== undefined ? nodeIds[parentIdx] : undefined;
			const child = childIdx !== undefined ? nodeIds[childIdx] : undefined;
			if (parent !== undefined && child !== undefined) {
				graph.addEdge(edgeProps(parent, child, config, rng));
			}
		}
	}
}

/** Connected cyclic: spanning tree + extra edges to create cycles. */
function addCyclicConnectedEdges(
	graph: AdjacencyMapGraph,
	nodeIds: string[],
	config: GraphClassConfig,
	density: number,
	rng: () => number,
): void {
	// Start with spanning tree for connectivity
	const indices = [...Array(nodeIds.length).keys()];
	shuffle(indices, rng);

	for (let i = 1; i < indices.length; i++) {
		const srcIdx = indices[i - 1];
		const tgtIdx = indices[i];
		const src = srcIdx !== undefined ? nodeIds[srcIdx] : undefined;
		const tgt = tgtIdx !== undefined ? nodeIds[tgtIdx] : undefined;
		if (src !== undefined && tgt !== undefined) {
			graph.addEdge(edgeProps(src, tgt, config, rng));
		}
	}

	// Guarantee at least one cycle: connect last to first in the shuffle order
	const first = indices[0] !== undefined ? nodeIds[indices[0]] : undefined;
	const last =
		indices[indices.length - 1] !== undefined
			? nodeIds[indices[indices.length - 1] ?? 0]
			: undefined;
	if (first !== undefined && last !== undefined) {
		const existing = graph.getEdge(last, first) ?? graph.getEdge(first, last);
		if (existing === undefined) {
			graph.addEdge(edgeProps(last, first, config, rng));
		}
	}

	// Add extra random edges based on density
	addRandomEdges(graph, nodeIds, config, density, rng);
}

/** Disconnected cyclic: partition into components, each with a cycle. */
function addCyclicDisconnectedEdges(
	graph: AdjacencyMapGraph,
	nodeIds: string[],
	config: GraphClassConfig,
	density: number,
	rng: () => number,
): void {
	const components = partitionIntoComponents(nodeIds, rng);
	for (const component of components) {
		if (component.length < 3) {
			// Need at least 3 nodes for a proper cycle; for tiny components add a chain
			for (let i = 1; i < component.length; i++) {
				const src = component[i - 1];
				const tgt = component[i];
				if (src !== undefined && tgt !== undefined) {
					graph.addEdge(edgeProps(src, tgt, config, rng));
				}
			}
			continue;
		}
		// Create a cycle through all nodes in the component
		for (let i = 0; i < component.length; i++) {
			const src = component[i];
			const tgt = component[(i + 1) % component.length];
			if (src !== undefined && tgt !== undefined) {
				graph.addEdge(edgeProps(src, tgt, config, rng));
			}
		}
		// Add extra intra-component edges
		for (let i = 0; i < component.length; i++) {
			for (let j = i + 2; j < component.length; j++) {
				if (rng() < density * 0.5) {
					const src = component[i];
					const tgt = component[j];
					if (src !== undefined && tgt !== undefined) {
						if (graph.getEdge(src, tgt) === undefined) {
							graph.addEdge(edgeProps(src, tgt, config, rng));
						}
					}
				}
			}
		}
	}
}

/** Disconnected acyclic: partition into components, each a tree/DAG. */
function addAcyclicDisconnectedEdges(
	graph: AdjacencyMapGraph,
	nodeIds: string[],
	config: GraphClassConfig,
	rng: () => number,
): void {
	const components = partitionIntoComponents(nodeIds, rng);
	for (const component of components) {
		if (config.isDirected) {
			// DAG within component
			for (let i = 1; i < component.length; i++) {
				const parentIdx = Math.floor(rng() * i);
				const parent = component[parentIdx];
				const child = component[i];
				if (parent !== undefined && child !== undefined) {
					graph.addEdge(edgeProps(parent, child, config, rng));
				}
			}
		} else {
			// Random tree within component: each node attaches to a random earlier node
			for (let i = 1; i < component.length; i++) {
				const parent = component[Math.floor(rng() * i)];
				const child = component[i];
				if (parent !== undefined && child !== undefined) {
					graph.addEdge(edgeProps(parent, child, config, rng));
				}
			}
		}
	}
}

/** Add self-loop edges to ~10% of nodes (minimum 1). */
function addSelfLoops(
	graph: AdjacencyMapGraph,
	nodeIds: string[],
	config: GraphClassConfig,
	rng: () => number,
): void {
	const count = Math.max(1, Math.ceil(nodeIds.length * 0.1));
	const candidates = [...nodeIds];
	shuffle(candidates, rng);
	for (let i = 0; i < count && i < candidates.length; i++) {
		const nodeId = candidates[i];
		if (nodeId !== undefined) {
			graph.addEdge(edgeProps(nodeId, nodeId, config, rng));
		}
	}
}

/**
 * Simulate parallel edges via phantom intermediate nodes.
 *
 * For ~15% of existing edges, insert a relay node creating
 * A → relay → B alongside the original A → B.
 */
function addParallelEdges(
	graph: AdjacencyMapGraph,
	_nodeIds: string[],
	config: GraphClassConfig,
	rng: () => number,
): void {
	const edges = [...graph.edges()];
	shuffle(edges, rng);
	const count = Math.max(1, Math.ceil(edges.length * 0.15));

	for (let i = 0; i < count && i < edges.length; i++) {
		const edge = edges[i];
		if (edge === undefined) continue;

		const relayId = `relay_${String(i)}`;
		graph.addNode({
			id: relayId,
			label: "\u2016",
			type: "relay",
			weight: 0,
		});

		graph.addEdge(edgeProps(edge.source, relayId, config, rng));
		graph.addEdge(edgeProps(relayId, edge.target, config, rng));
	}
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Partition node IDs into 2–4 random components (minimum 3 nodes each where possible). */
function partitionIntoComponents(
	nodeIds: string[],
	rng: () => number,
): string[][] {
	const shuffled = [...nodeIds];
	shuffle(shuffled, rng);

	// Determine number of components: 2–4, but ensure each has at least 3 nodes
	const maxComponents = Math.min(4, Math.floor(shuffled.length / 3));
	const numComponents = Math.max(2, Math.floor(rng() * maxComponents) + 2);
	const clamped = Math.min(numComponents, maxComponents);

	const components: string[][] = Array.from({ length: clamped }, () => []);

	for (let i = 0; i < shuffled.length; i++) {
		const nodeId = shuffled[i];
		if (nodeId !== undefined) {
			const target = components[i % clamped];
			if (target !== undefined) {
				target.push(nodeId);
			}
		}
	}

	return components;
}

/** Add random edges based on density, skipping existing edges. */
function addRandomEdges(
	graph: AdjacencyMapGraph,
	nodeIds: string[],
	config: GraphClassConfig,
	density: number,
	rng: () => number,
): void {
	for (let i = 0; i < nodeIds.length; i++) {
		for (let j = i + 1; j < nodeIds.length; j++) {
			if (rng() < density) {
				const src = nodeIds[i];
				const tgt = nodeIds[j];
				if (src !== undefined && tgt !== undefined) {
					if (graph.getEdge(src, tgt) === undefined) {
						graph.addEdge(edgeProps(src, tgt, config, rng));
					}
				}
			}
		}
	}
}
