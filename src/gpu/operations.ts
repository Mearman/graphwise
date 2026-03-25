/**
 * High-level GPU operations for graph algorithms.
 *
 * These functions accept ReadableGraph instances and handle CSR conversion
 * internally, providing a simple API for GPU-accelerated graph operations.
 *
 * @module gpu/operations
 */

import type { NodeData, EdgeData, NodeId, ReadableGraph } from "../graph";
import type { ComputeResult, GPUComputeOptions } from "./types";
import { withBackend, type DispatchOptions } from "./dispatch";
import { graphToCSR, csrToTypedBuffers } from "./csr";
import { dispatchSpmv } from "./kernels/spmv/kernel";
import { dispatchPagerank } from "./kernels/pagerank/kernel";
import { dispatchJaccard } from "./kernels/jaccard/kernel";
import { dispatchDegreeHistogram } from "./kernels/degree-histogram/kernel";
import type { GraphwiseGPURoot } from "./root";
import { d } from "typegpu";

/**
 * Degree statistics from histogram computation.
 */
export interface DegreeStats {
	/** Minimum degree in the graph */
	readonly min: number;
	/** Maximum degree in the graph */
	readonly max: number;
	/** Average degree */
	readonly mean: number;
	/** Histogram of degree frequencies (index = degree, value = count) */
	readonly histogram: readonly number[];
}

/**
 * Sparse matrix-vector multiply on GPU.
 *
 * Computes y = A * x where A is the graph adjacency matrix in CSR format.
 *
 * @param graph - Input graph
 * @param x - Input vector (must have length = graph.nodeCount)
 * @param options - Compute options (backend, root, signal)
 * @returns Result vector y
 */
export async function gpuSpmv<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	x: Float32Array,
	options?: GPUComputeOptions & { signal?: AbortSignal },
): Promise<ComputeResult<Float32Array>> {
	const nodeCount = graph.nodeCount;

	if (x.length !== nodeCount) {
		throw new Error(
			`Input vector length (${String(x.length)}) must match node count (${String(nodeCount)})`,
		);
	}

	const cpuFn = (): Float32Array => {
		const { csr } = graphToCSR(graph);
		const y = new Float32Array(nodeCount);

		for (let row = 0; row < nodeCount; row++) {
			const start = csr.rowOffsets[row] ?? 0;
			const end = csr.rowOffsets[row + 1] ?? 0;
			let sum = 0;

			for (let i = start; i < end; i++) {
				const col = csr.colIndices[i] ?? 0;
				const weight = csr.values?.[i] ?? 1;
				sum += weight * (x[col] ?? 0);
			}

			y[row] = sum;
		}

		return y;
	};

	const gpuFn = async (root: GraphwiseGPURoot): Promise<Float32Array> => {
		const { csr } = graphToCSR(graph);
		const csrBuffers = csrToTypedBuffers(root, csr);

		const xBuffer = root
			.createBuffer(d.arrayOf(d.f32, nodeCount), Array.from(x))
			.$usage("storage");

		const yBuffer = root
			.createBuffer(d.arrayOf(d.f32, nodeCount))
			.$usage("storage");

		dispatchSpmv(
			root,
			csrBuffers,
			xBuffer,
			yBuffer,
			nodeCount,
			csr.values !== undefined,
		);

		const result = await yBuffer.read();
		return new Float32Array(result);
	};

	const dispatchOpts: DispatchOptions = {
		backend: options?.backend,
		root: options?.root,
		signal: options?.signal,
	};

	return withBackend(dispatchOpts, cpuFn, gpuFn);
}

/**
 * PageRank via GPU-accelerated power iteration.
 *
 * @param graph - Input graph (will be converted to transpose CSR for in-edges)
 * @param options - Compute options plus damping factor and iteration count
 * @returns PageRank scores for each node
 */
