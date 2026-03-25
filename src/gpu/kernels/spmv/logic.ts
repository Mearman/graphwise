/**
 * Pure CPU implementation of Sparse Matrix-Vector Multiplication (SpMV).
 *
 * Computes y = A * x where A is a sparse matrix in CSR format.
 * This is the CPU reference implementation extracted from the WGSL kernel.
 *
 * @module gpu/kernels/spmv/logic
 */

/**
 * Compute one row of SpMV: dot product of CSR row with vector x.
 *
 * @param rowOffsets - CSR row offset array
 * @param colIndices - CSR column indices array
 * @param values - Optional edge weights (undefined for unweighted)
 * @param x - Input vector
 * @param row - Row index to compute
 * @returns Dot product for this row
 */
export function spmvRow(
	rowOffsets: Uint32Array,
	colIndices: Uint32Array,
	values: Float32Array | undefined,
	x: Float32Array,
	row: number,
): number {
	const start = rowOffsets[row] ?? 0;
	const end = rowOffsets[row + 1] ?? 0;

	let sum = 0.0;

	for (let i = start; i < end; i++) {
		const col = colIndices[i] ?? 0;
		const weight = values !== undefined ? (values[i] ?? 1.0) : 1.0;
		sum += weight * (x[col] ?? 0);
	}

	return sum;
}

/**
 * Full SpMV: y = A * x where A is in CSR format.
 *
 * @param rowOffsets - CSR row offset array (length: nodeCount + 1)
 * @param colIndices - CSR column indices array
 * @param values - Optional edge weights (undefined for unweighted)
 * @param x - Input vector (length: nodeCount)
 * @param nodeCount - Number of nodes/rows
 * @returns Output vector y (length: nodeCount)
 */
export function spmv(
	rowOffsets: Uint32Array,
	colIndices: Uint32Array,
	values: Float32Array | undefined,
	x: Float32Array,
	nodeCount: number,
): Float32Array {
	const y = new Float32Array(nodeCount);

	for (let row = 0; row < nodeCount; row++) {
		y[row] = spmvRow(rowOffsets, colIndices, values, x, row);
	}

	return y;
}
