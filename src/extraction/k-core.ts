/**
 * K-core decomposition algorithm.
 *
 * A k-core is the maximal subgraph where every node has degree at least k.
 * The decomposition is computed by iteratively removing nodes with degree < k.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";
import { AdjacencyMapGraph } from "../graph/adjacency-map";

/**
 * Extract the k-core of a graph.
 *
 * The k-core is the maximal connected subgraph where every node has
 * degree at least k. This is computed using a peeling algorithm that
 * iteratively removes nodes with degree less than k.
 *
 * For undirected graphs, degree counts all adjacent nodes.
 * For directed graphs, degree counts both in- and out-neighbours.
 *
 * @param graph - The source graph
 * @param k - The minimum degree threshold
 * @returns A new graph containing the k-core (may be empty)
 *
 * @example
 * ```typescript
 * // Extract the 3-core (nodes with at least 3 neighbours)
 * const core3 = extractKCore(graph, 3);
 * ```
 */
export function extractKCore<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	k: number,
): AdjacencyMapGraph<N, E> {
	if (k < 0) {
		throw new Error(`k must be non-negative, got ${String(k)}`);
	}

	// Track remaining nodes and their degrees
	const remaining = new Set<NodeId>();
	const degrees = new Map<NodeId, number>();

	for (const nodeId of graph.nodeIds()) {
		remaining.add(nodeId);
		// For directed graphs, use total degree (both directions)
		const deg = graph.directed
			? graph.degree(nodeId, "both")
			: graph.degree(nodeId);
		degrees.set(nodeId, deg);
	}

	// Use a queue for nodes to remove (degree < k)
	const toRemove: NodeId[] = [];

	for (const [nodeId, deg] of degrees) {
		if (deg < k) {
			toRemove.push(nodeId);
		}
	}

	// Iteratively remove nodes with degree < k
	while (toRemove.length > 0) {
		const nodeId = toRemove.shift();
		if (nodeId === undefined) break;

		if (!remaining.has(nodeId)) {
			continue;
		}

		remaining.delete(nodeId);

		// Update degrees of neighbours
		const neighbours = graph.directed
			? graph.neighbours(nodeId, "both")
			: graph.neighbours(nodeId);

		for (const neighbour of neighbours) {
			if (remaining.has(neighbour)) {
				const currentDeg = degrees.get(neighbour) ?? 0;
				const newDeg = currentDeg - 1;
				degrees.set(neighbour, newDeg);

				if (newDeg < k && newDeg === k - 1) {
					// Only add to queue if crossing below k threshold
					toRemove.push(neighbour);
				}
			}
		}
	}

	// Build the result as an induced subgraph
	const result = graph.directed
		? AdjacencyMapGraph.directed<N, E>()
		: AdjacencyMapGraph.undirected<N, E>();

	// Add remaining nodes
	for (const nodeId of remaining) {
		const nodeData = graph.getNode(nodeId);
		if (nodeData !== undefined) {
			result.addNode(nodeData);
		}
	}

	// Add edges between remaining nodes
	for (const edge of graph.edges()) {
		if (remaining.has(edge.source) && remaining.has(edge.target)) {
			result.addEdge(edge);
		}
	}

	return result;
}