export async function gpuPageRank<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	options?: GPUComputeOptions & {
		damping?: number;
		iterations?: number;
		signal?: AbortSignal;
	},
): Promise<ComputeResult<Float32Array>> {
	const nodeCount = graph.nodeCount;
	const damping = options?.damping ?? 0.85;
	const iterations = options?.iterations ?? 20;

	const cpuFn = (): Float32Array => {
		// Build transpose CSR (in-edges) for PageRank
		const { csr } = graphToCSR(graph);
		const ranks = new Float32Array(nodeCount).fill(1 / nodeCount);
		const outDegrees = new Uint32Array(nodeCount);

		// Compute out-degrees
		for (let i = 0; i < nodeCount; i++) {
			outDegrees[i] = (csr.rowOffsets[i + 1] ?? 0) - (csr.rowOffsets[i] ?? 0);
		}

		// Power iteration
		for (let iter = 0; iter < iterations; iter++) {
			const newRanks = new Float32Array(nodeCount);

			for (let v = 0; v < nodeCount; v++) {
				const start = csr.rowOffsets[v] ?? 0;
				const end = csr.rowOffsets[v + 1] ?? 0;
				let contribution = 0;

				for (let i = start; i < end; i++) {
					const source = csr.colIndices[i] ?? 0;
					const deg = outDegrees[source] ?? 0;
					if (deg > 0) {
						contribution += (ranks[source] ?? 0) / deg;
					}
				}

				newRanks[v] = (1 - damping) / nodeCount + damping * contribution;
			}

			ranks.set(newRanks);
		}

		return ranks;
	};

	const gpuFn = async (root: GraphwiseGPURoot): Promise<Float32Array> => {
		const { csr } = graphToCSR(graph);
		const csrBuffers = csrToTypedBuffers(root, csr);

		// Compute out-degrees
		const outDegrees = new Uint32Array(nodeCount);
		for (let i = 0; i < nodeCount; i++) {
			outDegrees[i] = (csr.rowOffsets[i + 1] ?? 0) - (csr.rowOffsets[i] ?? 0);
		}

		const outDegreesBuffer = root
			.createBuffer(d.arrayOf(d.u32, nodeCount), Array.from(outDegrees))
			.$usage("storage");

		const ranksBuffer = root
			.createBuffer(
				d.arrayOf(d.f32, nodeCount),
				Array.from(new Float32Array(nodeCount).fill(1 / nodeCount)),
			)
			.$usage("storage");

		const newRanksBuffer = root
			.createBuffer(d.arrayOf(d.f32, nodeCount))
			.$usage("storage");

		// Power iteration
		for (let iter = 0; iter < iterations; iter++) {
			dispatchPagerank(
				root,
				csrBuffers,
				ranksBuffer,
				outDegreesBuffer,
				newRanksBuffer,
				nodeCount,
				damping,
			);

			// Swap buffers by copying data back
			const newRanks = await newRanksBuffer.read();
			ranksBuffer.write(Array.from(newRanks));
		}

		const result = await ranksBuffer.read();
		return new Float32Array(result);
	};

	const dispatchOpts: DispatchOptions = {
		backend: options?.backend,
		root: options?.root,
		signal: options?.signal,
	};

	return withBackend(dispatchOpts, cpuFn, gpuFn);
}

/**
 * Batch Jaccard similarity for node pairs on GPU.
 *
 * @param graph - Input graph
 * @param pairs - Array of [u, v] node ID pairs
 * @param options - Compute options
 * @returns Jaccard coefficients for each pair
 */
export async function gpuJaccardBatch<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	pairs: readonly [NodeId, NodeId][],
	options?: GPUComputeOptions & { signal?: AbortSignal },
): Promise<ComputeResult<Float32Array>> {
	const pairCount = pairs.length;
	const { indexMap } = graphToCSR(graph);

	const cpuFn = (): Float32Array => {
		const { csr } = graphToCSR(graph);
		const results = new Float32Array(pairCount);

		for (let p = 0; p < pairCount; p++) {
			const pair = pairs[p];
			if (pair === undefined) continue;
			const [u, v] = pair;
			const uIdx = indexMap.nodeToIndex.get(u);
			const vIdx = indexMap.nodeToIndex.get(v);

			if (uIdx === undefined || vIdx === undefined) {
				results[p] = 0;
				continue;
			}

			const uStart = csr.rowOffsets[uIdx] ?? 0;
			const uEnd = csr.rowOffsets[uIdx + 1] ?? 0;
			const vStart = csr.rowOffsets[vIdx] ?? 0;
			const vEnd = csr.rowOffsets[vIdx + 1] ?? 0;

			const uNeighbours = new Set(
				Array.from(csr.colIndices.slice(uStart, uEnd)),
			);
			const vNeighbours = new Set(
				Array.from(csr.colIndices.slice(vStart, vEnd)),
			);

			let intersection = 0;
			for (const n of uNeighbours) {
				if (vNeighbours.has(n)) {
					intersection++;
				}
			}

			const union = uNeighbours.size + vNeighbours.size - intersection;
			results[p] = union > 0 ? intersection / union : 0;
		}

		return results;
	};

	const gpuFn = async (root: GraphwiseGPURoot): Promise<Float32Array> => {
		const { csr } = graphToCSR(graph);
		const csrBuffers = csrToTypedBuffers(root, csr);

		const pairsU = new Uint32Array(pairCount);
		const pairsV = new Uint32Array(pairCount);

		for (let i = 0; i < pairCount; i++) {
			const pair = pairs[i];
			if (pair === undefined) continue;
			const uIdx = indexMap.nodeToIndex.get(pair[0]);
			const vIdx = indexMap.nodeToIndex.get(pair[1]);
			pairsU[i] = uIdx ?? 0;
			pairsV[i] = vIdx ?? 0;
		}

		const pairsUBuffer = root
			.createBuffer(d.arrayOf(d.u32, pairCount), Array.from(pairsU))
			.$usage("storage");

		const pairsVBuffer = root
			.createBuffer(d.arrayOf(d.u32, pairCount), Array.from(pairsV))
			.$usage("storage");

		const resultsBuffer = root
			.createBuffer(d.arrayOf(d.f32, pairCount))
			.$usage("storage");

		dispatchJaccard(
			root,
			csrBuffers,
			pairsUBuffer,
			pairsVBuffer,
			resultsBuffer,
			pairCount,
		);

		const result = await resultsBuffer.read();
		return new Float32Array(result);
	};

	const dispatchOpts: DispatchOptions = {
		backend: options?.backend,
		root: options?.root,
		signal: options?.signal,
	};

	return withBackend(dispatchOpts, cpuFn, gpuFn);
}

