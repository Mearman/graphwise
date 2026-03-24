/**
 * Filtered subgraph extraction.
 *
 * Extracts a subgraph based on predicate functions for nodes and edges.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";
import { AdjacencyMapGraph } from "../graph/adjacency-map";

/**
 * Options for filtering a subgraph.
 */
export interface FilterOptions<N extends NodeData, E extends EdgeData> {
	/** Predicate to filter nodes. Return true to include the node. */
	readonly nodePredicate?: (node: N) => boolean;
	/** Predicate to filter edges. Return true to include the edge. */
	readonly edgePredicate?: (edge: E) => boolean;
	/** Whether to remove nodes that become isolated after edge filtering. Default: false. */
	readonly removeIsolated?: boolean;
}

/**
 * Extract a filtered subgraph based on node and edge predicates.
 *
 * Nodes are first filtered by the node predicate (if provided).
 * Edges are then filtered by the edge predicate (if provided), and only
 * retained if both endpoints pass the node predicate.
 *
 * @param graph - The source graph
 * @param options - Filter options specifying node/edge predicates
 * @returns A new graph containing only nodes and edges that pass the predicates
 *
 * @example
 * ```typescript
 * // Extract subgraph of high-weight nodes
 * const filtered = filterSubgraph(graph, {
 *   nodePredicate: (node) => (node.weight ?? 0) > 0.5,
 *   removeIsolated: true
 * });
 * ```
 */
export function filterSubgraph<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	options?: FilterOptions<N, E>,
): AdjacencyMapGraph<N, E> {
	const {
		nodePredicate,
		edgePredicate,
		removeIsolated = false,
	} = options ?? {};

	const result = graph.directed
		? AdjacencyMapGraph.directed<N, E>()
		: AdjacencyMapGraph.undirected<N, E>();

	// Track which nodes were added
	const includedNodes = new Set<NodeId>();

	// Add nodes that pass the predicate
	for (const nodeId of graph.nodeIds()) {
		const nodeData = graph.getNode(nodeId);
		if (nodeData !== undefined) {
			if (nodePredicate === undefined || nodePredicate(nodeData)) {
				result.addNode(nodeData);
				includedNodes.add(nodeId);
			}
		}
	}

	// Add edges that pass both endpoint and edge predicates
	for (const edge of graph.edges()) {
		if (!includedNodes.has(edge.source) || !includedNodes.has(edge.target)) {
			continue;
		}
		if (edgePredicate === undefined || edgePredicate(edge)) {
			result.addEdge(edge);
		}
	}

	// Remove isolated nodes if requested
	if (removeIsolated) {
		const isolatedNodes: NodeId[] = [];
		for (const nodeId of result.nodeIds()) {
			if (result.degree(nodeId) === 0) {
				isolatedNodes.push(nodeId);
			}
		}
		for (const nodeId of isolatedNodes) {
			result.removeNode(nodeId);
		}
	}

	return result;
}
