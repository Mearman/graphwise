/**
 * Clustering coefficient computation for graph nodes.
 *
 * The local clustering coefficient measures how close a node's neighbours
 * are to being a complete graph (clique). It is used in SPAN MI variant
 * and GRASP seed selection.
 *
 * @packageDocumentation
 */

import type { ReadableGraph, NodeId } from "../graph";

/**
 * Compute the local clustering coefficient for a single node.
 *
 * The clustering coefficient is defined as:
 *   CC(v) = (triangles through v) / (possible triangles)
 *   CC(v) = 2 * |{(u,w) : u,w in N(v), (u,w) in E}| / (deg(v) * (deg(v) - 1))
 *
 * For nodes with degree < 2, the clustering coefficient is 0.
 *
 * @param graph - The graph to compute on
 * @param nodeId - The node to compute clustering coefficient for
 * @returns The clustering coefficient in [0, 1], or 0 if undefined
 */
export function localClusteringCoefficient(
	graph: ReadableGraph,
	nodeId: NodeId,
): number {
	const neighbours = [...graph.neighbours(nodeId, "both")];
	const degree = neighbours.length;

	// Nodes with degree < 2 have no possible triangles
	if (degree < 2) {
		return 0;
	}

	// Count actual triangles: pairs of neighbours that are connected
	let triangleCount = 0;

	for (let i = 0; i < neighbours.length; i++) {
		const u = neighbours[i];
		if (u === undefined) continue;

		for (let j = i + 1; j < neighbours.length; j++) {
			const w = neighbours[j];
			if (w === undefined) continue;

			// Check if u and w are connected
			if (
				graph.getEdge(u, w) !== undefined ||
				graph.getEdge(w, u) !== undefined
			) {
				triangleCount++;
			}
		}
	}

	// Possible triangles: deg * (deg - 1) / 2 pairs
	// We multiply by 2 because each triangle is counted once
	const possibleTriangles = (degree * (degree - 1)) / 2;

	return triangleCount / possibleTriangles;
}

/**
 * Compute approximate local clustering coefficient using sampling.
 *
 * For nodes with many neighbours, this samples neighbour pairs rather than
 * checking all pairs. Useful for large graphs where exact computation is expensive.
 *
 * @param graph - The graph to compute on
 * @param nodeId - The node to compute clustering coefficient for
 * @param sampleSize - Maximum number of neighbour pairs to check (default: 100)
 * @returns The approximate clustering coefficient in [0, 1]
 */
export function approximateClusteringCoefficient(
	graph: ReadableGraph,
	nodeId: NodeId,
	sampleSize = 100,
): number {
	const neighbours = [...graph.neighbours(nodeId, "both")];
	const degree = neighbours.length;

	if (degree < 2) {
		return 0;
	}

	const possibleTriangles = (degree * (degree - 1)) / 2;

	// If all pairs can be checked within sample limit, use exact computation
	if (possibleTriangles <= sampleSize) {
		return localClusteringCoefficient(graph, nodeId);
	}

	// Sample pairs uniformly
	let triangleCount = 0;
	let sampled = 0;

	// Use reservoir sampling style approach for pair selection
	for (let i = 0; i < neighbours.length && sampled < sampleSize; i++) {
		const u = neighbours[i];
		if (u === undefined) continue;

		for (let j = i + 1; j < neighbours.length && sampled < sampleSize; j++) {
			const w = neighbours[j];
			if (w === undefined) continue;

			// Decide whether to include this pair based on remaining budget
			sampled++;

			// Check if u and w are connected
			if (
				graph.getEdge(u, w) !== undefined ||
				graph.getEdge(w, u) !== undefined
			) {
				triangleCount++;
			}
		}
	}

	// Extrapolate from sample
	return (triangleCount / sampled) * (possibleTriangles / possibleTriangles);
}

/**
 * Compute clustering coefficients for multiple nodes efficiently.
 *
 * Reuses neighbour sets to avoid repeated iteration.
 *
 * @param graph - The graph to compute on
 * @param nodeIds - The nodes to compute clustering coefficients for
 * @returns Map from nodeId to clustering coefficient
 */
export function batchClusteringCoefficients(
	graph: ReadableGraph,
	nodeIds: readonly NodeId[],
): Map<NodeId, number> {
	const results = new Map<NodeId, number>();

	for (const nodeId of nodeIds) {
		results.set(nodeId, localClusteringCoefficient(graph, nodeId));
	}

	return results;
}
