import { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";

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

/**
 * Generate a random connected graph with specified node count and seed
 *
 * @param nodeCount - Number of nodes (5-100)
 * @param seed - Random seed for reproducibility
 * @param edgeDensity - Probability of additional edges (0-1)
 */
export function generateRandomGraph(
	nodeCount: number,
	seed: number,
	edgeDensity = 0.3,
): GeneratedGraph {
	// Clamp parameters
	const clampedNodeCount = Math.max(5, Math.min(100, nodeCount));
	const clampedDensity = Math.max(0, Math.min(1, edgeDensity));

	const graph = AdjacencyMapGraph.undirected();
	const rng = mulberry32(seed);

	// Create nodes with random labels
	const labels = [
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
	];

	const nodes: string[] = [];
	for (let i = 0; i < clampedNodeCount; i++) {
		const labelIndex = Math.floor(rng() * labels.length);
		const label = labels[labelIndex] ?? "Node";
		const nodeId = `${label.toLowerCase()}_${String(i)}`;
		nodes.push(nodeId);
		graph.addNode({
			id: nodeId,
			label: `${label} ${String(i + 1)}`,
			type: "node",
			weight: 1,
		});
	}

	// Create a spanning tree first to ensure connectivity
	// Use shuffled nodes to create a random tree
	const shuffledIndices = [...Array(clampedNodeCount).keys()];
	for (let i = shuffledIndices.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const temp = shuffledIndices[i];
		const temp2 = shuffledIndices[j];
		if (temp !== undefined && temp2 !== undefined) {
			shuffledIndices[i] = temp2;
			shuffledIndices[j] = temp;
		}
	}

	// Add spanning tree edges
	for (let i = 1; i < clampedNodeCount; i++) {
		const sourceIdx = shuffledIndices[i - 1];
		const targetIdx = shuffledIndices[i];
		const source = sourceIdx !== undefined ? nodes[sourceIdx] : undefined;
		const target = targetIdx !== undefined ? nodes[targetIdx] : undefined;
		if (source !== undefined && target !== undefined) {
			graph.addEdge({
				source,
				target,
				type: "connected",
				weight: 1,
			});
		}
	}

	// Add additional random edges based on density
	for (let i = 0; i < clampedNodeCount; i++) {
		for (let j = i + 1; j < clampedNodeCount; j++) {
			if (rng() < clampedDensity) {
				const source = nodes[i];
				const target = nodes[j];
				if (source !== undefined && target !== undefined) {
					// Check if edge already exists
					const existingEdge = graph.getEdge(source, target);
					if (existingEdge === undefined) {
						graph.addEdge({
							source,
							target,
							type: "connected",
							weight: 1,
						});
					}
				}
			}
		}
	}

	// Find two nodes that are far apart for seeds
	const sourceSeed = nodes[0] ?? "node_0";
	const targetSeed = nodes[clampedNodeCount - 1] ?? "node_0";

	return {
		graph,
		seeds: [
			{ id: sourceSeed, role: "source" },
			{ id: targetSeed, role: "target" },
		],
	};
}
