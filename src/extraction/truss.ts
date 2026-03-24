/**
 * K-truss decomposition algorithm.
 *
 * A k-truss is the maximal subgraph where every edge participates in at
 * least k-2 triangles. The 2-truss is the entire graph, the 3-truss
 * requires each edge to be in at least one triangle, etc.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";
import { AdjacencyMapGraph } from "../graph/adjacency-map";

/**
 * Count triangles involving a given edge.
 *
 * For an edge (u, v), count common neighbours of u and v.
 * Each common neighbour w forms a triangle u-v-w.
 *
 * @param graph - The graph
 * @param u - First endpoint
 * @param v - Second endpoint
 * @returns Number of triangles containing the edge (u, v)
 */
function countEdgeTriangles(
	graph: ReadableGraph,
	u: NodeId,
	v: NodeId,
): number {
	const uNeighbours = new Set(graph.neighbours(u));
	let count = 0;

	for (const w of graph.neighbours(v)) {
		if (w !== u && uNeighbours.has(w)) {
			count++;
		}
	}

	return count;
}

/**
 * Extract the k-truss of a graph.
 *
 * The k-truss is the maximal subgraph where every edge participates in
 * at least k-2 triangles. This is computed by iteratively removing edges
 * with fewer than k-2 triangles, then removing isolated nodes.
 *
 * Note: K-truss is typically defined for undirected graphs. For directed
 * graphs, this treats the graph as undirected for triangle counting.
 *
 * @param graph - The source graph
 * @param k - The minimum triangle count threshold (edge must be in >= k-2 triangles)
 * @returns A new graph containing the k-truss (may be empty)
 *
 * @example
 * ```typescript
 * // Extract the 3-truss (edges in at least 1 triangle)
 * const truss3 = extractKTruss(graph, 3);
 * ```
 */
export function extractKTruss<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	k: number,
): AdjacencyMapGraph<N, E> {
	if (k < 2) {
		throw new Error(`k must be at least 2, got ${String(k)}`);
	}

	const minTriangles = k - 2;

	// Build undirected adjacency for triangle counting
	// Store as Map<NodeId, Set<NodeId>> for efficient lookup
	const adjacency = new Map<NodeId, Set<NodeId>>();
	const edgeData = new Map<string, E>();
	const remainingEdges = new Set<string>();

	for (const nodeId of graph.nodeIds()) {
		adjacency.set(nodeId, new Set());
	}

	// Build adjacency (treating as undirected)
	for (const edge of graph.edges()) {
		const { source, target } = edge;

		// Add to adjacency (both directions)
		adjacency.get(source)?.add(target);
		adjacency.get(target)?.add(source);

		// Store edge data with canonical key
		const key =
			source < target ? `${source}::${target}` : `${target}::${source}`;
		edgeData.set(key, edge);
		remainingEdges.add(key);
	}

	// Compute initial triangle counts for each edge
	const triangleCounts = new Map<string, number>();
	const edgesToRemove: string[] = [];

	for (const key of remainingEdges) {
		const edge = edgeData.get(key);
		if (edge !== undefined) {
			const count = countEdgeTriangles(graph, edge.source, edge.target);
			triangleCounts.set(key, count);
			if (count < minTriangles) {
				edgesToRemove.push(key);
			}
		}
	}

	// Iteratively remove edges with insufficient triangles
	while (edgesToRemove.length > 0) {
		const edgeKey = edgesToRemove.shift();
		if (edgeKey === undefined) break;

		if (!remainingEdges.has(edgeKey)) {
			continue;
		}

		remainingEdges.delete(edgeKey);
		const edge = edgeData.get(edgeKey);

		if (edge === undefined) {
			continue;
		}

		const { source, target } = edge;

		// Remove from adjacency
		adjacency.get(source)?.delete(target);
		adjacency.get(target)?.delete(source);

		// Find triangles that were broken and update counts
		// Common neighbours form triangles (source, target, neighbour)
		const sourceNeighbours = adjacency.get(source);
		if (sourceNeighbours !== undefined) {
			for (const w of adjacency.get(target) ?? []) {
				if (sourceNeighbours.has(w)) {
					// Triangle (source, target, w) is broken
					// Update triangle counts for edges (source, w) and (target, w)
					const keySw = source < w ? `${source}::${w}` : `${w}::${source}`;
					const keyTw = target < w ? `${target}::${w}` : `${w}::${target}`;

					for (const keyToUpdate of [keySw, keyTw]) {
						if (remainingEdges.has(keyToUpdate)) {
							const currentCount = triangleCounts.get(keyToUpdate) ?? 0;
							const newCount = currentCount - 1;
							triangleCounts.set(keyToUpdate, newCount);

							if (newCount < minTriangles && newCount === minTriangles - 1) {
								edgesToRemove.push(keyToUpdate);
							}
						}
					}
				}
			}
		}
	}

	// Determine which nodes are still connected by remaining edges
	const nodesWithEdges = new Set<NodeId>();
	for (const key of remainingEdges) {
		const edge = edgeData.get(key);
		if (edge !== undefined) {
			nodesWithEdges.add(edge.source);
			nodesWithEdges.add(edge.target);
		}
	}

	// Build the result
	const result = graph.directed
		? AdjacencyMapGraph.directed<N, E>()
		: AdjacencyMapGraph.undirected<N, E>();

	// Add nodes that have at least one remaining edge
	for (const nodeId of nodesWithEdges) {
		const nodeData = graph.getNode(nodeId);
		if (nodeData !== undefined) {
			result.addNode(nodeData);
		}
	}

	// Add remaining edges
	for (const key of remainingEdges) {
		const edge = edgeData.get(key);
		if (
			edge !== undefined &&
			result.hasNode(edge.source) &&
			result.hasNode(edge.target)
		) {
			result.addEdge(edge);
		}
	}

	return result;
}

