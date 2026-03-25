/**
 * Pure CPU implementation of degree histogram computation.
 *
 * Computes degree statistics from CSR format:
 *   - Degree per node from rowOffsets
 *   - Histogram of degree frequencies
 *   - Max, total, and mean degree
 *
 * This is the CPU reference implementation extracted from the WGSL kernel.
 *
 * @module gpu/kernels/degree-histogram/logic
 */

/**
 * Degree statistics for a graph.
 */
export interface DegreeStats {
	/** Degree for each node (length: nodeCount) */
	readonly degrees: Uint32Array;
	/** Histogram of degree frequencies (length: maxDegree + 1) */
	readonly histogram: Uint32Array;
	/** Maximum degree in the graph */
	readonly maxDegree: number;
	/** Sum of all degrees */
	readonly totalDegree: number;
	/** Mean degree (totalDegree / nodeCount) */
	readonly meanDegree: number;
}

/**
 * Compute the degree of a single node from CSR row offsets.
 *
 * @param rowOffsets - CSR row offset array (length: nodeCount + 1)
 * @param node - Node index
 * @returns Degree (number of neighbours) for this node
 */
export function computeDegree(rowOffsets: Uint32Array, node: number): number {
	const start = rowOffsets[node] ?? 0;
	const end = rowOffsets[node + 1] ?? 0;
	return end - start;
}

/**
 * Build degree histogram and statistics from CSR row offsets.
 *
 * @param rowOffsets - CSR row offset array (length: nodeCount + 1)
 * @param nodeCount - Number of nodes
 * @param histogramSize - Size of histogram array (default: auto-computed as maxDegree + 1)
 * @returns Degree statistics including histogram
 */
export function buildDegreeStats(
	rowOffsets: Uint32Array,
	nodeCount: number,
	histogramSize?: number,
): DegreeStats {
	const degrees = new Uint32Array(nodeCount);
	let maxDegree = 0;
	let totalDegree = 0;

	// Compute degrees and track max/total
	for (let node = 0; node < nodeCount; node++) {
		const deg = computeDegree(rowOffsets, node);
		degrees[node] = deg;
		totalDegree += deg;
		if (deg > maxDegree) {
			maxDegree = deg;
		}
	}

	// Build histogram
	const histSize = histogramSize ?? maxDegree + 1;
	const histogram = new Uint32Array(histSize);

	for (let node = 0; node < nodeCount; node++) {
		const deg = degrees[node] ?? 0;
		if (deg < histSize) {
			histogram[deg] = (histogram[deg] ?? 0) + 1;
		}
	}

	const meanDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;

	return {
		degrees,
		histogram,
		maxDegree,
		totalDegree,
		meanDegree,
	};
}
