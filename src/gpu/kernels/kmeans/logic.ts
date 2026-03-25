/**
 * CPU reference implementation for K-means operations.
 *
 * K-means has two main operations:
 * 1. Assignment: assign each point to nearest centroid
 * 2. Update: compute new centroids from assigned points
 *
 * The assignment step is the most parallelizable - each point independently
 * computes distances to all centroids and finds the minimum.
 *
 * @module gpu/kernels/kmeans/logic
 */

/**
 * Point in K-dimensional space.
 */
export interface Point {
	/** Feature coordinates */
	readonly coords: readonly number[];
}

/**
 * Centroid with accumulated sum and count for incremental update.
 */
export interface CentroidAccumulator {
	/** Sum of coordinates for each dimension */
	readonly sums: number[];
	/** Number of points assigned to this centroid */
	count: number;
}

/**
 * Result of K-means assignment step.
 */
export interface KMeansAssignmentResult {
	/** Assignment index for each point (0 to k-1) */
	readonly assignments: Uint32Array;
	/** Distance to assigned centroid for each point */
	readonly distances: Float32Array;
}

/**
 * Compute squared Euclidean distance between two points.
 *
 * @param a - First point coordinates
 * @param b - Second point coordinates
 * @returns Squared Euclidean distance
 */
export function squaredEuclideanDistance(
	a: readonly number[],
	b: readonly number[],
): number {
	let sum = 0;
	for (let i = 0; i < a.length; i++) {
		const diff = (a[i] ?? 0) - (b[b.length > i ? i : 0] ?? 0);
		sum += diff * diff;
	}
	return sum;
}

/**
 * Compute Euclidean distance between two points.
 *
 * @param a - First point coordinates
 * @param b - Second point coordinates
 * @returns Euclidean distance
 */
export function euclideanDistance(
	a: readonly number[],
	b: readonly number[],
): number {
	return Math.sqrt(squaredEuclideanDistance(a, b));
}

/**
 * Assign each point to its nearest centroid.
 *
 * For each point, computes distance to all centroids and assigns to the nearest.
 * This is the main parallelizable operation in K-means.
 *
 * @param points - Array of points to assign
 * @param centroids - Array of centroid coordinates
 * @returns Assignment result with indices and distances
 */
export function assignPointsToCentroids(
	points: readonly (readonly number[])[],
	centroids: readonly (readonly number[])[],
): KMeansAssignmentResult {
	const n = points.length;
	const k = centroids.length;
	const assignments = new Uint32Array(n);
	const distances = new Float32Array(n);

	for (let i = 0; i < n; i++) {
		const point = points[i];
		if (point === undefined) {
			assignments[i] = 0;
			distances[i] = 0;
			continue;
		}

		let minDist = Infinity;
		let minIdx = 0;

		for (let j = 0; j < k; j++) {
			const centroid = centroids[j];
			if (centroid === undefined) continue;

			const dist = squaredEuclideanDistance(point, centroid);
			if (dist < minDist) {
				minDist = dist;
				minIdx = j;
			}
		}

		assignments[i] = minIdx;
		distances[i] = Math.sqrt(minDist);
	}

	return { assignments, distances };
}

/**
 * Update centroids based on point assignments.
 *
 * Computes new centroids as the mean of all assigned points.
 *
 * @param points - Array of points
 * @param assignments - Assignment index for each point
 * @param k - Number of clusters
 * @param dimensions - Number of dimensions per point
 * @returns New centroid coordinates
 */
export function updateCentroids(
	points: readonly (readonly number[])[],
	assignments: Uint32Array,
	k: number,
	dimensions: number,
): number[][] {
	// Initialize accumulators
	const sums: number[][] = Array.from({ length: k }, () =>
		Array(dimensions).fill(0),
	);
	const counts = new Uint32Array(k);

	// Accumulate points
	for (let i = 0; i < points.length; i++) {
		const point = points[i];
		const cluster = assignments[i];
		if (point === undefined || cluster === undefined) continue;

		const sum = sums[cluster];
		if (sum === undefined) continue;

		for (let d = 0; d < dimensions; d++) {
			const coord = point[d] ?? 0;
			sum[d] = (sum[d] ?? 0) + coord;
		}
		counts[cluster] = (counts[cluster] ?? 0) + 1;
	}

	// Compute means
	const centroids: number[][] = [];
	for (let j = 0; j < k; j++) {
		const sum = sums[j];
		const count = counts[j] ?? 0;
		if (sum === undefined || count === 0) {
			// Keep centroid at origin if no points assigned
			centroids.push(Array(dimensions).fill(0));
		} else {
			centroids.push(sum.map((s) => s / count));
		}
	}

	return centroids;
}