/**
 * BFS level assignment from source node on GPU.
 *
 * Note: Full GPU BFS requires atomics not yet available in TypeGPU.
 * This implementation uses CPU for now but maintains the API.
 *
 * @param graph - Input graph
 * @param source - Source node ID
 * @param options - Compute options
 * @returns BFS level for each node (-1 for unreachable)
 */
export async function gpuBfsLevels<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: NodeId,
	options?: GPUComputeOptions & { signal?: AbortSignal },
): Promise<ComputeResult<Int32Array>> {
	const nodeCount = graph.nodeCount;
	const { indexMap } = graphToCSR(graph);

	const cpuFn = (): Int32Array => {
		const { csr } = graphToCSR(graph);
		const levels = new Int32Array(nodeCount).fill(-1);
		const visited = new Uint8Array(nodeCount);

		// Find source index
		const sourceIndex = indexMap.nodeToIndex.get(source);
		if (sourceIndex === undefined) {
			throw new Error(`Source node ${source} not found in graph`);
		}

		const queue: number[] = [sourceIndex];
		levels[sourceIndex] = 0;
		visited[sourceIndex] = 1;

		while (queue.length > 0) {
			const current = queue.shift();
			if (current === undefined) break;
			const currentLevel = levels[current] ?? 0;

			const start = csr.rowOffsets[current] ?? 0;
			const end = csr.rowOffsets[current + 1] ?? 0;

			for (let i = start; i < end; i++) {
				const neighbour = csr.colIndices[i] ?? 0;
				if (visited[neighbour] === 0) {
					visited[neighbour] = 1;
					levels[neighbour] = currentLevel + 1;
					queue.push(neighbour);
				}
			}
		}

		return levels;
	};

	const gpuFn = (_root: GraphwiseGPURoot): Int32Array => {
		// BFS requires atomics not yet in TypeGPU - use CPU
		// _root is intentionally unused as we fall back to CPU implementation
		void _root;
		return cpuFn();
	};

	const dispatchOpts: DispatchOptions = {
		backend: options?.backend,
		root: options?.root,
		signal: options?.signal,
	};

	return withBackend(dispatchOpts, cpuFn, gpuFn);
}

/**
 * Degree histogram and statistics on GPU.
 *
 * @param graph - Input graph
 * @param options - Compute options
 * @returns Degree statistics with histogram
 */
export async function gpuDegreeHistogram<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: ReadableGraph<N, E>,
	options?: GPUComputeOptions & { signal?: AbortSignal },
): Promise<ComputeResult<DegreeStats>> {
	const nodeCount = graph.nodeCount;

	const cpuFn = (): DegreeStats => {
		const { csr } = graphToCSR(graph);
		const degrees = new Uint32Array(nodeCount);

		for (let i = 0; i < nodeCount; i++) {
			degrees[i] = (csr.rowOffsets[i + 1] ?? 0) - (csr.rowOffsets[i] ?? 0);
		}

		const max = degrees.length > 0 ? Math.max(...degrees) : 0;
		const histogram: number[] = Array.from({ length: max + 1 }, () => 0);

		let sum = 0;
		let min = Infinity;

		for (const d of degrees) {
			histogram[d] = (histogram[d] ?? 0) + 1;
			sum += d;
			if (d < min) min = d;
		}

		if (degrees.length === 0) {
			min = 0;
		}

		return {
			min,
			max,
			mean: nodeCount > 0 ? sum / nodeCount : 0,
			histogram,
		};
	};

	const gpuFn = async (root: GraphwiseGPURoot): Promise<DegreeStats> => {
		const { csr } = graphToCSR(graph);
		const csrBuffers = csrToTypedBuffers(root, csr);

		const degreesBuffer = root
			.createBuffer(d.arrayOf(d.u32, nodeCount))
			.$usage("storage");

		dispatchDegreeHistogram(root, csrBuffers, degreesBuffer, nodeCount);

		const degrees = await degreesBuffer.read();

		// Build histogram on CPU (atomic reduction not in TypeGPU yet)
		const max = degrees.length > 0 ? Math.max(...degrees) : 0;
		const histogram: number[] = Array.from({ length: max + 1 }, () => 0);

		let sum = 0;
		let min = Infinity;

		for (const d of degrees) {
			histogram[d] = (histogram[d] ?? 0) + 1;
			sum += d;
			if (d < min) min = d;
		}

		if (degrees.length === 0) {
			min = 0;
		}

		return {
			min,
			max,
			mean: nodeCount > 0 ? sum / nodeCount : 0,
			histogram,
		};
	};

	const dispatchOpts: DispatchOptions = {
		backend: options?.backend,
		root: options?.root,
		signal: options?.signal,
	};

	return withBackend(dispatchOpts, cpuFn, gpuFn);
}
