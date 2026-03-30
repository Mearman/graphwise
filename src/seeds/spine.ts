/**
 * SPINE — Structural Position-Informed Node Extraction.
 *
 * Selects seed pairs using 2-hop degree distribution skewness. Nodes whose
 * 2-hop neighbourhood has skewed degree distributions sit at structurally
 * heterogeneous positions (diverse local topology). Pairs are selected by
 * matching nodes with high skewness (diverse positions) against nodes
 * with low skewness (uniform positions), ensuring exploration spans
 * structurally varied terrain.
 *
 * Blind: uses only local neighbourhood queries.
 * No global statistics, no type metadata, no ground truth required.
 *
 * @packageDocumentation
 */

import type { ReadableGraph, NodeId } from "../graph";
import type { Seed } from "../schemas/index";

/**
 * Configuration options for SPINE seed selection.
 */
export interface SpineOptions {
	/** Number of seed pairs to select (default: 100) */
	readonly nPairs?: number;
	/** Random seed for reproducibility (default: 42) */
	readonly rngSeed?: number;
	/** Jaccard diversity threshold for greedy selection (default: 0.5) */
	readonly diversityThreshold?: number;
}

/**
 * A seed pair selected by SPINE with skewness metadata.
 */
export interface SpineSeedPair {
	/** Source seed */
	readonly source: Seed;
	/** Target seed */
	readonly target: Seed;
	/** Skewness of source node's 2-hop degree distribution */
	readonly sourceSkewness: number;
	/** Skewness of target node's 2-hop degree distribution */
	readonly targetSkewness: number;
}

/**
 * Result of SPINE seed selection.
 */