/**
 * Initialize centroids using K-means++ algorithm.
 *
 * Selects initial centroids that are spread out, leading to faster convergence.
 *
 * @param points - Array of points
 * @param k - Number of centroids to select
 * @param rng - Random number generator (0 to 1)
 * @returns Initial centroid coordinates
 */
export function initializeCentroidsKMeansPlusPlus(
	points: readonly (readonly number[])[],
	k: number,
	rng: () => number,
): number[][] {
	if (points.length === 0 || k === 0) {
		return [];
	}

	// Cannot select more centroids than unique points
	const effectiveK = Math.min(k, points.length);

	const n = points.length;
	const selected: number[] = [];
	const centroids: number[][] = [];

	// Select first centroid uniformly at random
	const firstIdx = Math.floor(rng() * n);
	const firstPoint = points[firstIdx];
	if (firstPoint === undefined) {
		return [];
	}
	selected.push(firstIdx);
	centroids.push([...firstPoint]);

	// Select remaining centroids with probability proportional to D²
	for (let c = 1; c < effectiveK; c++) {
		// Compute minimum squared distance to nearest centroid for each point
		const minDistSq = new Float32Array(n);
		let totalDistSq = 0;

		for (let i = 0; i < n; i++) {
			const point = points[i];
			if (point === undefined || selected.includes(i)) {
				minDistSq[i] = 0;
				continue;
			}

			let minD = Infinity;
			for (const centroid of centroids) {
				const d = squaredEuclideanDistance(point, centroid);
				if (d < minD) minD = d;
			}
			minDistSq[i] = minD;
			totalDistSq += minD;
		}

		// If all remaining points have 0 distance, stop
		if (totalDistSq === 0) {
			break;
		}

		// Select next centroid with probability proportional to D²
		const threshold = rng() * totalDistSq;
		let cumulative = 0;
		let nextIdx = 0;

		for (let i = 0; i < n; i++) {
			cumulative += minDistSq[i] ?? 0;
			if (cumulative >= threshold) {
				nextIdx = i;
				break;
			}
			nextIdx = i;
		}

		const nextPoint = points[nextIdx];
		if (nextPoint !== undefined) {
			selected.push(nextIdx);
			centroids.push([...nextPoint]);
		}
	}

	return centroids;
}

/**
 * Run full K-means clustering.
 *
 * @param points - Array of points to cluster
 * @param k - Number of clusters
 * @param options - Configuration options
 * @returns Final assignments and centroids
 */
export function kmeans(
	points: readonly (readonly number[])[],
	k: number,
	options?: {
		/** Maximum iterations (default: 100) */
		readonly maxIterations?: number;
		/** Convergence threshold for centroid movement (default: 1e-6) */
		readonly tolerance?: number;
		/** Random number generator (default: Math.random) */
		readonly rng?: () => number;
		/** Initial centroids (optional, uses k-means++ if not provided) */
		readonly initialCentroids?: readonly (readonly number[])[];
	},
): {
	assignments: Uint32Array;
	centroids: number[][];
	iterations: number;
	converged: boolean;
} {
	const maxIterations = options?.maxIterations ?? 100;
	const tolerance = options?.tolerance ?? 1e-6;
	const rng = options?.rng ?? Math.random;

	if (points.length === 0 || k === 0) {
		return {
			assignments: new Uint32Array(0),
			centroids: [],
			iterations: 0,
			converged: true,
		};
	}

	const dimensions = points[0]?.length ?? 0;

	// Initialize centroids
	let centroids =
		options?.initialCentroids !== undefined
			? options.initialCentroids.map((c) => [...c])
			: initializeCentroidsKMeansPlusPlus(points, k, rng);

	// Ensure we have k centroids
	while (centroids.length < k) {
		const randomPoint = points[Math.floor(rng() * points.length)];
		if (randomPoint !== undefined) {
			centroids.push([...randomPoint]);
		}
	}

	let assignments = new Uint32Array(points.length);
	let converged = false;

	for (let iter = 0; iter < maxIterations; iter++) {
		// Assignment step
		const result = assignPointsToCentroids(points, centroids);
		assignments = result.assignments;

		// Update step
		const newCentroids = updateCentroids(points, assignments, k, dimensions);

		// Check convergence
		let maxMovement = 0;
		for (let j = 0; j < k; j++) {
			const oldC = centroids[j];
			const newC = newCentroids[j];
			if (oldC === undefined || newC === undefined) continue;

			const movement = euclideanDistance(oldC, newC);
			if (movement > maxMovement) maxMovement = movement;
		}

		centroids = newCentroids;

		if (maxMovement < tolerance) {
			converged = true;
			break;
		}
	}

	return {
		assignments,
		centroids,
		iterations: maxIterations,
		converged,
	};
}
