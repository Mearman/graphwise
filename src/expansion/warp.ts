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
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";

/**
 * PIPE priority function.
 *
 * Priority = 1 / (1 + bridge_score)
 * Bridge score = neighbourhood overlap with other frontiers
 * Higher bridge score = more likely to be on paths = explored first
 */
function warpPriority<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
): number {
	const graph = context.graph;
	const currentFrontier = context.frontierIndex;
	const nodeNeighbours = new Set(graph.neighbours(nodeId));

	// Count how many neighbours are visited by other frontiers
	let bridgeScore = 0;

	for (const [visitedId, frontierIdx] of context.visitedByFrontier) {
		if (frontierIdx !== currentFrontier && nodeNeighbours.has(visitedId)) {
			bridgeScore++;
		}
	}

	// Also consider discovered paths - nodes on existing paths are valuable
	for (const path of context.discoveredPaths) {
		if (path.nodes.includes(nodeId)) {
			bridgeScore += 2; // Bonus for being on discovered paths
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
