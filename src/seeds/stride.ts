/**
 * STRIDE — Shortest-TRIangle Diversity seed selection.
 *
 * Selects diverse seed pairs using local triad (closed 3-cycle) counting.
 * Nodes are categorised by triad density: core (high), periphery (low),
 * bridge (medium). Pairs spanning different categories capture structural
 * diversity.
 *
 * Blind: uses only local neighbourhood queries (O(d²) per node).
 * No global statistics, no type metadata, no ground truth required.
 *
 * @packageDocumentation
 */

import type { ReadableGraph, NodeId } from "../graph";
import type { Seed } from "../schemas/index";

/**
 * Configuration options for STRIDE seed selection.
 */
export interface StrideOptions {
	/** Number of seed pairs to select (default: 100) */
	readonly nPairs?: number;
	/** Random seed for reproducibility (default: 42) */
	readonly rngSeed?: number;
	/** Jaccard diversity threshold for greedy selection (default: 0.5) */
	readonly diversityThreshold?: number;
}

/**
 * A seed pair selected by STRIDE with triad metadata.
 */
export interface StrideSeedPair {
	/** Source seed */
	readonly source: Seed;
	/** Target seed */
	readonly target: Seed;
	/** Triad count of source node */
	readonly sourceTriads: number;
	/** Triad count of target node */
	readonly targetTriads: number;
	/** Category of source: "core" | "bridge" | "periphery" */
	readonly sourceCategory: string;
	/** Category of target: "core" | "bridge" | "periphery" */
	readonly targetCategory: string;
}

/**
 * Result of STRIDE seed selection.
 */
export interface StrideResult {
	/** Selected seed pairs */
	readonly pairs: readonly StrideSeedPair[];
	/** Triad counts for all nodes */
	readonly triadCounts: ReadonlyMap<string, number>;
	/** Category assignments */
	readonly categories: ReadonlyMap<string, string>;
}

