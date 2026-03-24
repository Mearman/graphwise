/**
 * Depth-first search traversal algorithms.
 *
 * DFS explores as far as possible along each branch before backtracking.
 * This makes it useful for cycle detection, topological sorting, and
 * finding connected components.
 */

import type { ReadableGraph, NodeId } from "../graph";

/**
 * Node visit information during DFS traversal.
 */
export interface DfsPathEntry {
	/** The visited node identifier */
	node: NodeId;
	/** Distance from the start node (0 for start node) */
	depth: number;
	/** Parent node in the DFS tree (undefined for start node) */
	parent: NodeId | undefined;
}

/**
 * Perform a depth-first search traversal from a start node.
 *
 * This generator yields node IDs in DFS order (pre-order traversal).
 * It uses lazy evaluation via a generator, making it memory-efficient
 * for large graphs.
 *
 * @param graph - The graph to traverse
 * @param start - The starting node ID
 * @yields Node IDs in DFS order
 *
 * @example
 * ```typescript
 * for (const nodeId of dfs(graph, "A")) {
 *   console.log(nodeId);
 * }
 * ```
 */
export function* dfs(graph: ReadableGraph, start: NodeId): Iterable<NodeId> {
	if (!graph.hasNode(start)) {
		return;
	}

	const visited = new Set<NodeId>();
	const stack: NodeId[] = [start];

	while (stack.length > 0) {
		const current = stack.pop();
		if (current === undefined) break;

		if (visited.has(current)) {
			continue;
		}

		visited.add(current);
		yield current;

		// Add neighbours in reverse order to maintain left-to-right traversal
		// when popping from the stack
		const neighbours = [...graph.neighbours(current)].reverse();
		for (const neighbour of neighbours) {
			if (!visited.has(neighbour)) {
				stack.push(neighbour);
			}
		}
	}
}

/**
 * Perform a depth-first search traversal with path information.
 *
 * This generator yields detailed information about each visited node,
 * including its depth from the start and parent in the DFS tree.
 *
 * @param graph - The graph to traverse
 * @param start - The starting node ID
 * @yields Objects containing node ID, depth, and parent
 *
 * @example
 * ```typescript
 * for (const entry of dfsWithPath(graph, "A")) {
 *   console.log(`${entry.node} at depth ${entry.depth}`);
 * }
 * ```
 */
export function* dfsWithPath(
	graph: ReadableGraph,
	start: NodeId,
): Iterable<DfsPathEntry> {
	if (!graph.hasNode(start)) {
		return;
	}

	const visited = new Set<NodeId>();
	const stack: { node: NodeId; depth: number; parent: NodeId | undefined }[] = [
		{ node: start, depth: 0, parent: undefined },
	];

	while (stack.length > 0) {
		const current = stack.pop();
		if (current === undefined) break;

		if (visited.has(current.node)) {
			continue;
		}

		visited.add(current.node);
		yield current;

		// Add neighbours in reverse order to maintain left-to-right traversal
		// when popping from the stack
		const neighbours = [...graph.neighbours(current.node)].reverse();
		for (const neighbour of neighbours) {
			if (!visited.has(neighbour)) {
				stack.push({
					node: neighbour,
					depth: current.depth + 1,
					parent: current.node,
				});
			}
		}
	}
}
