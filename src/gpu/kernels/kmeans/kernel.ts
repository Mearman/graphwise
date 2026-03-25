/**
 * TypeGPU compute kernel for K-means assignment step.
 *
 * Assigns each point to its nearest centroid in parallel.
 * This is the most parallelizable operation in K-means clustering.
 *
 * @module gpu/kernels/kmeans/kernel
 */

import tgpu, { d, type TgpuBuffer } from "typegpu";
import type { GraphwiseGPURoot } from "../../root";

/**
 * Bind group layout for K-means assignment kernel.
 */
const KMeansAssignLayout = tgpu.bindGroupLayout({
	points: { storage: d.arrayOf(d.arrayOf(d.f32, 3)) }, // 3D points for GRASP
	centroids: { storage: d.arrayOf(d.arrayOf(d.f32, 3)) },
	assignments: { storage: d.arrayOf(d.u32), access: "mutable" },
	distances: { storage: d.arrayOf(d.f32), access: "mutable" },
	pointCount: { uniform: d.u32 },
	k: { uniform: d.u32 },
});

/**
 * K-means assignment compute pipeline: one thread per point.
 *
 * For each point:
 *   - Compute distance to all centroids
 *   - Assign to nearest centroid
 *   - Store squared distance
 */
const kmeansAssignPipeline = tgpu
	.computeFn(
		{
			workgroupSize: [64],
		},
		(input: { globalInvocationId: readonly [number, number, number] }) => {
			"use gpu";
			const pointIdx = input.globalInvocationId[0] ?? 0;

			if (pointIdx >= KMeansAssignLayout.$.pointCount) {
				return;
			}

			// Load point coordinates
			const point = KMeansAssignLayout.$.points[pointIdx];
			if (point === undefined) {
				KMeansAssignLayout.$.assignments[pointIdx] = 0;
				KMeansAssignLayout.$.distances[pointIdx] = 0;
				return;
			}

			const px = point[0] ?? 0;
			const py = point[1] ?? 0;
			const pz = point[2] ?? 0;

			// Find nearest centroid
			let minDist = 1e30;
			let minIdx = 0u;

			for (let c = 0u; c < KMeansAssignLayout.$.k; c = c + 1u) {
				const centroid = KMeansAssignLayout.$.centroids[c];
				if (centroid === undefined) continue;

				const cx = centroid[0] ?? 0;
				const cy = centroid[1] ?? 0;
				const cz = centroid[2] ?? 0;

				const dx = px - cx;
				const dy = py - cy;
				const dz = pz - cz;
				const distSq = dx * dx + dy * dy + dz * dz;

				if (distSq < minDist) {
					minDist = distSq;
					minIdx = c;
				}
			}

			KMeansAssignLayout.$.assignments[pointIdx] = minIdx;
			KMeansAssignLayout.$.distances[pointIdx] = minDist;
		},
	)
	.with(KMeansAssignLayout);

/**
 * Dispatch K-means assignment on GPU.
 *
 * @param root - TypeGPU root
 * @param pointsBuffer - Buffer of 3D points
 * @param centroidsBuffer - Buffer of centroids
 * @param assignmentsBuffer - Output buffer for assignments
 * @param distancesBuffer - Output buffer for distances
 * @param pointCount - Number of points
 * @param k - Number of centroids
 */
export function dispatchKMeansAssign(
	root: GraphwiseGPURoot,
	pointsBuffer: TgpuBuffer<(readonly [number, number, number])[]>,
	centroidsBuffer: TgpuBuffer<(readonly [number, number, number])[]>,
	assignmentsBuffer: TgpuBuffer<number[]>,
	distancesBuffer: TgpuBuffer<number[]>,
	pointCount: number,
	k: number,
): void {
	const pipeline = root.with(kmeansAssignPipeline).createPipeline();

	const bindGroup = root
		.createBindGroup(KMeansAssignLayout, {
			points: pointsBuffer,
			centroids: centroidsBuffer,
			assignments: assignmentsBuffer,
			distances: distancesBuffer,
			pointCount: pointCount,
			k: k,
		})
		.$usage("uniform");

	pipeline
		.with(KMeansAssignLayout, bindGroup)
		.dispatchWorkgroups(Math.ceil(pointCount / 64));
}

/**
 * Create buffers for K-means assignment.
 */
export function createKMeansAssignBuffers(
	root: GraphwiseGPURoot,
	points: readonly (readonly [number, number, number])[],
	centroids: readonly (readonly [number, number, number])[],
): {
	pointsBuffer: TgpuBuffer<(readonly [number, number, number])[]>;
	centroidsBuffer: TgpuBuffer<(readonly [number, number, number])[]>;
	assignmentsBuffer: TgpuBuffer<number[]>;
	distancesBuffer: TgpuBuffer<number[]>;
} {
	const pointCount = points.length;
	const k = centroids.length;

	const pointsBuffer = root
		.createBuffer(d.arrayOf(d.vec3f, pointCount), points)
		.$usage("storage");

	const centroidsBuffer = root
		.createBuffer(d.arrayOf(d.vec3f, k), centroids)
		.$usage("storage");

	const assignmentsBuffer = root
		.createBuffer(d.arrayOf(d.u32, pointCount))
		.$usage("storage");

	const distancesBuffer = root
		.createBuffer(d.arrayOf(d.f32, pointCount))
		.$usage("storage");

	return {
		pointsBuffer,
		centroidsBuffer,
		assignmentsBuffer,
		distancesBuffer,
	};
}
