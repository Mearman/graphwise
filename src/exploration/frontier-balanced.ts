/**
 * Frontier-Balanced exploration.
 *
 * Round-robin exploration across frontiers.
 * Each frontier expands one node before the next frontier gets a turn.
 * Ensures fair exploration across all seed frontiers.
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
 * Frontier-balanced priority: frontier index dominates, then discovery iteration.
 * Scales frontier index by 1e9 to ensure round-robin ordering across frontiers.
 */
function balancedPriority<N extends NodeData, E extends EdgeData>(
	_nodeId: string,
	context: PriorityContext<N, E>,
): number {
	return context.frontierIndex * 1e9 + context.iteration;
}

/**
 * Run frontier-balanced exploration (round-robin across frontiers).
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function frontierBalanced<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExplorationConfig<N, E>,
): ExplorationResult {
	return base(graph, seeds, {
		...config,
		priority: balancedPriority,
	});
}

/**
 * Run frontier-balanced exploration asynchronously (round-robin across frontiers).
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the exploration result
 */
export async function frontierBalancedAsync<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExplorationResult> {
	return baseAsync(graph, seeds, { ...config, priority: balancedPriority });
}
