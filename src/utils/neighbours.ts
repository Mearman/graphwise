/**
 * Neighbourhood computation utilities.
 *
 * Shared utilities for neighbourhood operations used by MI variants and other graph algorithms.
 * These functions eliminate duplication of neighbourhood set operations across multiple
 * implementations.
 *
 * @packageDocumentation
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";

/**
 * Collect neighbours into a Set, optionally excluding a specific node.
 *
 * @param graph - The graph to traverse
 * @param nodeId - The source node
 * @param exclude - Optional node ID to exclude from result
 * @returns A ReadonlySet of neighbouring node IDs
 */
export function neighbourSet<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	nodeId: NodeId,
	exclude?: NodeId,
): ReadonlySet<NodeId> {
	const neighbours = new Set(graph.neighbours(nodeId));
	if (exclude !== undefined) {
		neighbours.delete(exclude);
	}
	return neighbours;
}

/**
 * Compute intersection and union sizes of two neighbour sets without allocating the union set.
 *
 * This is more efficient than computing both separately, as it avoids creating a full union Set.
 *
 * @param a - First neighbourhood set
 * @param b - Second neighbourhood set
 * @returns Object with intersection and union sizes
 */
export function neighbourOverlap(
	a: ReadonlySet<NodeId>,
	b: ReadonlySet<NodeId>,
): { intersection: number; union: number } {
	let intersection = 0;

	// Count intersection by iterating through the smaller set
	const [smaller, larger] = a.size < b.size ? [a, b] : [b, a];

	for (const node of smaller) {
		if (larger.has(node)) {
			intersection++;
		}
	}

	// Union size = size(a) + size(b) - intersection
	const union = a.size + b.size - intersection;

	return { intersection, union };
}

/**
 * Return the actual intersection set of two neighbourhood sets.
 *
 * Needed by Adamic-Adar (iterates common neighbours) and ETCH (requires edge types of intersection edges).
 *
 * @param a - First neighbourhood set
 * @param b - Second neighbourhood set
 * @returns A ReadonlySet containing nodes in both a and b
 */
export function neighbourIntersection(
	a: ReadonlySet<NodeId>,
	b: ReadonlySet<NodeId>,
): ReadonlySet<NodeId> {
	const intersection = new Set<NodeId>();

	// Iterate through the smaller set for efficiency
	const [smaller, larger] = a.size < b.size ? [a, b] : [b, a];

	for (const node of smaller) {
		if (larger.has(node)) {
			intersection.add(node);
		}
	}

	return intersection;
}

/**
 * Count the number of edges with a specific type in the graph.
 *
 * Used by ETCH MI variant to compute edge rarity weighting.
 *
 * @param graph - The graph to count edges in
 * @param type - The edge type to count
 * @returns The number of edges with the specified type
 */
export function countEdgesOfType<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	type: string,
): number {
	let count = 0;
	for (const edge of graph.edges()) {
		if (edge.type === type) {
			count++;
		}
	}
	return count;
}

/**
 * Count the number of nodes with a specific type in the graph.
 *
 * Used by NOTCH MI variant to compute node rarity weighting.
 *
 * @param graph - The graph to count nodes in
 * @param type - The node type to count
 * @returns The number of nodes with the specified type
 */
export function countNodesOfType<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	type: string,
): number {
	let count = 0;
	for (const nodeId of graph.nodeIds()) {
		const node = graph.getNode(nodeId);
		if (node?.type === type) {
			count++;
		}
	}
	return count;
}