export interface SpineResult {
	/** Selected seed pairs */
	readonly pairs: readonly SpineSeedPair[];
	/** Skewness scores for all nodes */
	readonly skewness: ReadonlyMap<string, number>;
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
 * Compute skewness of the 2-hop degree distribution for a node.
 *
 * For each neighbour u of node, collect the degree of u.
 * Skewness = E[(X - μ)³] / σ³ where X is the degree distribution.
 *
 * High skewness = neighbour degrees are heavily concentrated at one end.
 * Low skewness = neighbour degrees are relatively uniform.
 *
 * Returns 0.0 for nodes with fewer than 3 neighbours.
 */
function degreeSkewness(graph: ReadableGraph, node: NodeId): number {
	const neighbours = [...graph.neighbours(node)];
	if (neighbours.length < 3) return 0;

	// Collect degrees of neighbours (2-hop degree distribution)
	const degrees = neighbours.map((n) => graph.degree(n, "both"));
	const n = degrees.length;
	const mean = degrees.reduce((s, d) => s + d, 0) / n;
	const variance = degrees.reduce((s, d) => s + (d - mean) ** 2, 0) / n;

	if (variance < 1e-10) return 0;

	const std = Math.sqrt(variance);
	const moment3 = degrees.reduce((s, d) => s + (d - mean) ** 3, 0) / n;
	return moment3 / std ** 3;
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
 * SPINE — Structural Position-Informed Node Extraction.
 *
 * Computes 2-hop degree distribution skewness for each node. Nodes with
 * high positive skewness have structurally diverse neighbours (hub-periphery
 * mix), while nodes with low skewness have uniform neighbours. Pairs
 * connecting high-skewness and low-skewness nodes explore structurally
 * varied terrain.
 *
 * @param graph - The graph to sample seeds from
 * @param options - Configuration options
 * @returns Selected seed pairs with skewness metadata
 */
export function spine(
	graph: ReadableGraph,
	options: SpineOptions = {},
): SpineResult {
	const config = { ...DEFAULTS, ...options };
	const rng = createRNG(config.rngSeed);

	const allNodes = [...graph.nodeIds()];

	if (allNodes.length < 2) {
		return { pairs: [], skewness: new Map() };
	}

	// Phase 1: Compute skewness for all nodes
	const skewnessMap = new Map<NodeId, number>();
	for (const node of allNodes) {
		skewnessMap.set(node, degreeSkewness(graph, node));
	}

	// Phase 2: Categorise by skewness terciles
	const sortedNodes = [...allNodes].sort(
		(a, b) => (skewnessMap.get(a) ?? 0) - (skewnessMap.get(b) ?? 0),
	);
	const n = sortedNodes.length;

	const lowSkew = sortedNodes.slice(0, Math.floor(n / 3));
	const midSkew = sortedNodes.slice(Math.floor(n / 3), Math.floor((2 * n) / 3));
	const highSkew = sortedNodes.slice(Math.floor((2 * n) / 3));

	// Phase 3: Generate candidate pairs (cross-skewness preferred)
	const candidates: { score: number; a: NodeId; b: NodeId }[] = [];
	const sampleSize = Math.max(config.nPairs * 20, 200);

	// High-low pairs (most diverse signal)
	for (let i = 0; i < sampleSize; i++) {
		if (!highSkew.length || !lowSkew.length) break;
		const a = highSkew[Math.floor(rng() * highSkew.length)];
		const b = lowSkew[Math.floor(rng() * lowSkew.length)];
		if (a === undefined || b === undefined || a === b) continue;
		const skA = skewnessMap.get(a) ?? 0;
		const skB = skewnessMap.get(b) ?? 0;
		candidates.push({ score: Math.abs(skA - skB), a, b });
	}

	// High-mid and mid-low pairs
	const halfSample = Math.floor(sampleSize / 2);
	for (let i = 0; i < halfSample; i++) {
		if (midSkew.length && highSkew.length) {
			const a = highSkew[Math.floor(rng() * highSkew.length)];
			const b = midSkew[Math.floor(rng() * midSkew.length)];
			if (a !== undefined && b !== undefined && a !== b) {
				const skA = skewnessMap.get(a) ?? 0;
				const skB = skewnessMap.get(b) ?? 0;
				candidates.push({ score: Math.abs(skA - skB) * 0.8, a, b });
			}
		}
		if (midSkew.length && lowSkew.length) {
			const a = midSkew[Math.floor(rng() * midSkew.length)];
			const b = lowSkew[Math.floor(rng() * lowSkew.length)];
			if (a !== undefined && b !== undefined && a !== b) {
				const skA = skewnessMap.get(a) ?? 0;
				const skB = skewnessMap.get(b) ?? 0;
				candidates.push({ score: Math.abs(skA - skB) * 0.8, a, b });
			}
		}
	}

	// Same-category pairs for within-structure coverage
	const quarterSample = Math.floor(sampleSize / 4);
	for (let i = 0; i < quarterSample; i++) {
		if (highSkew.length >= 2) {
			const i1 = Math.floor(rng() * highSkew.length);
			let i2 = Math.floor(rng() * highSkew.length);
			while (i1 === i2) i2 = Math.floor(rng() * highSkew.length);
			const a = highSkew[i1];
			const b = highSkew[i2];
			if (a !== undefined && b !== undefined) {
				const skA = skewnessMap.get(a) ?? 0;
				const skB = skewnessMap.get(b) ?? 0;
				candidates.push({ score: Math.abs(skA - skB) * 0.5, a, b });
			}
		}
	}

	candidates.sort((x, y) => y.score - x.score);

	// Phase 4: Greedy selection with Jaccard diversity
	const selected: SpineSeedPair[] = [];
	const selectedPairKeys = new Set<string>();

	for (const { a, b } of candidates) {
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
			sourceSkewness: skewnessMap.get(a) ?? 0,
			targetSkewness: skewnessMap.get(b) ?? 0,
		});
	}

	// Fill shortfall
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
			sourceSkewness: skewnessMap.get(a) ?? 0,
			targetSkewness: skewnessMap.get(b) ?? 0,
		});
	}

	return {
		pairs: selected.slice(0, config.nPairs),
		skewness: skewnessMap,
	};
}
