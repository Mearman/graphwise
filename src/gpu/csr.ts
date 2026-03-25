/**
 * Compressed Sparse Row (CSR) matrix representation for GPU computation.
 *
 * CSR format is memory-efficient for sparse graphs and maps well to
 * GPU parallel operations. The format stores adjacency information
 * in three arrays: row offsets, column indices, and optional values.
 */

import { d, type TgpuBuffer } from "typegpu";
import type { NodeId, Direction, NodeData, EdgeData } from "../graph/types";
import type { ReadableGraph } from "../graph";
import type { GraphwiseGPURoot } from "./root";

/**
 * CSR matrix representation of a graph adjacency structure.
 *
 * The rowOffsets array has length nodeCount + 1, where rowOffsets[i]
 * gives the start index in colIndices for node i's neighbours.
 * The neighbours of node i are colIndices[rowOffsets[i] : rowOffsets[i+1]].
 */
export interface CSRMatrix {
	/** Row offsets array (length: nodeCount + 1) */
	readonly rowOffsets: Uint32Array;
	/** Column indices array (length: edgeCount for directed, 2*edgeCount for undirected) */
	readonly colIndices: Uint32Array;
	/** Optional edge weights aligned with colIndices */
	readonly values?: Float32Array;
	/** Number of nodes in the graph */
	readonly nodeCount: number;
	/** Number of directed edges (undirected edges counted once) */
	readonly edgeCount: number;
}

/**
 * Mapping from node IDs to CSR indices.
 *
 * Required because CSR uses dense integer indices while graphs
 * may use arbitrary string identifiers.
 */
export interface CSRIndexMap {
	/** Map from NodeId to CSR row index */
	readonly nodeToIndex: ReadonlyMap<NodeId, number>;
	/** Map from CSR row index to NodeId */
	readonly indexToNode: readonly NodeId[];
}

/**
 * Combined CSR matrix with index mapping.
 */
export interface CSRGraph {
	readonly csr: CSRMatrix;
	readonly indexMap: CSRIndexMap;
}

/**
 * Group of TypeGPU typed buffers holding a CSR matrix.
 *
 * Uses TypeGPU's typed buffer API for type-safe GPU computation.
 * Buffers are created with storage usage for compute operations.
 */
export interface TypedBufferGroup {
	/** Buffer containing rowOffsets data (u32 array) */
	readonly rowOffsets: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>>;
	/** Buffer containing colIndices data (u32 array) */
	readonly colIndices: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>>;
	/** Buffer containing values data (f32 array, optional) */
	readonly values?: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.f32>>>;
	/** Number of nodes */
	readonly nodeCount: number;
	/** Number of edges */
	readonly edgeCount: number;
}

/**
 * Convert a ReadableGraph to CSR format.
 *
 * For undirected graphs, each edge is stored twice (once in each direction).
 * For directed graphs, edges are stored in the out-direction by default.
 *
 * @param graph - The graph to convert
 * @param direction - Edge direction to include (default: 'out' for directed, 'both' for undirected)
 * @returns CSR representation with index mapping
 */
