/**
 * Frontier-Balanced expansion.
 *
 * Round-robin exploration across frontiers.
 * Each frontier expands one node before the next frontier gets a turn.
 * Ensures fair expansion across all seed frontiers.
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
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
 * Run frontier-balanced expansion (round-robin across frontiers).
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function frontierBalanced<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	return base(graph, seeds, {
		...config,
		priority: balancedPriority,
	});
}

/**
 * Run frontier-balanced expansion asynchronously (round-robin across frontiers).
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the expansion result
 */
export async function frontierBalancedAsync<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExpansionResult> {
	return baseAsync(graph, seeds, { ...config, priority: balancedPriority });
}
