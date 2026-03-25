/**
 * Async graph interfaces for remote/lazy graph data sources.
 *
 * Mirrors ReadableGraph with Promise/AsyncIterable returns.
 * nodeCount and edgeCount are always Promise<number> — the sync
 * wrapper uses Promise.resolve().
 *
 * @module graph/async-interfaces
 */

import type { NodeId, NodeData, EdgeData, Direction } from "./types";

/**
 * Async read-only interface for graph traversal and queries.
 *
 * Mirrors ReadableGraph but all operations return Promises or AsyncIterables,
 * enabling use with remote graph data sources where each operation may
 * require a network fetch.
 */
export interface AsyncReadableGraph<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> {
	/** Whether the graph is directed (true) or undirected (false) */
	readonly directed: boolean;

	/** Total number of nodes in the graph */
	readonly nodeCount: Promise<number>;

	/** Total number of edges in the graph */
	readonly edgeCount: Promise<number>;

	/** Check if a node exists in the graph. */
	hasNode(id: NodeId): Promise<boolean>;

	/** Retrieve node data by identifier. */
	getNode(id: NodeId): Promise<N | undefined>;

	/** Iterate over all node identifiers in the graph. */
	nodeIds(): AsyncIterable<NodeId>;

	/** Get neighbouring node identifiers in the specified direction. */
	neighbours(id: NodeId, direction?: Direction): AsyncIterable<NodeId>;

	/** Get the degree (number of connected edges) for a node. */
	degree(id: NodeId, direction?: Direction): Promise<number>;

	/** Retrieve edge data between two nodes. */
	getEdge(source: NodeId, target: NodeId): Promise<E | undefined>;

	/** Iterate over all edges in the graph. */
	edges(): AsyncIterable<E>;
}
