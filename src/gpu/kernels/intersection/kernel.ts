/**
 * TypeGPU compute kernel for batch neighbourhood intersection.
 *
 * Computes intersection size and neighbourhood sizes for multiple node pairs.
 * One thread per pair: iterates the smaller neighbourhood and binary-searches the other.
 *
 * @module gpu/kernels/intersection/kernel
 */

import tgpu, { d, type StorageFlag, type TgpuBuffer } from "typegpu";
import type { TypedBufferGroup } from "../../csr";
import type { GraphwiseGPURoot } from "../../root";

/**
 * Bind group layout for Intersection kernel.
 */
const IntersectionLayout = tgpu.bindGroupLayout({
	rowOffsets: { storage: d.arrayOf(d.u32) },
	colIndices: { storage: d.arrayOf(d.u32) },
	pairsU: { storage: d.arrayOf(d.u32) },
	pairsV: { storage: d.arrayOf(d.u32) },
	intersections: { storage: d.arrayOf(d.u32), access: "mutable" },
	sizeUs: { storage: d.arrayOf(d.u32), access: "mutable" },
	sizeVs: { storage: d.arrayOf(d.u32), access: "mutable" },
	pairCount: { uniform: d.u32 },
});

/**
 * Intersection compute pipeline: one thread per pair.
 *
 * For each pair (u, v):
 *  - Count intersection by iterating smaller neighbourhood
 *  - Binary search in larger neighbourhood
 *  - Write intersection, sizeU, sizeV to output buffers
 */
const intersectionPipeline = (pairIdx: number): void => {
	"use gpu";
	const u = IntersectionLayout.$.pairsU[pairIdx] ?? 0;
	const v = IntersectionLayout.$.pairsV[pairIdx] ?? 0;

	const uStart = IntersectionLayout.$.rowOffsets[u] ?? 0;
	const uEnd = IntersectionLayout.$.rowOffsets[u + 1] ?? 0;
	const vStart = IntersectionLayout.$.rowOffsets[v] ?? 0;
	const vEnd = IntersectionLayout.$.rowOffsets[v + 1] ?? 0;

	const degU = uEnd - uStart;
	const degV = vEnd - vStart;

	// Write sizes first
	IntersectionLayout.$.sizeUs[pairIdx] = degU;
	IntersectionLayout.$.sizeVs[pairIdx] = degV;

	// Empty neighbourhoods → intersection = 0
	if (degU === 0 || degV === 0) {
		IntersectionLayout.$.intersections[pairIdx] = 0;
		return;
	}

	let intersection = 0;

	if (degU <= degV) {
		// Iterate u's neighbours, search in v's
		for (let i = uStart; i < uEnd; i = i + 1) {
			const neighbour = IntersectionLayout.$.colIndices[i] ?? 0;
			// Binary search in v's neighbourhood
			let lo = vStart;
			let hi = vEnd;
			while (lo < hi) {
				const mid = lo + (hi - lo) / 2;
				const midVal = IntersectionLayout.$.colIndices[mid] ?? 0;
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
			const neighbour = IntersectionLayout.$.colIndices[i] ?? 0;
			// Binary search in u's neighbourhood
			let lo = uStart;
			let hi = uEnd;
			while (lo < hi) {
				const mid = lo + (hi - lo) / 2;
				const midVal = IntersectionLayout.$.colIndices[mid] ?? 0;
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

	IntersectionLayout.$.intersections[pairIdx] = intersection;
};

/**
 * Dispatch batch intersection on GPU.
 *
 * @param root - TypeGPU root instance
 * @param csrBuffers - CSR matrix as typed buffers
 * @param pairsU - First node of each pair (u32 array)
 * @param pairsV - Second node of each pair (u32 array)
 * @param intersections - Output intersections (u32 array, mutable)
 * @param sizeUs - Output sizeU per pair (u32 array, mutable)
 * @param sizeVs - Output sizeV per pair (u32 array, mutable)
 * @param pairCount - Number of pairs to compute
 */
export function dispatchIntersection(
	root: GraphwiseGPURoot,
	csrBuffers: TypedBufferGroup,
	pairsU: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> & StorageFlag,
	pairsV: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> & StorageFlag,
	intersections: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> &
		StorageFlag,
	sizeUs: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> & StorageFlag,
	sizeVs: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> & StorageFlag,
	pairCount: number,
): void {
	const pipeline = root.createGuardedComputePipeline(intersectionPipeline);

	const pairCountBuffer = root.createBuffer(d.u32, pairCount).$usage("uniform");

	const bindGroup = root.createBindGroup(IntersectionLayout, {
		rowOffsets: csrBuffers.rowOffsets,
		colIndices: csrBuffers.colIndices,
		pairsU,
		pairsV,
		intersections,
		sizeUs,
		sizeVs,
		pairCount: pairCountBuffer,
	});

	pipeline.with(bindGroup).dispatchThreads(pairCount);
}

export { IntersectionLayout };
