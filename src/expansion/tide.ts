/**
 * TIDE (Type-Integrated Degree Estimation) algorithm.
 *
 * Prioritises exploration by edge degree rather than node degree.
 * Expands edges with lower combined endpoint degrees first.
 *
 * Useful for finding paths through sparse regions of the graph,
 * avoiding dense clusters.
 *
 * @module expansion/tide
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";
import type { AsyncExpansionConfig } from "./base";
import { baseAsync } from "./base";

/**
 * TIDE priority function.
 *
 * Priority = degree(source) + degree(target)
 * Lower values = higher priority (explored first)
 */
function tidePriority<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
): number {
	// Sum of source degree and neighbour degrees
	const graph = context.graph;
	let totalDegree = context.degree;

	for (const neighbour of graph.neighbours(nodeId)) {
		totalDegree += graph.degree(neighbour);
	}

	return totalDegree;
}

/**
 * Run TIDE expansion algorithm.
 *
 * Expands from seeds prioritising low-degree edges first.
 * Useful for avoiding hubs and exploring sparse regions.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function tide<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	return base(graph, seeds, {
		...config,
		priority: tidePriority,
	});
}

/**
 * Run TIDE expansion asynchronously.
 *
 * Note: the TIDE priority function accesses `context.graph` to retrieve
 * neighbour lists and per-neighbour degrees. Full async equivalence
 * requires PriorityContext refactoring (Phase 4b deferred). This export
 * establishes the async API surface.
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the expansion result
 */
export async function tideAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExpansionResult> {
	return baseAsync(graph, seeds, {
		...config,
		priority: tidePriority,
	});
}
