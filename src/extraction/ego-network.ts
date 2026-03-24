/**
 * Ego-network (k-hop neighbourhood) extraction.
 *
 * Extracts the induced subgraph of all nodes within k hops of a centre node.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";
import { AdjacencyMapGraph } from "../graph/adjacency-map";

/**
 * Options for ego-network extraction.
 */
export interface EgoNetworkOptions {
	/** Number of hops from the centre node. Default: 1. */
	readonly hops?: number;
}

/**
 * Extract the ego-network (k-hop neighbourhood) of a centre node.
 *
 * The ego-network includes all nodes reachable within k hops from the
 * centre node, plus all edges between those nodes (induced subgraph).
 *
 * For directed graphs, the search follows outgoing edges by default.
 * To include incoming edges, use direction 'both' in the underlying traversal.
 *
 * @param graph - The source graph
 * @param centre - The centre node ID
 * @param options - Extraction options
 * @returns An induced subgraph of the k-hop neighbourhood
 * @throws Error if the centre node does not exist in the graph
 *
 * @example
 * ```typescript
 * // 2-hop neighbourhood
 * const ego = extractEgoNetwork(graph, 'A', { hops: 2 });
 * ```
 */
export function extractEgoNetwork<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	centre: NodeId,
	options?: EgoNetworkOptions,
): AdjacencyMapGraph<N, E> {
	const hops = options?.hops ?? 1;

	if (!graph.hasNode(centre)) {
		throw new Error(`Centre node '${centre}' does not exist in the graph`);
	}

	if (hops < 0) {
		throw new Error(`Hops must be non-negative, got ${String(hops)}`);
	}

	// Find all nodes within k hops using BFS
	const nodesInEgoNetwork = new Set<NodeId>([centre]);

	if (hops > 0) {
		const visited = new Set<NodeId>([centre]);
		// Queue entries: [nodeId, distance from centre]
		const queue: [NodeId, number][] = [[centre, 0]];

		while (queue.length > 0) {
			const entry = queue.shift();
			if (entry === undefined) break;
			const [current, distance] = entry;

			if (distance < hops) {
				for (const neighbour of graph.neighbours(current)) {
					if (!visited.has(neighbour)) {
						visited.add(neighbour);
						nodesInEgoNetwork.add(neighbour);
						queue.push([neighbour, distance + 1]);
					}
				}
			}
		}
	}

	// Build induced subgraph
	const result = graph.directed
		? AdjacencyMapGraph.directed<N, E>()
		: AdjacencyMapGraph.undirected<N, E>();

	// Add nodes
	for (const nodeId of nodesInEgoNetwork) {
		const nodeData = graph.getNode(nodeId);
		if (nodeData !== undefined) {
			result.addNode(nodeData);
		}
	}

	// Add edges between nodes in the ego network
	for (const edge of graph.edges()) {
		if (
			nodesInEgoNetwork.has(edge.source) &&
			nodesInEgoNetwork.has(edge.target)
		) {
			result.addEdge(edge);
		}
	}

	return result;
}