export function graphToCSR<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	direction: Direction = graph.directed ? "out" : "both",
): CSRGraph {
	// Build node index mapping
	const nodeToIndex = new Map<NodeId, number>();
	const indexToNode: NodeId[] = [];

	for (const nodeId of graph.nodeIds()) {
		const index = indexToNode.length;
		nodeToIndex.set(nodeId, index);
		indexToNode.push(nodeId);
	}

	const nodeCount = indexToNode.length;

	// Count edges per node to build row offsets
	const degrees = new Uint32Array(nodeCount);

	for (const nodeId of graph.nodeIds()) {
		const srcIndex = nodeToIndex.get(nodeId);
		if (srcIndex === undefined) continue;
		degrees[srcIndex] = graph.degree(nodeId, direction);
	}

	// Calculate total edge count
	let totalEdges = 0;
	for (let i = 0; i < nodeCount; i++) {
		totalEdges += degrees[i] ?? 0;
	}

	// Build rowOffsets array
	const rowOffsets = new Uint32Array(nodeCount + 1);
	for (let i = 0; i < nodeCount; i++) {
		rowOffsets[i + 1] = (rowOffsets[i] ?? 0) + (degrees[i] ?? 0);
	}

	// Build colIndices and values arrays
	const colIndices = new Uint32Array(totalEdges);
	const values = new Float32Array(totalEdges);

	for (const nodeId of graph.nodeIds()) {
		const srcIndex = nodeToIndex.get(nodeId);
		if (srcIndex === undefined) continue;

		const baseOffset = rowOffsets[srcIndex] ?? 0;
		let localOffset = 0;

		for (const neighbourId of graph.neighbours(nodeId, direction)) {
			const dstIndex = nodeToIndex.get(neighbourId);
			if (dstIndex === undefined) continue;

			const edgeIdx = baseOffset + localOffset;
			colIndices[edgeIdx] = dstIndex;

			// Get edge weight if available
			const edge = graph.getEdge(nodeId, neighbourId);
			values[edgeIdx] = edge?.weight ?? 1.0;

			localOffset++;
		}
	}

	const csr: CSRMatrix = {
		rowOffsets,
		colIndices,
		values,
		nodeCount,
		edgeCount: graph.directed ? graph.edgeCount : graph.edgeCount * 2,
	};

	const indexMap: CSRIndexMap = {
		nodeToIndex,
		indexToNode,
	};

	return { csr, indexMap };
}

/**
 * Create TypeGPU typed buffers from a CSR matrix.
 *
 * Uses TypeGPU's typed buffer API for type-safe GPU computation.
 * Buffers are created with storage usage for compute operations.
 *
 * @param root - TypeGPU root instance
 * @param csr - CSR matrix to upload
 * @returns Typed buffer group
 *
 * @example
 * ```typescript
 * import { initGPU, csrToTypedBuffers, graphToCSR } from "graphwise/gpu";
 *
 * const root = await initGPU();
 * const { csr } = graphToCSR(graph);
 * const buffers = csrToTypedBuffers(root, csr);
 *
 * // Read data back to CPU
 * const rowOffsets = await buffers.rowOffsets.read();
 * console.log(rowOffsets); // Uint32Array
 * ```
 */
export function csrToTypedBuffers(
	root: GraphwiseGPURoot,
	csr: CSRMatrix,
): TypedBufferGroup {
	// Convert typed arrays to regular arrays for TypeGPU
	const rowOffsetsArray = Array.from(csr.rowOffsets);
	const colIndicesArray = Array.from(csr.colIndices);

	// Row offsets buffer (u32 array)
	const rowOffsetsBuffer = root
		.createBuffer(d.arrayOf(d.u32, csr.rowOffsets.length), rowOffsetsArray)
		.$usage("storage");

	// Column indices buffer (u32 array)
	const colIndicesBuffer = root
		.createBuffer(d.arrayOf(d.u32, csr.colIndices.length), colIndicesArray)
		.$usage("storage");

	// Values buffer (f32 array, optional)
	if (csr.values !== undefined) {
		const valuesArray = Array.from(csr.values);
		const valuesBuffer = root
			.createBuffer(d.arrayOf(d.f32, csr.values.length), valuesArray)
			.$usage("storage");

		return {
			rowOffsets: rowOffsetsBuffer,
			colIndices: colIndicesBuffer,
			values: valuesBuffer,
			nodeCount: csr.nodeCount,
			edgeCount: csr.edgeCount,
		};
	}

	return {
		rowOffsets: rowOffsetsBuffer,
		colIndices: colIndicesBuffer,
		nodeCount: csr.nodeCount,
		edgeCount: csr.edgeCount,
	};
}
