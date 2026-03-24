/**
 * Compressed Sparse Row (CSR) matrix representation for GPU computation.
 *
 * CSR format is memory-efficient for sparse graphs and maps well to
 * GPU parallel operations. The format stores adjacency information
 * in three arrays: row offsets, column indices, and optional values.
 */

import type { NodeId, Direction, NodeData, EdgeData } from "../graph/types";
import type { ReadableGraph } from "../graph";

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
 * Group of GPU buffers holding a CSR matrix.
 *
 * Each buffer is created with appropriate usage flags for compute operations.
 */
export interface GPUBufferGroup {
	/** Buffer containing rowOffsets data */
	readonly rowOffsets: GPUBuffer;
	/** Buffer containing colIndices data */
	readonly colIndices: GPUBuffer;
	/** Buffer containing values data (optional) */
	readonly values?: GPUBuffer;
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
 * Create GPU buffers from a CSR matrix.
 *
 * Buffers are created with:
 * - rowOffsets/colIndices: STORAGE | COPY_DST
 * - values: STORAGE | COPY_DST (if present)
 *
 * @param device - GPU device to create buffers on
 * @param csr - CSR matrix to upload
 * @returns GPU buffer group
 */
export function csrToGPUBuffers(
	device: GPUDevice,
	csr: CSRMatrix,
): GPUBufferGroup {
	// Row offsets buffer
	const rowOffsetsBuffer = device.createBuffer({
		size: csr.rowOffsets.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		mappedAtCreation: false,
	});
	device.queue.writeBuffer(rowOffsetsBuffer, 0, csr.rowOffsets);

	// Column indices buffer
	const colIndicesBuffer = device.createBuffer({
		size: csr.colIndices.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		mappedAtCreation: false,
	});
	device.queue.writeBuffer(colIndicesBuffer, 0, csr.colIndices);

	// Values buffer (optional)
	let valuesBuffer: GPUBuffer | undefined;
	if (csr.values !== undefined) {
		valuesBuffer = device.createBuffer({
			size: csr.values.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			mappedAtCreation: false,
		});
		device.queue.writeBuffer(valuesBuffer, 0, csr.values);
	}

	return {
		rowOffsets: rowOffsetsBuffer,
		colIndices: colIndicesBuffer,
		values: valuesBuffer,
		nodeCount: csr.nodeCount,
		edgeCount: csr.edgeCount,
	};
}

/**
 * Create a result buffer for reading compute output.
 *
 * @param device - GPU device
 * @param byteLength - Size of the buffer in bytes
 * @returns GPU buffer configured for map reading
 */
export function createResultBuffer(
	device: GPUDevice,
	byteLength: number,
): GPUBuffer {
	return device.createBuffer({
		size: byteLength,
		usage:
			GPUBufferUsage.STORAGE |
			GPUBufferUsage.COPY_SRC |
			GPUBufferUsage.MAP_READ,
	});
}

/**
 * Read data from a GPU buffer to CPU.
 *
 * @param device - GPU device
 * @param buffer - Buffer to read from
 * @returns ArrayBuffer containing the buffer data
 */
export async function readBufferToCPU(
	device: GPUDevice,
	buffer: GPUBuffer,
): Promise<ArrayBuffer> {
	await buffer.mapAsync(GPUMapMode.READ);
	const data = buffer.getMappedRange().slice(0);
	buffer.unmap();
	return data;
}
