/**
 * Standard BFS (Breadth-First Search) expansion.
 *
 * Simplest baseline: FIFO order based on discovery iteration.
 * All nodes at the same frontier are explored in discovery order.
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
 * BFS priority: discovery iteration order (FIFO).
 */
function bfsPriority<N extends NodeData, E extends EdgeData>(
	_nodeId: string,
	context: PriorityContext<N, E>,
): number {
	return context.iteration;
}

/**
 * Run standard BFS expansion (FIFO discovery order).
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function standardBfs<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	return base(graph, seeds, {
		...config,
		priority: bfsPriority,
	});
}

/**
 * Run standard BFS expansion asynchronously (FIFO discovery order).
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the expansion result
 */
export async function standardBfsAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExpansionResult> {
	return baseAsync(graph, seeds, { ...config, priority: bfsPriority });
}
