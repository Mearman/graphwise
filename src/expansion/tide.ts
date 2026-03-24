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
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";

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
