/**
 * TypeGPU compute kernel for Sparse Matrix-Vector Multiplication (SpMV).
 *
 * Computes y = A * x where A is a sparse matrix in CSR format.
 * Uses TypeGPU's compute pipeline for parallel GPU execution.
 *
 * @module gpu/kernels/spmv/kernel
 */

import tgpu, { d, type StorageFlag, type TgpuBuffer } from "typegpu";
import type { TypedBufferGroup } from "../../csr";
import type { GraphwiseGPURoot } from "../../root";

/**
 * Bind group layout for SpMV kernel.
 */
const SpMVLayout = tgpu.bindGroupLayout({
	rowOffsets: { storage: d.arrayOf(d.u32) },
	colIndices: { storage: d.arrayOf(d.u32) },
	values: { storage: d.arrayOf(d.f32) },
	x: { storage: d.arrayOf(d.f32) },
	y: { storage: d.arrayOf(d.f32), access: "mutable" },
	nodeCount: { uniform: d.u32 },
	hasValues: { uniform: d.u32 },
});

/**
 * SpMV compute pipeline: y[row] = sum(A[row,col] * x[col]).
 *
 * Each thread computes one row of the output vector using the CSR format:
 * - rowOffsets: start/end indices for each row
 * - colIndices: column index for each non-zero entry
 * - values: edge weights (optional, defaults to 1.0)
 */
const spmvPipeline = (row: number): void => {
	"use gpu";
	const start = SpMVLayout.$.rowOffsets[row] ?? 0;
	const end = SpMVLayout.$.rowOffsets[row + 1] ?? 0;

	let sum = 0.0;
	for (let i = start; i < end; i = i + 1) {
		const col = SpMVLayout.$.colIndices[i] ?? 0;
		const weight =
			SpMVLayout.$.hasValues !== 0 ? (SpMVLayout.$.values[i] ?? 1.0) : 1.0;
		sum = sum + weight * (SpMVLayout.$.x[col] ?? 0.0);
	}
	SpMVLayout.$.y[row] = sum;
};

/**
 * Dispatch SpMV on GPU.
 *
 * @param root - TypeGPU root instance
 * @param csrBuffers - CSR matrix as typed buffers
 * @param x - Input vector buffer
 * @param y - Output vector buffer (mutable)
 * @param nodeCount - Number of nodes/rows
 * @param hasValues - Whether edge weights are present
 */
export function dispatchSpmv(
	root: GraphwiseGPURoot,
	csrBuffers: TypedBufferGroup,
	x: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.f32>>> & StorageFlag,
	y: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.f32>>> & StorageFlag,
	nodeCount: number,
	hasValues: boolean,
): void {
	const pipeline = root.createGuardedComputePipeline(spmvPipeline);

	// Create values buffer if not present (unweighted graph)
	const valuesBuffer =
		csrBuffers.values ??
		root
			.createBuffer(
				d.arrayOf(d.f32, csrBuffers.edgeCount),
				new Array(csrBuffers.edgeCount).fill(1.0),
			)
			.$usage("storage");

	// Create uniform buffers for scalar values
	const nodeCountBuffer = root.createBuffer(d.u32, nodeCount).$usage("uniform");
	const hasValuesBuffer = root
		.createBuffer(d.u32, hasValues ? 1 : 0)
		.$usage("uniform");

	const bindGroup = root.createBindGroup(SpMVLayout, {
		rowOffsets: csrBuffers.rowOffsets,
		colIndices: csrBuffers.colIndices,
		values: valuesBuffer,
		x,
		y,
		nodeCount: nodeCountBuffer,
		hasValues: hasValuesBuffer,
	});

	pipeline.with(bindGroup).dispatchThreads(nodeCount);
}

export { SpMVLayout };
