/**
 * Adjacency map graph implementation.
 *
 * This module provides a flexible graph implementation using nested Maps
 * for efficient adjacency list representation. It supports both directed
 * and undirected graphs with builder pattern for convenient construction.
 */

import type { NodeId, NodeData, EdgeData, Direction } from "./types";
import type { MutableGraph } from "./interfaces";

/**
 * Graph implementation using adjacency map data structure.
 *
 * Uses Map<NodeId, N> for node storage and Map<NodeId, Map<NodeId, E>>
 * for adjacency representation. This provides O(1) average-case lookup
 * for nodes and edges, with memory proportional to V + E.
 *
 * @typeParam N - Node data type, must extend NodeData
 * @typeParam E - Edge data type, must extend EdgeData
 *
 * @example
 * ```typescript
 * // Create a directed citation graph
 * const graph = AdjacencyMapGraph.directed<AuthorNode, CitationEdge>()
 *   .addNode({ id: 'A1', name: 'Alice' })
 *   .addNode({ id: 'B1', name: 'Bob' })
 *   .addEdge({ source: 'A1', target: 'B1', year: 2024 });
 * ```
 */
export class AdjacencyMapGraph<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> implements MutableGraph<N, E> {
	readonly directed: boolean;

	private readonly nodes: Map<NodeId, N>;
	private readonly adjacency: Map<NodeId, Map<NodeId, E>>;
	private readonly reverseAdjacency: Map<NodeId, Map<NodeId, E>> | null;
	private _edgeCount: number;

	private constructor(directed: boolean) {
		this.directed = directed;
		this.nodes = new Map();
		this.adjacency = new Map();
		this.reverseAdjacency = directed ? new Map() : null;
		this._edgeCount = 0;
	}

	/**
	 * Create a new directed graph.
	 *
	 * In a directed graph, edges have direction from source to target.
	 * The `neighbours` method with direction 'out' returns successors,
	 * and direction 'in' returns predecessors.
	 *
	 * @typeParam N - Node data type
	 * @typeParam E - Edge data type
	 * @returns A new empty directed graph
	 */
	static directed<
		N extends NodeData = NodeData,
		E extends EdgeData = EdgeData,
	>(): AdjacencyMapGraph<N, E> {
		return new AdjacencyMapGraph<N, E>(true);
	}

	/**
	 * Create a new undirected graph.
	 *
	 * In an undirected graph, edges have no direction. Adding an edge
	 * from A to B automatically creates the connection from B to A.
	 *
	 * @typeParam N - Node data type
	 * @typeParam E - Edge data type
	 * @returns A new empty undirected graph
	 */
	static undirected<
		N extends NodeData = NodeData,
		E extends EdgeData = EdgeData,
	>(): AdjacencyMapGraph<N, E> {
		return new AdjacencyMapGraph<N, E>(false);
	}

	get nodeCount(): number {
		return this.nodes.size;
	}

	get edgeCount(): number {
		return this._edgeCount;
	}

	hasNode(id: NodeId): boolean {
		return this.nodes.has(id);
	}

	getNode(id: NodeId): N | undefined {
		return this.nodes.get(id);
	}

	/**
	 * Iterate over all node identifiers in the graph.
	 *
	 * @returns An iterable of all node IDs
	 */
	*nodeIds(): Iterable<NodeId> {
		yield* this.nodes.keys();
	}

	neighbours(id: NodeId, direction: Direction = "out"): Iterable<NodeId> {
		if (!this.nodes.has(id)) {
			return [];
		}

		if (this.directed) {
			if (direction === "out") {
				return this.adjacency.get(id)?.keys() ?? [];
			}
			if (direction === "in") {
				return this.reverseAdjacency?.get(id)?.keys() ?? [];
			}
			// direction === 'both'
			return this.iterateBothDirections(id);
		}

		// Undirected: all neighbours are in adjacency
		return this.adjacency.get(id)?.keys() ?? [];
	}

	private *iterateBothDirections(id: NodeId): Iterable<NodeId> {
		const seen = new Set<NodeId>();

		// Yield outgoing neighbours
		const outNeighbours = this.adjacency.get(id);
		if (outNeighbours !== undefined) {
			for (const neighbour of outNeighbours.keys()) {
				if (!seen.has(neighbour)) {
					seen.add(neighbour);
					yield neighbour;
				}
			}
		}

		// Yield incoming neighbours
		const inNeighbours = this.reverseAdjacency?.get(id);
		if (inNeighbours !== undefined) {
			for (const neighbour of inNeighbours.keys()) {
				if (!seen.has(neighbour)) {
					seen.add(neighbour);
					yield neighbour;
				}
			}
		}
	}

	degree(id: NodeId, direction: Direction = "out"): number {
		if (!this.nodes.has(id)) {
			return 0;
		}

		if (this.directed) {
			if (direction === "out") {
				return this.adjacency.get(id)?.size ?? 0;
			}
			if (direction === "in") {
				return this.reverseAdjacency?.get(id)?.size ?? 0;
			}
			// direction === 'both': count unique neighbours
			const outSize = this.adjacency.get(id)?.size ?? 0;
			const inSize = this.reverseAdjacency?.get(id)?.size ?? 0;
			// Simple sum is sufficient as edges are stored separately
			return outSize + inSize;
		}

		// Undirected
		return this.adjacency.get(id)?.size ?? 0;
	}

	getEdge(source: NodeId, target: NodeId): E | undefined {
		// For undirected, try both orders
		const forward = this.adjacency.get(source)?.get(target);
		if (forward !== undefined) {
			return forward;
		}

		if (!this.directed) {
			return this.adjacency.get(target)?.get(source);
		}

		return undefined;
	}

