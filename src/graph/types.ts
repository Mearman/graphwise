/**
 * Core type definitions for graph data structures.
 *
 * These types form the foundation for all graph operations in the library.
 * They are designed to be minimal yet extensible through index signatures.
 */

/**
 * Unique identifier for a node in the graph.
 * Represented as a string for flexibility and serialisation compatibility.
 */
export type NodeId = string;

/**
 * Direction for neighbour and degree queries.
 * - 'in': incoming edges (predecessors)
 * - 'out': outgoing edges (successors)
 * - 'both': all adjacent nodes
 */
export type Direction = "in" | "out" | "both";

/**
 * Base interface for node data stored in the graph.
 *
 * All nodes must have an `id` property. Additional properties can be
 * added through the index signature for custom metadata.
 *
 * @example
 * ```typescript
 * interface AuthorNode extends NodeData {
 *   type: 'author';
 *   name: string;
 *   orcid?: string;
 * }
 * ```
 */
export interface NodeData {
	/** Unique identifier for this node */
	readonly id: NodeId;
	/** Optional type discriminator for polymorphic node handling */
	readonly type?: string;
	/** Optional weight for weighted graph algorithms */
	readonly weight?: number;
	/** Allow additional custom properties */
	[key: string]: unknown;
}

/**
 * Base interface for edge data stored in the graph.
 *
 * Edges connect two nodes and may carry additional metadata.
 * For undirected graphs, the order of `source` and `target` is
 * semantically irrelevant but must still be specified.
 *
 * @example
 * ```typescript
 * interface CitationEdge extends EdgeData {
 *   type: 'cites';
 *   year: number;
 *   context?: string;
 * }
 * ```
 */
export interface EdgeData {
	/** Source node identifier */
	readonly source: NodeId;
	/** Target node identifier */
	readonly target: NodeId;
	/** Optional weight for weighted graph algorithms */
	readonly weight?: number;
	/** Optional type discriminator for polymorphic edge handling */
	readonly type?: string;
	/** Allow additional custom properties */
	[key: string]: unknown;
}
