/**
 * TypeGPU compute kernel for PageRank power iteration.
 *
 * Computes one iteration of PageRank:
 *   r(v) = (1 - d)/N + d * sum(r(u) / deg_out(u)) for u -> v
 *
 * Uses TypeGPU's compute pipeline for parallel GPU execution.
 *
 * @module gpu/kernels/pagerank/kernel
 */

import tgpu, { d, type StorageFlag, type TgpuBuffer } from "typegpu";
import type { TypedBufferGroup } from "../../csr";
import type { GraphwiseGPURoot } from "../../root";

/**
 * Bind group layout for PageRank kernel.
 */
const PageRankLayout = tgpu.bindGroupLayout({
	rowOffsets: { storage: d.arrayOf(d.u32) },
	colIndices: { storage: d.arrayOf(d.u32) },
	ranks: { storage: d.arrayOf(d.f32) },
	outDegrees: { storage: d.arrayOf(d.u32) },
	newRanks: { storage: d.arrayOf(d.f32), access: "mutable" },
	nodeCount: { uniform: d.u32 },
	damping: { uniform: d.f32 },
});

/**
 * PageRank compute pipeline: one power iteration per dispatch.
 *
 * Each thread computes one node's new rank from incoming neighbours:
 *   newRank[v] = (1 - damping) / N + damping * sum(rank[u] / outDegree[u])
 */
const pagerankPipeline = (node: number): void => {
	"use gpu";
	const n = PageRankLayout.$.nodeCount ?? 0;
	const damp = PageRankLayout.$.damping ?? 0.85;

	const start = PageRankLayout.$.rowOffsets[node] ?? 0;
	const end = PageRankLayout.$.rowOffsets[node + 1] ?? 0;

	let contribution = 0.0;
	for (let i = start; i < end; i = i + 1) {
		const source = PageRankLayout.$.colIndices[i] ?? 0;
		const deg = PageRankLayout.$.outDegrees[source] ?? 0;
		if (deg > 0) {
			const rank = PageRankLayout.$.ranks[source] ?? 0.0;
			contribution = contribution + rank / deg;
		}
	}

	const teleport = (1.0 - damp) / n;
	PageRankLayout.$.newRanks[node] = teleport + damp * contribution;
};

/**
 * Dispatch one PageRank iteration on GPU.
 *
 * @param root - TypeGPU root instance
 * @param csrBuffers - CSR matrix as typed buffers (transpose graph: in-edges)
 * @param ranks - Current rank values buffer
 * @param outDegrees - Out-degree buffer for each node
 * @param newRanks - Output buffer for new rank values (mutable)
 * @param nodeCount - Number of nodes
 * @param damping - Damping factor (typically 0.85)
 */
export function dispatchPagerank(
	root: GraphwiseGPURoot,
	csrBuffers: TypedBufferGroup,
	ranks: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.f32>>> & StorageFlag,
	outDegrees: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> &
		StorageFlag,
	newRanks: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.f32>>> &
		StorageFlag,
	nodeCount: number,
	damping: number,
): void {
	const pipeline = root.createGuardedComputePipeline(pagerankPipeline);

	const nodeCountBuffer = root.createBuffer(d.u32, nodeCount).$usage("uniform");
	const dampingBuffer = root.createBuffer(d.f32, damping).$usage("uniform");

	const bindGroup = root.createBindGroup(PageRankLayout, {
		rowOffsets: csrBuffers.rowOffsets,
		colIndices: csrBuffers.colIndices,
		ranks,
		outDegrees,
		newRanks,
		nodeCount: nodeCountBuffer,
		damping: dampingBuffer,
	});

	pipeline.with(bindGroup).dispatchThreads(nodeCount);
}

export { PageRankLayout };