	*edges(): Iterable<E> {
		const emitted = new Set<string>();

		for (const [, neighbours] of this.adjacency) {
			for (const [, edge] of neighbours) {
				if (this.directed) {
					yield edge;
				} else {
					// For undirected, avoid emitting duplicate edges
					const key = this.edgeKey(edge.source, edge.target);
					if (!emitted.has(key)) {
						emitted.add(key);
						yield edge;
					}
				}
			}
		}
	}

	private edgeKey(source: NodeId, target: NodeId): string {
		// Create a canonical key for undirected edges
		const [a, b] = source < target ? [source, target] : [target, source];
		return `${a}::${b}`;
	}

	/**
	 * Add a node to the graph (builder pattern).
	 *
	 * If a node with the same ID already exists, it is not replaced.
	 *
	 * @param node - The node data to add
	 * @returns this (for method chaining)
	 */
	addNode(node: N): this {
		if (!this.nodes.has(node.id)) {
			this.nodes.set(node.id, node);
		}
		return this;
	}

	/**
	 * Add an edge to the graph (builder pattern).
	 *
	 * @param edge - The edge data to add
	 * @returns this (for method chaining)
	 * @throws Error if either endpoint node does not exist
	 */
	addEdge(edge: E): this {
		// Ensure both nodes exist
		if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
			throw new Error(
				`Cannot add edge: nodes ${edge.source} and/or ${edge.target} do not exist`,
			);
		}

		if (!this.directed) {
			// Canonical direction: source < target (prevents duplicate storage)
			const [cSource, cTarget] = edge.source < edge.target
				? [edge.source, edge.target]
				: [edge.target, edge.source];
			// Check if edge already exists before incrementing edgeCount
			const sourceMap = this.adjacency.get(cSource);
			if (sourceMap !== undefined && sourceMap.has(cTarget)) {
				// Edge already exists — update data but don't increment count
				sourceMap.set(cTarget, edge);
				return this;
			}
		}

		// Store in forward adjacency
		let forwardMap = this.adjacency.get(edge.source);
		if (forwardMap === undefined) {
			forwardMap = new Map();
			this.adjacency.set(edge.source, forwardMap);
		}

		const isNewEdge = !forwardMap.has(edge.target);
		forwardMap.set(edge.target, edge);

		if (this.directed) {
			// Store reverse reference for efficient predecessor lookup
			let reverseMap = this.reverseAdjacency?.get(edge.target);
			if (reverseMap === undefined) {
				reverseMap = new Map();
				this.reverseAdjacency?.set(edge.target, reverseMap);
			}
			reverseMap.set(edge.source, edge);
		} else {
			// For undirected, also store in reverse direction
			let reverseMap = this.adjacency.get(edge.target);
			if (reverseMap === undefined) {
				reverseMap = new Map();
				this.adjacency.set(edge.target, reverseMap);
			}
			reverseMap.set(edge.source, edge);
		}

		if (isNewEdge) {
			this._edgeCount++;
		}
		return this;
	}

	removeNode(id: NodeId): boolean {
		if (!this.nodes.has(id)) {
			return false;
		}

		// Remove all outgoing edges from this node
		const outNeighbours = [...(this.adjacency.get(id)?.keys() ?? [])];
		for (const neighbour of outNeighbours) {
			this.removeEdgeInternal(id, neighbour);
		}

		// For directed graphs, also remove incoming edges to this node
		if (this.directed && this.reverseAdjacency !== null) {
			const inNeighbours = [...(this.reverseAdjacency.get(id)?.keys() ?? [])];
			for (const neighbour of inNeighbours) {
				// Remove the edge from neighbour -> id
				this.removeEdgeFromDirected(neighbour, id);
			}
		}

		// Remove the node itself
		this.nodes.delete(id);
		this.adjacency.delete(id);
		this.reverseAdjacency?.delete(id);

		return true;
	}

	/**
	 * Remove an edge from a directed graph, updating both adjacency maps.
	 * This handles the case where we're removing an edge that points TO the removed node.
	 */
	private removeEdgeFromDirected(source: NodeId, target: NodeId): void {
		// Remove from forward adjacency (source -> target)
		const forwardMap = this.adjacency.get(source);
		if (forwardMap?.delete(target) === true) {
			this._edgeCount--;
		}

		// Remove from reverse adjacency
		this.reverseAdjacency?.get(target)?.delete(source);
	}

	private removeEdgeInternal(source: NodeId, target: NodeId): void {
		// Remove from forward adjacency
		const forwardMap = this.adjacency.get(source);
		if (forwardMap?.delete(target) === true) {
			this._edgeCount--;
		}

		if (this.directed) {
			// Remove from reverse adjacency
			this.reverseAdjacency?.get(target)?.delete(source);
		} else {
			// For undirected, remove both directions
			this.adjacency.get(target)?.delete(source);
		}
	}

	removeEdge(source: NodeId, target: NodeId): boolean {
		// Check if edge exists
		if (!this.hasEdgeInternal(source, target)) {
			return false;
		}

		this.removeEdgeInternal(source, target);
		return true;
	}

	private hasEdgeInternal(source: NodeId, target: NodeId): boolean {
		const forward = this.adjacency.get(source)?.has(target) === true;
		if (forward) {
			return true;
		}

		if (!this.directed) {
			return this.adjacency.get(target)?.has(source) === true;
		}

		return false;
	}
}
