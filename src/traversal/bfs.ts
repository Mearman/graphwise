/**
 * Breadth-first search traversal algorithms.
 *
 * BFS explores nodes level by level, visiting all neighbours at the current
 * depth before moving to nodes at the next depth level. This guarantees
 * shortest path discovery in unweighted graphs.
 */

import type { ReadableGraph, NodeId } from "../graph";

/**
 * Node visit information during BFS traversal.
 */
export interface BfsPathEntry {
	/** The visited node identifier */
	node: NodeId;
	/** Distance from the start node (0 for start node) */
	depth: number;
	/** Parent node in the BFS tree (undefined for start node) */
	parent: NodeId | undefined;
}

/**
 * Perform a breadth-first search traversal from a start node.
 *
 * This generator yields node IDs in BFS order. It uses lazy evaluation
 * via a generator, making it memory-efficient for large graphs.
 *
 * @param graph - The graph to traverse
 * @param start - The starting node ID
 * @yields Node IDs in BFS order
 *
 * @example
 * ```typescript
 * for (const nodeId of bfs(graph, "A")) {
 *   console.log(nodeId);
 * }
 * ```
 */
export function* bfs(graph: ReadableGraph, start: NodeId): Iterable<NodeId> {
	if (!graph.hasNode(start)) {
		return;
	}

	const visited = new Set<NodeId>([start]);
	const queue: NodeId[] = [start];

	while (queue.length > 0) {
		const current = queue.shift();
		if (current === undefined) break;
		yield current;

		for (const neighbour of graph.neighbours(current)) {
			if (!visited.has(neighbour)) {
				visited.add(neighbour);
				queue.push(neighbour);
			}
		}
	}
}

/**
 * Perform a breadth-first search traversal with path information.
 *
 * This generator yields detailed information about each visited node,
 * including its depth from the start and parent in the BFS tree.
 * Useful for reconstructing shortest paths.
 *
 * @param graph - The graph to traverse
 * @param start - The starting node ID
 * @yields Objects containing node ID, depth, and parent
 *
 * @example
 * ```typescript
 * for (const entry of bfsWithPath(graph, "A")) {
 *   console.log(`${entry.node} at depth ${entry.depth}`);
 * }
 * ```
 */
export function* bfsWithPath(
	graph: ReadableGraph,
	start: NodeId,
): Iterable<BfsPathEntry> {
	if (!graph.hasNode(start)) {
		return;
	}

	const visited = new Set<NodeId>([start]);
	const queue: { node: NodeId; depth: number; parent: NodeId | undefined }[] = [
		{ node: start, depth: 0, parent: undefined },
	];

	while (queue.length > 0) {
		const current = queue.shift();
		if (current === undefined) break;
		yield current;

		for (const neighbour of graph.neighbours(current.node)) {
			if (!visited.has(neighbour)) {
				visited.add(neighbour);
				queue.push({
					node: neighbour,
					depth: current.depth + 1,
					parent: current.node,
				});
			}
		}
	}
}
