/**
 * TypeGPU compute kernel for degree computation.
 *
 * Computes degree per node from CSR row offsets.
 * Note: Histogram aggregation requires atomic operations or CPU reduction.
 *
 * @module gpu/kernels/degree-histogram/kernel
 */

import tgpu, { d, type StorageFlag, type TgpuBuffer } from "typegpu";
import type { TypedBufferGroup } from "../../csr";
import type { GraphwiseGPURoot } from "../../root";

/**
 * Bind group layout for degree kernel.
 */
const DegreeLayout = tgpu.bindGroupLayout({
	rowOffsets: { storage: d.arrayOf(d.u32) },
	degrees: { storage: d.arrayOf(d.u32), access: "mutable" },
	nodeCount: { uniform: d.u32 },
});

/**
 * Degree compute pipeline: compute degree for each node.
 *
 * Each thread computes one node's degree from CSR row offsets:
 *   degree[node] = rowOffsets[node+1] - rowOffsets[node]
 */
const degreePipeline = (node: number): void => {
	"use gpu";
	const n = DegreeLayout.$.nodeCount ?? 0;

	if (node >= n) {
		return;
	}

	const start = DegreeLayout.$.rowOffsets[node] ?? 0;
	const end = DegreeLayout.$.rowOffsets[node + 1] ?? 0;
	const deg = end - start;

	DegreeLayout.$.degrees[node] = deg;
};

/**
 * Dispatch degree computation on GPU.
 *
 * Note: This computes per-node degrees. Histogram aggregation should be
 * done on CPU or with a separate reduction kernel.
 *
 * @param root - TypeGPU root instance
 * @param csrBuffers - CSR matrix as typed buffers
 * @param degrees - Output degree array (u32, mutable)
 * @param nodeCount - Number of nodes
 */
export function dispatchDegreeHistogram(
	root: GraphwiseGPURoot,
	csrBuffers: TypedBufferGroup,
	degrees: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> & StorageFlag,
	nodeCount: number,
): void {
	const pipeline = root.createGuardedComputePipeline(degreePipeline);

	const nodeCountBuffer = root.createBuffer(d.u32, nodeCount).$usage("uniform");

	const bindGroup = root.createBindGroup(DegreeLayout, {
		rowOffsets: csrBuffers.rowOffsets,
		degrees,
		nodeCount: nodeCountBuffer,
	});

	pipeline.with(bindGroup).dispatchThreads(nodeCount);
}

export { DegreeLayout };
