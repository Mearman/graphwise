/**
 * Shared helper functions for expansion algorithm priority computations.
 *
 * These utilities encapsulate repeated computation patterns across
 * multiple expansion algorithms.
 *
 * @module expansion/priority-helpers
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";
import type { PriorityContext, ExpansionPath } from "./types";

/**
 * Compute the average mutual information between a node and all visited
 * nodes in the same frontier.
 *
 * Returns a value in [0, 1] — higher means the node is more similar
 * (on average) to already-visited same-frontier nodes.
 *
 * @param graph - Source graph
 * @param nodeId - Node being prioritised
 * @param context - Current priority context
 * @param mi - MI function to use for pairwise scoring
 * @returns Average MI score, or 0 if no same-frontier visited nodes exist
 */
export function avgFrontierMI<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	nodeId: NodeId,
	context: PriorityContext<N, E>,
	mi: (graph: ReadableGraph<N, E>, source: string, target: string) => number,
): number {
	const { frontierIndex, visitedByFrontier } = context;

	let total = 0;
	let count = 0;

	for (const [visitedId, idx] of visitedByFrontier) {
		if (idx === frontierIndex && visitedId !== nodeId) {
			total += mi(graph, visitedId, nodeId);
			count++;
		}
	}

	return count > 0 ? total / count : 0;
}

/**
 * Count the number of a node's neighbours that have been visited by
 * frontiers other than the node's own frontier.
 *
 * A higher count indicates this node is likely to bridge two frontiers,
 * making it a strong candidate for path completion.
 *
 * @param graph - Source graph
 * @param nodeId - Node being evaluated
 * @param context - Current priority context
 * @returns Number of neighbours visited by other frontiers
 */
export function countCrossFrontierNeighbours<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: ReadableGraph<N, E>,
	nodeId: NodeId,
	context: PriorityContext<N, E>,
): number {
	const { frontierIndex, visitedByFrontier } = context;
	const nodeNeighbours = new Set(graph.neighbours(nodeId));

	let count = 0;
	for (const [visitedId, idx] of visitedByFrontier) {
		if (idx !== frontierIndex && nodeNeighbours.has(visitedId)) {
			count++;
		}
	}

	return count;
}

/**
 * Incrementally update salience counts for paths discovered since the
 * last update.
 *
 * Iterates only over paths from `fromIndex` onwards, avoiding redundant
 * re-processing of already-counted paths.
 *
 * @param salienceCounts - Mutable map of node ID to salience count (mutated in place)
 * @param paths - Full list of discovered paths
 * @param fromIndex - Index to start counting from (exclusive of earlier paths)
 * @returns The new `fromIndex` value (i.e. `paths.length` after update)
 */
export function updateSalienceCounts(
	salienceCounts: Map<NodeId, number>,
	paths: readonly ExpansionPath[],
	fromIndex: number,
): number {
	for (let i = fromIndex; i < paths.length; i++) {
		const path = paths[i];
		if (path !== undefined) {
			for (const node of path.nodes) {
				salienceCounts.set(node, (salienceCounts.get(node) ?? 0) + 1);
			}
		}
	}
	return paths.length;
}
