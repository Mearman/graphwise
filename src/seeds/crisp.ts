/**
 * CRISP — Connectivity-Rich Informed Seed Pairing.
 *
 * Selects diverse seed pairs with high path potential using:
 *   - BFS distance filtering (target 2–4 hops)
 *   - Common neighbour scoring (prefer pairs with shared neighbourhood)
 *   - Jaccard diversity (avoid redundant pairs)
 *
 * Originally implemented in Python experiments, now a first-class
 * seed selection method in graphwise.
 *
 * Time Complexity: O(nPairs * sampleSize * (V + E)) for BFS per candidate
 * Space Complexity: O(V) per BFS
 *
 * @packageDocumentation
 */

import type { ReadableGraph, NodeId } from "../graph";
import type { Seed } from "../schemas/index";

/**
 * Configuration options for CRISP seed selection.
 */
export interface CrispOptions {
	/** Number of seed pairs to select (default: 100) */
	readonly nPairs?: number;
	/** Random seed for reproducibility (default: 42) */
	readonly rngSeed?: number;
	/** Minimum BFS distance to consider (default: 2) */
	readonly minDistance?: number;
	/** Maximum BFS distance to consider (default: 4) */
	readonly maxDistance?: number;
	/** Minimum common neighbours required (default: 2) */
	readonly minCommonNeighbours?: number;
	/** Jaccard diversity threshold for greedy selection (default: 0.5) */
	readonly diversityThreshold?: number;
	/** Number of candidate pairs to sample before greedy selection (default: 5000) */
	readonly sampleSize?: number;
}

/**
 * A seed pair selected by CRISP with connectivity metadata.
 */
export interface CrispSeedPair {
	/** Source seed */
	readonly source: Seed;
	/** Target seed */
	readonly target: Seed;
	/** BFS distance between source and target */
	readonly distance: number;
	/** Common neighbour count */
	readonly commonNeighbours: number;
	/** Connectivity score */
	readonly score: number;
}

/**
 * Result of CRISP seed selection.
 */
export interface CrispResult {
	/** Selected seed pairs */
	readonly pairs: readonly CrispSeedPair[];
}

/** Default configuration values */
const DEFAULTS = {
	nPairs: 100,
	rngSeed: 42,
	minDistance: 2,
	maxDistance: 4,
	minCommonNeighbours: 2,
	diversityThreshold: 0.5,
	sampleSize: 5000,
} as const;

/**
 * Simple seeded pseudo-random number generator using mulberry32.
 */
