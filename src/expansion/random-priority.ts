/**
 * Random-Priority expansion.
 *
 * Baseline exploration with random node priorities.
 * Uses deterministic seeded randomness for reproducibility.
 * Serves as a null hypothesis for algorithm comparison.
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";

/**
 * Deterministic seeded random number generator.
 * Uses FNV-1a-like hash for input → [0, 1] output.
 *
 * @param input - String to hash
 * @param seed - Random seed for reproducibility
 * @returns Deterministic random value in [0, 1]
 */
function seededRandom(input: string, seed = 0): number {
	let h = seed;
	for (let i = 0; i < input.length; i++) {
		h = Math.imul(h ^ input.charCodeAt(i), 0x9e3779b9);

		h ^= h >>> 16;
	}

	return (h >>> 0) / 0xffffffff;
}

/**
 * Configuration for random-priority expansion.
 */
interface RandomPriorityConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> extends ExpansionConfig<N, E> {
	/** Random seed for deterministic reproducibility */
	readonly seed?: number;
}

/**
 * Run random-priority expansion (null hypothesis baseline).
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function randomPriority<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: RandomPriorityConfig<N, E>,
): ExpansionResult {
	const { seed = 0 } = config ?? {};

	// Random priority: seeded hash of node ID
	const randomPriorityFn = (
		nodeId: string,
		context: PriorityContext<N, E>,
	): number => {
		// Suppress unused variable warning
		void context;
		void graph;
		return seededRandom(nodeId, seed);
	};

	return base(graph, seeds, {
		...config,
		priority: randomPriorityFn,
	});
}