/** Default configuration values */
const DEFAULTS = {
	nPairs: 100,
	rngSeed: 42,
	diversityThreshold: 0.5,
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
 * Count closed triads (3-cycles) involving a node.
 *
 * A triad is a triple (node, u, v) where u and v are both neighbours
 * of node AND u-v is an edge.
 */
function countTriads(graph: ReadableGraph, node: NodeId): number {
	const neighbours = [...graph.neighbours(node)];
	if (neighbours.length < 2) return 0;

	const neighbourSet = new Set(neighbours);
	let count = 0;

	for (let i = 0; i < neighbours.length; i++) {
		for (let j = i + 1; j < neighbours.length; j++) {
			const u = neighbours[i];
			const v = neighbours[j];
			if (u !== undefined && v !== undefined) {
				const uNeighbours = new Set(graph.neighbours(u));
				if (uNeighbours.has(v) && neighbourSet.has(v)) {
					count++;
				}
			}
		}
	}

	return count;
}

/**
 * Classify a node by triad count into core/bridge/periphery.
 */
function triadCategory(triadCount: number, p33: number, p66: number): string {
	if (triadCount <= p33) return "periphery";
	if (triadCount <= p66) return "bridge";
	return "core";
}

/**
 * Compute Jaccard similarity between two sets.
 */
function jaccard<T>(a: Set<T>, b: Set<T>): number {
	const intersection = [...a].filter((x) => b.has(x)).length;
	const union = new Set([...a, ...b]).size;
	return union === 0 ? 0 : intersection / union;
}

/**
 * STRIDE — Shortest-TRIangle Diversity seed selection.
 *
 * Nodes are categorised by local triad count into core, bridge, and
 * periphery. Pairs spanning different categories capture structural
 * diversity: core-periphery pairs traverse community interiors to
 * boundaries, bridge-bridge pairs span community gaps.
 *
 * @param graph - The graph to sample seeds from
 * @param options - Configuration options
 * @returns Selected seed pairs with triad metadata
 */
export function stride(
	graph: ReadableGraph,
	options: StrideOptions = {},
): StrideResult {
	const config = { ...DEFAULTS, ...options };
	const rng = createRNG(config.rngSeed);

	const allNodes = [...graph.nodeIds()];

	if (allNodes.length < 2) {
		return { pairs: [], triadCounts: new Map(), categories: new Map() };
	}

	// Phase 1: Compute triad counts
	const triadCounts = new Map<NodeId, number>();
	for (const node of allNodes) {
		triadCounts.set(node, countTriads(graph, node));
	}

	// Phase 2: Compute tercile thresholds
	const countsSorted = [...triadCounts.values()].sort((a, b) => a - b);
	const n = countsSorted.length;
	const p33 = countsSorted[Math.floor(n / 3)] ?? 0;
	const p66 = countsSorted[Math.floor((2 * n) / 3)] ?? 0;

	// Phase 3: Categorise nodes
	const categories = new Map<NodeId, string>();
	const categoryGroups = new Map<string, NodeId[]>();

	for (const [node, tc] of triadCounts) {
		const cat = triadCategory(tc, p33, p66);
		categories.set(node, cat);
		let group = categoryGroups.get(cat);
		if (group === undefined) {
			group = [];
			categoryGroups.set(cat, group);
		}
		group.push(node);
	}

	// Phase 4: Generate cross-category candidate pairs
	const catNames = ["core", "bridge", "periphery"] as const;
	const candidates: { score: number; a: NodeId; b: NodeId }[] = [];

	for (const catA of catNames) {
		for (const catB of catNames) {
			const groupA = categoryGroups.get(catA);
			const groupB = categoryGroups.get(catB);
			if (groupA === undefined || groupB === undefined) continue;
			const aLen = groupA.length;
			const bLen = groupB.length;
			if (aLen === 0 || bLen === 0) continue;

			const crossBonus = catA === catB ? 0 : 1;
			const sampleSize = Math.max(config.nPairs * 3, 30);

			for (let s = 0; s < sampleSize; s++) {
				const a = groupA[Math.floor(rng() * groupA.length)];
				const b =
					catA === catB
						? groupA[Math.floor(rng() * groupA.length)]
						: groupB[Math.floor(rng() * groupB.length)];

				if (a === undefined || b === undefined || a === b) continue;

				const tcA = triadCounts.get(a) ?? 0;
				const tcB = triadCounts.get(b) ?? 0;
				const contrast = Math.abs(tcA - tcB);
				const score = contrast + crossBonus * Math.max(tcA, tcB, 1);

				candidates.push({ score, a, b });
			}
		}
	}

	candidates.sort((x, y) => y.score - x.score);

	// Phase 5: Greedy selection with Jaccard diversity
	const selected: StrideSeedPair[] = [];
	const selectedPairKeys = new Set<string>();

	for (const candidate of candidates) {
		const { a, b } = candidate;
		if (selected.length >= config.nPairs) break;

		const pairKey = a < b ? `${a}|${b}` : `${b}|${a}`;
		if (selectedPairKeys.has(pairKey)) continue;

		const aNbrs = new Set(graph.neighbours(a));
		const bNbrs = new Set(graph.neighbours(b));

		let isDiverse = true;
		for (const prev of selected) {
			const paNbrs = new Set(graph.neighbours(prev.source.id));
			if (jaccard(aNbrs, paNbrs) >= config.diversityThreshold) {
				const pbNbrs = new Set(graph.neighbours(prev.target.id));
				if (jaccard(bNbrs, pbNbrs) >= config.diversityThreshold) {
					isDiverse = false;
					break;
				}
			}
		}

		if (!isDiverse) continue;

		selectedPairKeys.add(pairKey);
		selected.push({
			source: { id: a },
			target: { id: b },
			sourceTriads: triadCounts.get(a) ?? 0,
			targetTriads: triadCounts.get(b) ?? 0,
			sourceCategory: categories.get(a) ?? "periphery",
			targetCategory: categories.get(b) ?? "periphery",
		});
	}

	// Fill shortfall with random pairs
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
			sourceTriads: triadCounts.get(a) ?? 0,
			targetTriads: triadCounts.get(b) ?? 0,
			sourceCategory: categories.get(a) ?? "periphery",
			targetCategory: categories.get(b) ?? "periphery",
		});
	}

	return {
		pairs: selected.slice(0, config.nPairs),
		triadCounts,
		categories,
	};
}
