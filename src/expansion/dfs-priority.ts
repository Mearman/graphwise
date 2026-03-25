/**
 * DFS-Priority expansion.
 *
 * Baseline exploration using LIFO (last-in, first-out) discovery order,
 * simulating depth-first search via the BASE framework.
 * Uses negative iteration count as priority so the most recently
 * discovered node is always expanded next.
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
 * DFS priority function: negative iteration produces LIFO ordering.
 *
 * Lower priority values are expanded first, so negating the iteration
 * counter ensures the most recently enqueued node is always next.
 */
export function dfsPriorityFn<N extends NodeData, E extends EdgeData>(
	_nodeId: string,
	context: PriorityContext<N, E>,
): number {
	return -context.iteration;
}

/**
 * Run DFS-priority expansion (LIFO discovery order).
 *
 * Uses the BASE framework with a negative-iteration priority function,
 * which causes the most recently discovered node to be expanded first —
 * equivalent to depth-first search behaviour.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function dfsPriority<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	return base(graph, seeds, {
		...config,
		priority: dfsPriorityFn,
	});
}

/**
 * Run DFS-priority expansion asynchronously (LIFO discovery order).
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the expansion result
 */
export async function dfsPriorityAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExpansionResult> {
	return baseAsync(graph, seeds, { ...config, priority: dfsPriorityFn });
}
