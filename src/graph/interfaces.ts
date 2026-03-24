/**
 * Core graph interfaces defining the contract for graph implementations.
 *
 * These interfaces separate the read and write concerns, allowing algorithms
 * to declare their minimal requirements. The design prioritises:
 * - Lazy evaluation via Iterables for memory efficiency
 * - Immutability for read operations
 * - Clear separation between read-only and mutable graphs
 */

import type { NodeId, NodeData, EdgeData, Direction } from "./types";

/**
 * Minimal read-only interface for graph traversal and queries.
 *
 * This interface defines the operations needed by most graph algorithms.
 * Implementations should provide lazy iteration via Iterable returns to
 * support efficient processing of large graphs.
 *
 * @typeParam N - Node data type, must extend NodeData
 * @typeParam E - Edge data type, must extend EdgeData
 */
export interface ReadableGraph<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> {
	/** Whether the graph is directed (true) or undirected (false) */
	readonly directed: boolean;

	/** Total number of nodes in the graph */
	readonly nodeCount: number;

	/** Total number of edges in the graph */
	readonly edgeCount: number;

	/**
	 * Check if a node exists in the graph.
	 *
	 * @param id - The node identifier to check
	 * @returns true if the node exists, false otherwise
	 */
	hasNode(id: NodeId): boolean;

	/**
	 * Retrieve node data by identifier.
	 *
	 * @param id - The node identifier
	 * @returns The node data if found, undefined otherwise
	 */
	getNode(id: NodeId): N | undefined;

	/**
	 * Iterate over all node identifiers in the graph.
	 *
	 * @returns An iterable of all node IDs
	 */
	nodeIds(): Iterable<NodeId>;

	/**
	 * Get neighbouring node identifiers in the specified direction.
	 *
	 * For undirected graphs, direction is ignored and all adjacent nodes
	 * are returned regardless of the parameter value.
	 *
	 * @param id - The node identifier to query neighbours for
	 * @param direction - Edge direction to consider (default: 'out')
	 * @returns An iterable of neighbouring node IDs
	 */
	neighbours(id: NodeId, direction?: Direction): Iterable<NodeId>;

	/**
	 * Get the degree (number of connected edges) for a node.
	 *
	 * For undirected graphs, direction is ignored.
	 *
	 * @param id - The node identifier
	 * @param direction - Edge direction to consider (default: 'out')
	 * @returns The degree count, or 0 if the node does not exist
	 */
	degree(id: NodeId, direction?: Direction): number;

	/**
	 * Retrieve edge data between two nodes.
	 *
	 * For undirected graphs, the order of source and target does not matter.
	 *
	 * @param source - Source node identifier
	 * @param target - Target node identifier
	 * @returns The edge data if found, undefined otherwise
	 */
	getEdge(source: NodeId, target: NodeId): E | undefined;

	/**
	 * Iterate over all edges in the graph.
	 *
	 * @returns An iterable of all edge data
	 */
	edges(): Iterable<E>;
}

/**
 * Mutable graph interface extending read operations with modification methods.
 *
 * This interface supports building and modifying graphs. All mutation methods
 * return void and modify the graph in place.
 *
 * @typeParam N - Node data type, must extend NodeData
 * @typeParam E - Edge data type, must extend EdgeData
 */
export interface MutableGraph<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> extends ReadableGraph<N, E> {
	/**
	 * Add a node to the graph.
	 *
	 * If a node with the same ID already exists, the behaviour is implementation-defined.
	 * Implementations may overwrite, ignore, or throw an error.
	 *
	 * @param node - The node data to add
	 */
	addNode(node: N): void;

	/**
	 * Add an edge to the graph.
	 *
	 * If either endpoint node does not exist, the behaviour is implementation-defined.
	 * Implementations may auto-create nodes, ignore the edge, or throw an error.
	 * If an edge between the same nodes already exists, the behaviour is also
	 * implementation-defined (overwrite, ignore, or throw).
	 *
	 * @param edge - The edge data to add
	 */
	addEdge(edge: E): void;

	/**
	 * Remove a node and all its incident edges from the graph.
	 *
	 * @param id - The node identifier to remove
	 * @returns true if the node was removed, false if it did not exist
	 */
	removeNode(id: NodeId): boolean;

	/**
	 * Remove an edge from the graph.
	 *
	 * For undirected graphs, the order of source and target does not matter.
	 *
	 * @param source - Source node identifier
	 * @param target - Target node identifier
	 * @returns true if the edge was removed, false if it did not exist
	 */
	removeEdge(source: NodeId, target: NodeId): boolean;
}
