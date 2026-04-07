/**
 * PIPE (Path-potential Informed Priority Exploration) algorithm.
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
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type {
	Seed,
	ExplorationResult,
	ExplorationConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";
import type { AsyncExpansionConfig } from "./base";
import { baseAsync } from "./base";

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
 * Run PIPE exploration (Path-potential Informed Priority Exploration).
 *
 * Discovers paths by prioritising nodes that bridge multiple frontiers,
 * identifying connecting points between seed regions.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function pipe<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExplorationConfig<N, E>,
): ExplorationResult {
	return base(graph, seeds, {
		...config,
		priority: pipePriority,
	});
}

/**
 * Run PIPE exploration asynchronously.
 *
 * Note: the PIPE priority function accesses `context.graph` to retrieve
 * neighbour lists. Full async equivalence requires PriorityContext
 * refactoring (Phase 4b deferred). This export establishes the async API
 * surface; use with a `wrapAsync`-wrapped sync graph for testing.
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the exploration result
 */
export async function pipeAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExplorationResult> {
	return baseAsync(graph, seeds, {
		...config,
		priority: pipePriority,
	});
}
