/**
 * TypeGPU compute kernel for K-means assignment step.
 *
 * Assigns each point to its nearest centroid in parallel.
 * This is the most parallelizable operation in K-means clustering.
 *
 * @module gpu/kernels/kmeans/kernel
 */

import tgpu, { d } from "typegpu";
import type { GraphwiseGPURoot } from "../../root";

/**
 * K-means assignment kernel buffers.
 *
 * Buffer types are complex TypeGPU types that are difficult to express in TypeScript.
 * Using `any` here is intentional to avoid verbose generic constraints.
 */
export interface KMeansAssignBuffers {
	/** Points buffer (3D vectors) */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly pointsBuffer: any;
	/** Centroids buffer (3D vectors) */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly centroidsBuffer: any;
	/** Assignments output buffer (cluster indices) */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly assignmentsBuffer: any;
	/** Distances output buffer (distances to assigned centroid) */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly distancesBuffer: any;
}

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
	// TypeGPU buffer types are complex and not easily expressible in TypeScript
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
	pointsBuffer: any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
	centroidsBuffer: any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
	assignmentsBuffer: any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
	distancesBuffer: any,
	pointCount: number,
	k: number,
): void {
	// TypeGPU kernel function with "use gpu" directive

	const pipeline = root.createGuardedComputePipeline(
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
		kmeansAssignPipeline as any,
	);

	const pairCountBuffer = root
		.createBuffer(d.u32, pointCount)
		.$usage("uniform");
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
): KMeansAssignBuffers {
	const pointCount = points.length;
	const k = centroids.length;

	// Convert readonly arrays to mutable for TypeGPU buffer creation

	const pointsBuffer = root
		.createBuffer(
			d.arrayOf(d.vec3f, pointCount),
			// TypeGPU type constraints are complex; TypedArrays are compatible with buffer initialization
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
			Array.from(points) as any,
		)
		.$usage("storage");

	const centroidsBuffer = root
		.createBuffer(
			d.arrayOf(d.vec3f, k),
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
			Array.from(centroids) as any,
		)
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
