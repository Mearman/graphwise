/**
 * TypeGPU compute kernel for Adamic-Adar index (batch).
 *
 * For each pair (u, v): iterate smaller neighbourhood, detect common neighbours
 * by binary search in the other neighbourhood, sum 1 / log(deg(w) + 1) and
 * normalise by log(2)/count to match CPU normalisation.
 */

import tgpu, { d, type StorageFlag, type TgpuBuffer } from "typegpu";
import type { TypedBufferGroup } from "../../csr";
import type { GraphwiseGPURoot } from "../../root";

const LOG2 = 0.6931471805599453;

const AdamicLayout = tgpu.bindGroupLayout({
	rowOffsets: { storage: d.arrayOf(d.u32) },
	colIndices: { storage: d.arrayOf(d.u32) },
	pairsU: { storage: d.arrayOf(d.u32) },
	pairsV: { storage: d.arrayOf(d.u32) },
	intersections: { storage: d.arrayOf(d.u32), access: "mutable" },
	sizeUs: { storage: d.arrayOf(d.u32), access: "mutable" },
	sizeVs: { storage: d.arrayOf(d.u32), access: "mutable" },
	results: { storage: d.arrayOf(d.f32), access: "mutable" },
	pairCount: { uniform: d.u32 },
});

const adamicPipeline = (pairIdx: number): void => {
	"use gpu";
	const u = AdamicLayout.$.pairsU[pairIdx] ?? 0;
	const v = AdamicLayout.$.pairsV[pairIdx] ?? 0;

	const uStart = AdamicLayout.$.rowOffsets[u] ?? 0;
	const uEnd = AdamicLayout.$.rowOffsets[u + 1] ?? 0;
	const vStart = AdamicLayout.$.rowOffsets[v] ?? 0;
	const vEnd = AdamicLayout.$.rowOffsets[v + 1] ?? 0;

	const degU = uEnd - uStart;
	const degV = vEnd - vStart;

	AdamicLayout.$.sizeUs[pairIdx] = degU;
	AdamicLayout.$.sizeVs[pairIdx] = degV;

	if (degU === 0 || degV === 0) {
		AdamicLayout.$.intersections[pairIdx] = 0;
		AdamicLayout.$.results[pairIdx] = 0.0;
		return;
	}

	let commonCount = 0;
	let sum = 0.0;

	if (degU <= degV) {
		for (let i = uStart; i < uEnd; i = i + 1) {
			const neighbour = AdamicLayout.$.colIndices[i] ?? 0;
			let lo = vStart;
			let hi = vEnd;
			while (lo < hi) {
				const mid = lo + (hi - lo) / 2;
				const midVal = AdamicLayout.$.colIndices[mid] ?? 0;
				if (midVal === neighbour) {
					commonCount = commonCount + 1;
					const wStart = AdamicLayout.$.rowOffsets[neighbour] ?? 0;
					const wEnd = AdamicLayout.$.rowOffsets[neighbour + 1] ?? 0;
					const degW = wEnd - wStart;
					const invLog = 1.0 / Math.log(degW + 1.0);
					sum = sum + invLog;
					lo = hi; // break
				} else if (midVal < neighbour) {
					lo = mid + 1;
				} else {
					hi = mid;
				}
			}
		}
	} else {
		for (let i = vStart; i < vEnd; i = i + 1) {
			const neighbour = AdamicLayout.$.colIndices[i] ?? 0;
			let lo = uStart;
			let hi = uEnd;
			while (lo < hi) {
				const mid = lo + (hi - lo) / 2;
				const midVal = AdamicLayout.$.colIndices[mid] ?? 0;
				if (midVal === neighbour) {
					commonCount = commonCount + 1;
					const wStart = AdamicLayout.$.rowOffsets[neighbour] ?? 0;
					const wEnd = AdamicLayout.$.rowOffsets[neighbour + 1] ?? 0;
					const degW = wEnd - wStart;
					const invLog = 1.0 / Math.log(degW + 1.0);
					sum = sum + invLog;
					lo = hi; // break
				} else if (midVal < neighbour) {
					lo = mid + 1;
				} else {
					hi = mid;
				}
			}
		}
	}

	AdamicLayout.$.intersections[pairIdx] = commonCount;
	if (commonCount === 0) {
		AdamicLayout.$.results[pairIdx] = 0.0;
	} else {
		AdamicLayout.$.results[pairIdx] = (sum * LOG2) / commonCount;
	}
};

export function dispatchAdamicAdar(
	root: GraphwiseGPURoot,
	csrBuffers: TypedBufferGroup,
	pairsU: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> & StorageFlag,
	pairsV: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> & StorageFlag,
	results: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.f32>>> & StorageFlag,
	intersections: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> &
		StorageFlag,
	sizeUs: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> & StorageFlag,
	sizeVs: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> & StorageFlag,
	pairCount: number,
): void {
	const pipeline = root.createGuardedComputePipeline(adamicPipeline);
	const pairCountBuffer = root.createBuffer(d.u32, pairCount).$usage("uniform");
	const bindGroup = root.createBindGroup(AdamicLayout, {
		rowOffsets: csrBuffers.rowOffsets,
		colIndices: csrBuffers.colIndices,
		pairsU,
		pairsV,
		intersections,
		sizeUs,
		sizeVs,
		results,
		pairCount: pairCountBuffer,
	});
	pipeline.with(bindGroup).dispatchThreads(pairCount);
}

export { AdamicLayout };
