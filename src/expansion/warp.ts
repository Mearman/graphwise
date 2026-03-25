/**
 * PIPE (Path Importance Priority Expansion) algorithm.
 *
 * Prioritises nodes that are more likely to be on important paths.
 * Uses betweenness-like estimation based on neighbourhood overlap.
 *
 * Useful for finding paths through "bridge" nodes.
 *
 * @module expansion/warp
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
import { countCrossFrontierNeighbours } from "./priority-helpers";

/**
 * WARP priority function.
 *
 * Priority = 1 / (1 + bridge_score)
 * Bridge score = cross-frontier neighbour count plus bonus for nodes
 * already on discovered paths.
 * Higher bridge score = more likely to complete paths = explored first.
 */
function warpPriority<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
): number {
	// Count neighbours visited by other frontiers
	let bridgeScore = countCrossFrontierNeighbours(
		context.graph,
		nodeId,
		context,
	);

	// Additional bonus for nodes already present on discovered paths
	for (const path of context.discoveredPaths) {
		if (path.nodes.includes(nodeId)) {
			bridgeScore += 2;
		}
	}

	// Invert: higher bridge score = lower priority value = expanded first
	return 1 / (1 + bridgeScore);
}

/**
 * Run WARP expansion algorithm.
 *
 * Expands from seeds prioritising bridge nodes.
 * Useful for finding paths through structurally important nodes.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function warp<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	return base(graph, seeds, {
		...config,
		priority: warpPriority,
	});
}

/**
 * Run WARP expansion asynchronously.
 *
 * Note: the WARP priority function accesses `context.graph` via
 * `countCrossFrontierNeighbours`. Full async equivalence requires
 * PriorityContext refactoring (Phase 4b deferred). This export
 * establishes the async API surface.
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the expansion result
 */
export async function warpAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExpansionResult> {
	return baseAsync(graph, seeds, {
		...config,
		priority: warpPriority,
	});
}