/**
 * Compute the truss number for each edge.
 *
 * The truss number of an edge is the largest k such that the edge
 * belongs to the k-truss.
 *
 * @param graph - The source graph
 * @returns Map from edge key (canonical "u::v") to truss number
 *
 * @example
 * ```typescript
 * const trussNumbers = computeTrussNumbers(graph);
 * const edgeKey = 'A::B'; // where A < B lexicographically
 * console.log(`Edge A-B is in the ${trussNumbers.get(edgeKey)}-truss`);
 * ```
 */
export function computeTrussNumbers<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
): Map<string, number> {
	// Build adjacency and edge tracking
	const adjacency = new Map<NodeId, Set<NodeId>>();
	const edgeData = new Map<string, E>();
	const remainingEdges = new Set<string>();

	for (const nodeId of graph.nodeIds()) {
		adjacency.set(nodeId, new Set());
	}

	for (const edge of graph.edges()) {
		const { source, target } = edge;
		adjacency.get(source)?.add(target);
		adjacency.get(target)?.add(source);

		const key =
			source < target ? `${source}::${target}` : `${target}::${source}`;
		edgeData.set(key, edge);
		remainingEdges.add(key);
	}

	// Compute initial triangle counts
	const triangleCounts = new Map<string, number>();
	for (const key of remainingEdges) {
		const edge = edgeData.get(key);
		if (edge !== undefined) {
			triangleCounts.set(
				key,
				countEdgeTriangles(graph, edge.source, edge.target),
			);
		}
	}

	// Result map
	const trussNumbers = new Map<string, number>();

	// Process edges in order of triangle count
	const edgesByTriangleCount = new Map<number, Set<string>>();

	for (const [key, count] of triangleCounts) {
		if (!edgesByTriangleCount.has(count)) {
			edgesByTriangleCount.set(count, new Set());
		}
		edgesByTriangleCount.get(count)?.add(key);
	}

	// Process from lowest triangle count upwards
	const sortedCounts = [...edgesByTriangleCount.keys()].sort((a, b) => a - b);

	for (const currentCount of sortedCounts) {
		const bucket = edgesByTriangleCount.get(currentCount);
		if (bucket === undefined) continue;

		while (bucket.size > 0) {
			const edgeKey = bucket.values().next().value;
			if (edgeKey === undefined) break;
			bucket.delete(edgeKey);

			if (!remainingEdges.has(edgeKey)) {
				continue;
			}

			// Truss number is triangle count + 2
			const trussNumber = currentCount + 2;
			trussNumbers.set(edgeKey, trussNumber);
			remainingEdges.delete(edgeKey);

			const edge = edgeData.get(edgeKey);
			if (edge === undefined) continue;

			const { source, target } = edge;

			// Remove from adjacency
			adjacency.get(source)?.delete(target);
			adjacency.get(target)?.delete(source);

			// Update triangle counts for affected edges
			const sourceNeighbours = adjacency.get(source);
			if (sourceNeighbours !== undefined) {
				for (const w of adjacency.get(target) ?? []) {
					if (sourceNeighbours.has(w)) {
						const keySw = source < w ? `${source}::${w}` : `${w}::${source}`;
						const keyTw = target < w ? `${target}::${w}` : `${w}::${target}`;

						for (const keyToUpdate of [keySw, keyTw]) {
							if (remainingEdges.has(keyToUpdate)) {
								const oldCount = triangleCounts.get(keyToUpdate) ?? 0;
								const newCount = oldCount - 1;
								triangleCounts.set(keyToUpdate, newCount);

								// Move to new bucket
								edgesByTriangleCount.get(oldCount)?.delete(keyToUpdate);
								if (!edgesByTriangleCount.has(newCount)) {
									edgesByTriangleCount.set(newCount, new Set());
								}
								edgesByTriangleCount.get(newCount)?.add(keyToUpdate);
							}
						}
					}
				}
			}
		}
	}

	return trussNumbers;
}
