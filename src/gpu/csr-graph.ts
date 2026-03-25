/**
 * CSR-backed read-only graph implementation.
 *
 * Provides a cache-friendly ReadableGraph backed by Compressed Sparse Row
 * arrays. Neighbourhood lookups are O(1) slices; perfect for algorithms
 * that make many repeated queries on large static graphs.
 *
 * Node and edge data are not stored (CSR is topology-only), so `getNode`
 * and `getEdge` always return undefined. For data-aware algorithms, wrap
 * in a composite that delegates data lookups to a separate store.
 */

import type { NodeId, Direction, NodeData, EdgeData } from "../graph/types";
import type { ReadableGraph } from "../graph";
import type { CSRGraph, CSRIndexMap, CSRMatrix } from "./csr";

/**
 * A ReadableGraph implementation backed by CSR arrays.
 *
 * All neighbourhood and degree queries use CSR row slices (O(1) slice + O(k) iteration
 * where k is neighbourhood size). This is significantly faster than hash map lookups
 * on large graphs, especially when the same nodes are queried multiple times.
 *
 * @typeParam N - Node data type (not stored; always returns undefined from getNode)
 * @typeParam E - Edge data type (not stored; always returns undefined from getEdge)
 */
export class CSRReadableGraph<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> implements ReadableGraph<N, E> {
	private readonly csr: CSRMatrix;
	private readonly indexMap: CSRIndexMap;
	private readonly isDirected: boolean;

	/**
	 * Create a CSR-backed graph from CSR structures.
	 *
	 * @param csr - CSR matrix (rowOffsets, colIndices)
	 * @param indexMap - Node ID ↔ CSR index mapping
	 * @param directed - Whether the graph is directed
	 */
	private constructor(
		csr: CSRMatrix,
		indexMap: CSRIndexMap,
		directed: boolean,
	) {
		this.csr = csr;
		this.indexMap = indexMap;
		this.isDirected = directed;
	}

	/**
	 * Create a CSR-backed graph from any ReadableGraph.
	 *
	 * Converts the graph to CSR format (O(V + E) time) and returns a
	 * CSRReadableGraph wrapping the result.
	 *
	 * @param graph - Graph to convert
	 * @param direction - Edge direction for CSR (default: 'out' for directed, 'both' for undirected)
	 * @returns CSRReadableGraph with identical topology
	 *
	 * @example
	 * ```typescript
	 * const original = AdjacencyMapGraph.undirected();
	 * // ... add nodes and edges ...
	 *
	 * const csr = CSRReadableGraph.from(original);
	 *
	 * // All operations on csr are identical to original but faster
	 * assert.deepEqual(
	 *   [...csr.neighbours('A')],
	 *   [...original.neighbours('A')]
	 * );
	 * ```
	 */
	static from<N extends NodeData, E extends EdgeData>(
		graph: ReadableGraph<N, E>,
		direction: Direction = graph.directed ? "out" : "both",
	): CSRReadableGraph<N, E> {
		const nodeToIndex = new Map<NodeId, number>();
		const indexToNode: NodeId[] = [];

		for (const nodeId of graph.nodeIds()) {
			const index = indexToNode.length;
			nodeToIndex.set(nodeId, index);
			indexToNode.push(nodeId);
		}

		const nodeCount = indexToNode.length;

		// Count edges per node
		const degrees = new Uint32Array(nodeCount);
		for (const nodeId of graph.nodeIds()) {
			const srcIndex = nodeToIndex.get(nodeId);
			if (srcIndex === undefined) continue;
			degrees[srcIndex] = graph.degree(nodeId, direction);
		}

		// Build rowOffsets
		const rowOffsets = new Uint32Array(nodeCount + 1);
		for (let i = 0; i < nodeCount; i++) {
			rowOffsets[i + 1] = (rowOffsets[i] ?? 0) + (degrees[i] ?? 0);
		}

		const totalEdges = rowOffsets[nodeCount] ?? 0;

		// Build colIndices
		const colIndices = new Uint32Array(totalEdges);

		for (const nodeId of graph.nodeIds()) {
			const srcIndex = nodeToIndex.get(nodeId);
			if (srcIndex === undefined) continue;

			const baseOffset = rowOffsets[srcIndex] ?? 0;
			let localOffset = 0;

			for (const neighbourId of graph.neighbours(nodeId, direction)) {
				const dstIndex = nodeToIndex.get(neighbourId);
				if (dstIndex === undefined) continue;

				colIndices[baseOffset + localOffset] = dstIndex;
				localOffset++;
			}
		}

		const csr: CSRMatrix = {
			rowOffsets,
			colIndices,
			nodeCount,
			edgeCount: graph.directed ? graph.edgeCount : graph.edgeCount * 2,
		};

		const indexMap: CSRIndexMap = {
			nodeToIndex,
			indexToNode,
		};

		return new CSRReadableGraph(csr, indexMap, graph.directed);
	}

	/**
	 * Access the underlying CSR matrix and index map.
	 *
	 * Useful for GPU operations that need direct CSR data.
	 */
	get data(): CSRGraph {
		return {
			csr: this.csr,
			indexMap: this.indexMap,
		};
	}

	get directed(): boolean {
		return this.isDirected;
	}

	get nodeCount(): number {
		return this.csr.nodeCount;
	}

	get edgeCount(): number {
		return this.csr.edgeCount;
	}

	hasNode(id: NodeId): boolean {
		return this.indexMap.nodeToIndex.has(id);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	getNode(_id: NodeId): undefined {
		// CSR stores topology only, no node data
		return undefined;
	}

	*nodeIds(): Iterable<NodeId> {
		for (const nodeId of this.indexMap.indexToNode) {
			yield nodeId;
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	*neighbours(id: NodeId, _direction?: Direction): Iterable<NodeId> {
		const srcIdx = this.indexMap.nodeToIndex.get(id);
		if (srcIdx === undefined) return;

		const { rowOffsets, colIndices } = this.csr;
		const start = rowOffsets[srcIdx] ?? 0;
		const end = rowOffsets[srcIdx + 1] ?? 0;

		// For CSR backed by 'both' direction in undirected graphs, all entries
		// are already bidirectional. Otherwise respect the direction parameter.
		// (CSR format was built with the specified direction, so we just iterate.)

		for (let i = start; i < end; i++) {
			const dstIdx = colIndices[i];
			if (dstIdx !== undefined) {
				const nodeId = this.indexMap.indexToNode[dstIdx];
				if (nodeId !== undefined) {
					yield nodeId;
				}
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	degree(id: NodeId, _direction?: Direction): number {
		const idx = this.indexMap.nodeToIndex.get(id);
		if (idx === undefined) return 0;

		const { rowOffsets } = this.csr;
		return (rowOffsets[idx + 1] ?? 0) - (rowOffsets[idx] ?? 0);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	getEdge(_source: NodeId, _target: NodeId): undefined {
		// CSR stores topology only, no edge data
		return undefined;
	}

	*edges(): Iterable<E> {
		// No edges can be returned because we have no edge data
	}
}
