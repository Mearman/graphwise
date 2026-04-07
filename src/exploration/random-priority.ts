/**
 * Random-Priority exploration.
 *
 * Baseline exploration with random node priorities.
 * Uses deterministic seeded randomness for reproducibility.
 * Serves as a null hypothesis for algorithm comparison.
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type {
	Seed,
	ExplorationResult,
	ExplorationConfig,
	PriorityContext,
} from "./types";
import { base, baseAsync } from "./base";
import type { AsyncExpansionConfig } from "./base";

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
 * Configuration for random-priority exploration.
 */
interface RandomPriorityConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> extends ExplorationConfig<N, E> {
	/** Random seed for deterministic reproducibility */
	readonly seed?: number;
}

/**
 * Async configuration for random-priority exploration.
 */
interface AsyncRandomPriorityConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> extends AsyncExpansionConfig<N, E> {
	/** Random seed for deterministic reproducibility */
	readonly seed?: number;
}

/**
 * Build a seeded random priority function for a given seed value.
 */
function makeRandomPriorityFn<N extends NodeData, E extends EdgeData>(
	seed: number,
): (nodeId: string, context: PriorityContext<N, E>) => number {
	return (nodeId: string): number => seededRandom(nodeId, seed);
}

/**
 * Run random-priority exploration (null hypothesis baseline).
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function randomPriority<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: RandomPriorityConfig<N, E>,
): ExplorationResult {
	const { seed = 0 } = config ?? {};
	return base(graph, seeds, {
		...config,
		priority: makeRandomPriorityFn<N, E>(seed),
	});
}

/**
 * Run random-priority exploration asynchronously (null hypothesis baseline).
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the exploration result
 */
export async function randomPriorityAsync<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncRandomPriorityConfig<N, E>,
): Promise<ExplorationResult> {
	const { seed = 0 } = config ?? {};
	return baseAsync(graph, seeds, {
		...config,
		priority: makeRandomPriorityFn<N, E>(seed),
	});
}
