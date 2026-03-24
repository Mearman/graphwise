/**
 * Induced subgraph extraction.
 *
 * Extracts a subgraph containing exactly the specified nodes and all
 * edges between them from the original graph.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";
import { AdjacencyMapGraph } from "../graph/adjacency-map";

/**
 * Extract the induced subgraph containing exactly the specified nodes.
 *
 * The induced subgraph includes all nodes from the input set that exist
 * in the original graph, plus all edges where both endpoints are in the set.
 *
 * @param graph - The source graph
 * @param nodes - Set of node IDs to include in the subgraph
 * @returns A new graph containing the induced subgraph
 *
 * @example
 * ```typescript
 * const subgraph = extractInducedSubgraph(graph, new Set(['A', 'B', 'C']));
 * ```
 */
export function extractInducedSubgraph<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	nodes: ReadonlySet<NodeId>,
): AdjacencyMapGraph<N, E> {
	const result = graph.directed
		? AdjacencyMapGraph.directed<N, E>()
		: AdjacencyMapGraph.undirected<N, E>();

	// Add nodes that exist in both the set and the graph
	for (const nodeId of nodes) {
		const nodeData = graph.getNode(nodeId);
		if (nodeData !== undefined) {
			result.addNode(nodeData);
		}
	}

	// Add edges where both endpoints exist in the result
	for (const edge of graph.edges()) {
		if (result.hasNode(edge.source) && result.hasNode(edge.target)) {
			result.addEdge(edge);
		}
	}

	return result;
}