function createRNG(seed: number): () => number {
	let state = seed >>> 0;
	return (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = Math.imul(state ^ (state >>> 15), state | 1);
		t = (t ^ (t >>> 7)) * (t | 0x61c88647);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Compute shortest-path distance between two nodes via BFS.
 * Returns -1 if no path exists.
 */
function bfsDistance(
	graph: ReadableGraph,
	source: NodeId,
	target: NodeId,
): number {
	if (source === target) return 0;

	const visited = new Set<NodeId>([source]);
	const queue: { node: NodeId; dist: number }[] = [{ node: source, dist: 0 }];

	while (queue.length > 0) {
		const item = queue.shift();
		if (!item) break;
		const { node, dist } = item;

		for (const neighbour of graph.neighbours(node)) {
			if (neighbour === target) return dist + 1;
			if (!visited.has(neighbour)) {
				visited.add(neighbour);
				queue.push({ node: neighbour, dist: dist + 1 });
			}
		}
	}

	return -1;
}

/**
 * Get the 1-hop neighbour set of a node.
 */
function neighbourSet(graph: ReadableGraph, node: NodeId): Set<NodeId> {
	return new Set(graph.neighbours(node));
}

/**
 * Count common neighbours between two nodes.
 */
function commonNeighbours(graph: ReadableGraph, a: NodeId, b: NodeId): number {
	const na = neighbourSet(graph, a);
	const nb = neighbourSet(graph, b);
	let count = 0;
	for (const n of na) {
		if (nb.has(n)) count++;
	}
	return count;
}

/**
 * Compute Jaccard similarity between two sets.
 */
function jaccard<T>(a: Set<T>, b: Set<T>): number {
	let intersection = 0;
	for (const x of a) {
		if (b.has(x)) intersection++;
	}
	const union = new Set([...a, ...b]).size;
	return union === 0 ? 0 : intersection / union;
}

/**
 * Compute distance score peaking at distance 3.
 * Score ranges from 0 to 1, with maximum at dist=3.
 */
function distanceScore(dist: number): number {
	return 1.0 - Math.abs(dist - 3.0) / 3.0;
}

/**
 * CRISP — Connectivity-Rich Informed Seed Pairing.
 *
 * Samples random node pairs and scores them by common neighbour count
 * and BFS distance (preferring 2–4 hops, peaking at 3). Greedy
 * selection with Jaccard diversity ensures selected pairs are
 * spread across different structural regions.
 *
 * @param graph - The graph to sample seeds from
 * @param options - Configuration options
 * @returns Selected seed pairs with connectivity metadata
 */
export function crisp(
	graph: ReadableGraph,
	options: CrispOptions = {},
): CrispResult {
	const config = { ...DEFAULTS, ...options };
	const rng = createRNG(config.rngSeed);

	const allNodes = [...graph.nodeIds()];

	if (allNodes.length < 2) {
		return { pairs: [] };
	}

	if (allNodes.length < 4) {
		const a = allNodes[0];
		const b = allNodes[1];
		if (a !== undefined && b !== undefined) {
			return {
				pairs: [
					{
						source: { id: a },
						target: { id: b },
						distance: 1,
						commonNeighbours: 0,
						score: 0,
					},
				],
			};
		}
		return { pairs: [] };
	}

	// Phase 1: Sample and score candidate pairs
	const candidates: {
		score: number;
		distance: number;
		commonNeighbours: number;
		a: NodeId;
		b: NodeId;
	}[] = [];
	const sampledPairs = new Set<string>();

	const maxAttempts = config.sampleSize * 10;
	let attempts = 0;

	while (sampledPairs.size < config.sampleSize && attempts < maxAttempts) {
		attempts++;
		const a = allNodes[Math.floor(rng() * allNodes.length)];
		const b = allNodes[Math.floor(rng() * allNodes.length)];
		if (a === undefined || b === undefined || a === b) continue;

		const pairKey = a < b ? `${a}|${b}` : `${b}|${a}`;
		if (sampledPairs.has(pairKey)) continue;
		sampledPairs.add(pairKey);

		const dist = bfsDistance(graph, a, b);
		if (dist < config.minDistance || dist > config.maxDistance) continue;

		const cn = commonNeighbours(graph, a, b);
		if (cn < config.minCommonNeighbours) continue;

		// Score: prefer higher common neighbours and mid-range distance
		const distScore = distanceScore(dist);
		const score = cn * (1.0 + distScore);
		candidates.push({ score, distance: dist, commonNeighbours: cn, a, b });
	}

	// Phase 1.5: Relax constraints if not enough candidates
	if (candidates.length < config.nPairs) {
		for (const pairKey of sampledPairs) {
			const parts = pairKey.split("|");
			if (parts.length !== 2) continue;
			const a = parts[0];
			const b = parts[1];
			if (a === undefined || b === undefined) continue;
			const dist = bfsDistance(graph, a, b);
			if (dist < 1 || dist > 6) continue;

			const cn = commonNeighbours(graph, a, b);
			const score = cn + 0.1;
			candidates.push({ score, distance: dist, commonNeighbours: cn, a, b });
		}
	}

	// Sort by score descending
	candidates.sort((x, y) => y.score - x.score);

	// Phase 2: Greedy selection with Jaccard diversity
	const selected: CrispSeedPair[] = [];
	const selectedPairKeys = new Set<string>();

	for (const { score, distance, commonNeighbours, a, b } of candidates) {
		if (selected.length >= config.nPairs) break;

		const pairKey = a < b ? `${a}|${b}` : `${b}|${a}`;
		if (selectedPairKeys.has(pairKey)) continue;

		const aNbrs = neighbourSet(graph, a);
		const bNbrs = neighbourSet(graph, b);

		let isDiverse = true;
		for (const prev of selected) {
			const paNbrs = neighbourSet(graph, prev.source.id);
			const pbNbrs = neighbourSet(graph, prev.target.id);

			if (
				jaccard(aNbrs, paNbrs) >= config.diversityThreshold &&
				jaccard(bNbrs, pbNbrs) >= config.diversityThreshold
			) {
				isDiverse = false;
				break;
			}
		}

		if (!isDiverse) continue;

		selectedPairKeys.add(pairKey);
		selected.push({
			source: { id: a },
			target: { id: b },
			distance,
			commonNeighbours,
			score,
		});
	}

	// Phase 3: Fill shortfall with random pairs
	let fillAttempts = 0;
	while (
		selected.length < config.nPairs &&
		allNodes.length >= 2 &&
		fillAttempts < config.nPairs * 20
	) {
		fillAttempts++;
		const i1 = Math.floor(rng() * allNodes.length);
		const i2 = Math.floor(rng() * allNodes.length);
		const a = allNodes[i1];
		const b = allNodes[i2];
		if (a === undefined || b === undefined || a === b) continue;

		const pairKey = a < b ? `${a}|${b}` : `${b}|${a}`;
		if (selectedPairKeys.has(pairKey)) continue;

		selectedPairKeys.add(pairKey);
		selected.push({
			source: { id: a },
			target: { id: b },
			distance: 0,
			commonNeighbours: 0,
			score: 0,
		});
	}

	return { pairs: selected.slice(0, config.nPairs) };
}
