/**
 * CREST — Community-Revealing Edge Sampling Technique.
 *
 * Selects seed pairs that reveal community structure by computing
 * neighbour overlap ratios. Edges connecting nodes with few shared
 * neighbours relative to their exclusive neighbours indicate
 * community boundaries. Greedy selection with Jaccard diversity
 * ensures structural spread.
 *
 * Blind: uses only local neighbourhood queries.
 * No global statistics, no type metadata, no ground truth required.
 *
 * @packageDocumentation
 */

import type { ReadableGraph, NodeId } from "../graph";
import type { Seed } from "../schemas/index";

/**
 * Configuration options for CREST seed selection.
 */
export interface CrestOptions {
	/** Number of seed pairs to select (default: 100) */
	readonly nPairs?: number;
	/** Random seed for reproducibility (default: 42) */
	readonly rngSeed?: number;
	/** Jaccard diversity threshold for greedy selection (default: 0.5) */
	readonly diversityThreshold?: number;
	/** Number of candidate pairs to sample before greedy selection (default: 5000) */
	readonly sampleSize?: number;
}

/**
 * A seed pair selected by CREST with bridge score metadata.
 */
export interface CrestSeedPair {
	/** Source seed */
	readonly source: Seed;
	/** Target seed */
	readonly target: Seed;
	/** Bridge score: ratio of exclusive to shared neighbours */
	readonly bridgeScore: number;
}

/**
 * Result of CREST seed selection.
 */
export interface CrestResult {
	/** Selected seed pairs */
	readonly pairs: readonly CrestSeedPair[];
}

/** Default configuration values */
const DEFAULTS = {
	nPairs: 100,
	rngSeed: 42,
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
 * Compute community-bridge score for a pair of nodes.
 *
 * High score = pair connects different communities.
 * Ratio = exclusive_neighbours / shared_neighbours.
 *
 * Nodes with many shared neighbours are in the same dense community.
 * Nodes with few shared neighbours relative to exclusive ones span communities.
 */
function bridgeScore(
	aNbrs: Set<NodeId>,
	bNbrs: Set<NodeId>,
	bId: NodeId,
	aId: NodeId,
): number {
	const shared = [...aNbrs].filter((x) => bNbrs.has(x)).length;
	const exclusiveA = [...aNbrs].filter(
		(x) => !bNbrs.has(x) && x !== bId,
	).length;
	const exclusiveB = [...bNbrs].filter(
		(x) => !aNbrs.has(x) && x !== aId,
	).length;
	const exclusive = exclusiveA + exclusiveB;

	if (shared === 0) return 1.0 / Math.max(exclusive, 1);
	return exclusive / shared;
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
 * CREST — Community-Revealing Edge Sampling Technique.
 *
 * Samples random node pairs and scores them by the ratio of exclusive
 * to shared neighbours. Pairs with high ratios connect different
 * communities (few shared neighbours, many exclusive). Greedy
 * selection with Jaccard diversity ensures selected pairs are
 * spread across different structural regions.
 *
 * @param graph - The graph to sample seeds from
 * @param options - Configuration options
 * @returns Selected seed pairs with bridge score metadata
 */
export function crest(
	graph: ReadableGraph,
	options: CrestOptions = {},
): CrestResult {
	const config = { ...DEFAULTS, ...options };
	const rng = createRNG(config.rngSeed);

	const allNodes = [...graph.nodeIds()];

	if (allNodes.length < 2) {
		return { pairs: [] };
	}

	// Phase 1: Sample and score candidate pairs
	const candidates: { score: number; a: NodeId; b: NodeId }[] = [];
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

		const aNbrs = new Set(graph.neighbours(a));
		const bNbrs = new Set(graph.neighbours(b));
		const score = bridgeScore(aNbrs, bNbrs, b, a);
		candidates.push({ score, a, b });
	}

	// Sort by bridge score descending (high = crosses communities)
	candidates.sort((x, y) => y.score - x.score);

	// Phase 2: Greedy selection with Jaccard diversity
	const selected: CrestSeedPair[] = [];
	const selectedPairKeys = new Set<string>();

	for (const { score, a, b } of candidates) {
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
			bridgeScore: score,
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
			bridgeScore: 0,
		});
	}

	return { pairs: selected.slice(0, config.nPairs) };
}
