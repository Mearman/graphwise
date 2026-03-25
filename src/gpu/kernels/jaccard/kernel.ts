/**
 * TypeGPU compute kernel for batch Jaccard similarity.
 *
 * Computes Jaccard coefficient for multiple node pairs in parallel:
 *   J(u, v) = |N(u) ∩ N(v)| / |N(u) ∪ N(v)|
 *
 * Uses binary search optimisation: iterate smaller neighbourhood, search in larger.
 *
 * @module gpu/kernels/jaccard/kernel
 */

import tgpu, { d, type StorageFlag, type TgpuBuffer } from "typegpu";
import type { TypedBufferGroup } from "../../csr";
import type { GraphwiseGPURoot } from "../../root";

/**
 * Bind group layout for Jaccard kernel.
 */
const JaccardLayout = tgpu.bindGroupLayout({
	rowOffsets: { storage: d.arrayOf(d.u32) },
	colIndices: { storage: d.arrayOf(d.u32) },
	pairsU: { storage: d.arrayOf(d.u32) },
	pairsV: { storage: d.arrayOf(d.u32) },
	results: { storage: d.arrayOf(d.f32), access: "mutable" },
	pairCount: { uniform: d.u32 },
});

/**
 * Jaccard compute pipeline: one thread per pair.
 *
 * For each pair (u, v):
 *   - Count intersection by iterating smaller neighbourhood
 *   - Binary search in larger neighbourhood
 *   - Jaccard = intersection / (degU + degV - intersection)
 */
const jaccardPipeline = (pairIdx: number): void => {
	"use gpu";
	const u = JaccardLayout.$.pairsU[pairIdx] ?? 0;
	const v = JaccardLayout.$.pairsV[pairIdx] ?? 0;

	const uStart = JaccardLayout.$.rowOffsets[u] ?? 0;
	const uEnd = JaccardLayout.$.rowOffsets[u + 1] ?? 0;
	const vStart = JaccardLayout.$.rowOffsets[v] ?? 0;
	const vEnd = JaccardLayout.$.rowOffsets[v + 1] ?? 0;

	const degU = uEnd - uStart;
	const degV = vEnd - vStart;

	// Empty neighbourhoods → Jaccard = 0
	if (degU === 0 || degV === 0) {
		JaccardLayout.$.results[pairIdx] = 0.0;
		return;
	}

	// Count intersection: iterate smaller, binary search in larger
	let intersection = 0;

	if (degU <= degV) {
		// Iterate u's neighbours, search in v's
		for (let i = uStart; i < uEnd; i = i + 1) {
			const neighbour = JaccardLayout.$.colIndices[i] ?? 0;
			// Binary search in v's neighbourhood
			let lo = vStart;
			let hi = vEnd;
			while (lo < hi) {
				const mid = lo + (hi - lo) / 2;
				const midVal = JaccardLayout.$.colIndices[mid] ?? 0;
				if (midVal === neighbour) {
					intersection = intersection + 1;
					lo = hi; // break
				} else if (midVal < neighbour) {
					lo = mid + 1;
				} else {
					hi = mid;
				}
			}
		}
	} else {
		// Iterate v's neighbours, search in u's
		for (let i = vStart; i < vEnd; i = i + 1) {
			const neighbour = JaccardLayout.$.colIndices[i] ?? 0;
			// Binary search in u's neighbourhood
			let lo = uStart;
			let hi = uEnd;
			while (lo < hi) {
				const mid = lo + (hi - lo) / 2;
				const midVal = JaccardLayout.$.colIndices[mid] ?? 0;
				if (midVal === neighbour) {
					intersection = intersection + 1;
					lo = hi; // break
				} else if (midVal < neighbour) {
					lo = mid + 1;
				} else {
					hi = mid;
				}
			}
		}
	}

	const unionSize = degU + degV - intersection;
	JaccardLayout.$.results[pairIdx] = intersection / unionSize;
};

/**
 * Dispatch batch Jaccard on GPU.
 *
 * @param root - TypeGPU root instance
 * @param csrBuffers - CSR matrix as typed buffers
 * @param pairsU - First node of each pair (u32 array)
 * @param pairsV - Second node of each pair (u32 array)
 * @param results - Output Jaccard coefficients (f32 array, mutable)
 * @param pairCount - Number of pairs to compute
 */
export function dispatchJaccard(
	root: GraphwiseGPURoot,
	csrBuffers: TypedBufferGroup,
	pairsU: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> & StorageFlag,
	pairsV: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> & StorageFlag,
	results: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.f32>>> & StorageFlag,
	pairCount: number,
): void {
	const pipeline = root.createGuardedComputePipeline(jaccardPipeline);

	const pairCountBuffer = root.createBuffer(d.u32, pairCount).$usage("uniform");

	const bindGroup = root.createBindGroup(JaccardLayout, {
		rowOffsets: csrBuffers.rowOffsets,
		colIndices: csrBuffers.colIndices,
		pairsU,
		pairsV,
		results,
		pairCount: pairCountBuffer,
	});

	pipeline.with(bindGroup).dispatchThreads(pairCount);
}

export { JaccardLayout };
