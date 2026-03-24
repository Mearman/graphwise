/**
 * PIPE (Path-Potential Informed Priority Expansion) algorithm.
 *
 * Discovers paths by prioritising nodes that bridge multiple frontiers.
 * Priority function: π(v) = deg(v) / (1 + path_potential(v))
 *
 * where path_potential(v) = count of v's neighbours already visited by OTHER seed frontiers.
 *
 * High path potential (many bridges to other frontiers) → lower priority → expanded sooner.
 * Low path potential (few bridges) → higher priority → deferred.
 *
 * This incentivises discovery of paths that connect multiple frontiers.
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
 * Priority function using path potential.
 * Lower values = higher priority (expanded first).
 *
 * Path potential measures how many of a node's neighbours have been
 * visited by OTHER frontiers (not the current frontier).
 */
function pipePriority<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
): number {
	const graph = context.graph;
	const neighbours = graph.neighbours(nodeId);

	// Count how many neighbours have been visited by OTHER frontiers
	let pathPotential = 0;
	for (const neighbour of neighbours) {
		const visitedBy = context.visitedByFrontier.get(neighbour);
		if (visitedBy !== undefined && visitedBy !== context.frontierIndex) {
			pathPotential++;
		}
	}

	// Priority = degree / (1 + path_potential)
	// High path potential → lower priority (expanded sooner)
	return context.degree / (1 + pathPotential);
}

/**
 * Run PIPE expansion (Path-Potential Informed Priority Expansion).
 *
 * Discovers paths by prioritising nodes that bridge multiple frontiers,
 * identifying connecting points between seed regions.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function pipe<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	return base(graph, seeds, {
		...config,
		priority: pipePriority,
	});
}
