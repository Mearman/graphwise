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
const kmeansAssignPipeline = (pointIdx: number): void => {
	"use gpu";

	if (pointIdx >= KMeansAssignLayout.$.pointCount) return;

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
	let minDist = 1000000000;
	let minIdx = 0;

	for (let c = 0; c < KMeansAssignLayout.$.k; c = c + 1) {
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
};

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
	pointsBuffer: any,
	centroidsBuffer: any,
	assignmentsBuffer: any,
	distancesBuffer: any,
	pointCount: number,
	k: number,
): void {
	// Use the project's guarded pipeline pattern
	const pipeline = root.createGuardedComputePipeline(kmeansAssignPipeline as any);

	const pairCountBuffer = root.createBuffer(d.u32, pointCount).$usage("uniform");
	const kBuffer = root.createBuffer(d.u32, k).$usage("uniform");

	const bindGroup = root.createBindGroup(KMeansAssignLayout, {
		points: pointsBuffer,
		centroids: centroidsBuffer,
		assignments: assignmentsBuffer,
		distances: distancesBuffer,
		pointCount: pairCountBuffer,
		k: kBuffer,
	});

	pipeline.with(bindGroup).dispatchThreads(pointCount);
}

/**
 * Create buffers for K-means assignment.
 */
export function createKMeansAssignBuffers(
	root: GraphwiseGPURoot,
	points: readonly (readonly [number, number, number])[],
	centroids: readonly (readonly [number, number, number])[],
): any {
	const pointCount = points.length;
	const k = centroids.length;

	const pointsBuffer = root
		.createBuffer(d.arrayOf(d.vec3f, pointCount), Array.from(points) as any)
		.$usage("storage");

	const centroidsBuffer = root
		.createBuffer(d.arrayOf(d.vec3f, k), Array.from(centroids) as any)
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
