/**
 * Minimal K-means clustering implementation for GRASP seed selection.
 *
 * This is a lightweight implementation specifically designed for 3D feature vectors
 * used in structural seed selection. For general-purpose clustering, consider
 * using a dedicated library.
 *
 * @packageDocumentation
 */

/**
 * A 3D feature vector representing node structural properties.
 */
export interface FeatureVector3D {
	/** First dimension (e.g., log-degree) */
	readonly f1: number;
	/** Second dimension (e.g., clustering coefficient) */
	readonly f2: number;
	/** Third dimension (e.g., approximate PageRank) */
	readonly f3: number;
}

/**
 * A labelled feature vector with associated node ID.
 */
export interface LabelledFeature extends FeatureVector3D {
	/** Node identifier */
	readonly nodeId: string;
}

/**
 * Result of K-means clustering.
 */
export interface KMeansResult {
	/** Cluster centroids */
	readonly centroids: readonly FeatureVector3D[];
	/** Cluster assignments: nodeId -> cluster index */
	readonly assignments: ReadonlyMap<string, number>;
	/** Number of clusters */
	readonly k: number;
}

/**
 * Options for K-means clustering.
 */
export interface KMeansOptions {
	/** Number of clusters */
	readonly k: number;
	/** Maximum iterations (default: 100) */
	readonly maxIterations?: number;
	/** Convergence threshold (default: 1e-6) */
	readonly tolerance?: number;
	/** Random seed for reproducibility */
	readonly seed?: number;
}

/** Small epsilon to prevent division by zero */
const EPSILON = 1e-10;

/**
 * Simple seeded pseudo-random number generator using mulberry32.
 */
function createRNG(seed: number): () => number {
	let state = seed >>> 0;
	return (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = Math.imul(state ^ (state >>> 15), state | 1);
		t = (t ^ (t >>> 7)) * (t | 0x61c88647);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Compute Euclidean distance between two 3D feature vectors.
 */
function euclideanDistance(a: FeatureVector3D, b: FeatureVector3D): number {
	const d1 = a.f1 - b.f1;
	const d2 = a.f2 - b.f2;
	const d3 = a.f3 - b.f3;
	return Math.sqrt(d1 * d1 + d2 * d2 + d3 * d3);
}

/**
 * Compute the mean of a set of feature vectors.
 * @internal - Used for testing
 */
export function _computeMean(
	vectors: readonly FeatureVector3D[],
): FeatureVector3D {
	if (vectors.length === 0) {
		return { f1: 0, f2: 0, f3: 0 };
	}
	let sum1 = 0;
	let sum2 = 0;
	let sum3 = 0;
	for (const v of vectors) {
		sum1 += v.f1;
		sum2 += v.f2;
		sum3 += v.f3;
	}
	const n = vectors.length;
	return { f1: sum1 / n, f2: sum2 / n, f3: sum3 / n };
}

/**
 * Z-score normalise features (zero mean, unit variance).
 */
export { normaliseFeatures as zScoreNormalise };

export function normaliseFeatures(
	features: readonly LabelledFeature[],
): LabelledFeature[] {
	if (features.length === 0) {
		return [];
	}

	// Compute means
	let sum1 = 0;
	let sum2 = 0;
	let sum3 = 0;
	for (const f of features) {
		sum1 += f.f1;
		sum2 += f.f2;
		sum3 += f.f3;
	}
	const n = features.length;
	const mean1 = sum1 / n;
	const mean2 = sum2 / n;
	const mean3 = sum3 / n;

	// Compute standard deviations
	let var1 = 0;
	let var2 = 0;
	let var3 = 0;
	for (const f of features) {
		var1 += (f.f1 - mean1) ** 2;
		var2 += (f.f2 - mean2) ** 2;
		var3 += (f.f3 - mean3) ** 2;
	}
	const std1 = Math.sqrt(var1 / n + EPSILON);
	const std2 = Math.sqrt(var2 / n + EPSILON);
	const std3 = Math.sqrt(var3 / n + EPSILON);

	// Normalise
	return features.map(
		(f): LabelledFeature => ({
			nodeId: f.nodeId,
			f1: (f.f1 - mean1) / std1,
			f2: (f.f2 - mean2) / std2,
			f3: (f.f3 - mean3) / std3,
		}),
	);
}

/**
 * Mini-batch K-means clustering for 3D feature vectors.
 *
 * Uses Mini-batch K-means for efficiency with large datasets.
 * This is specifically designed for the GRASP seed selection algorithm.
 *
 * @param features - Array of labelled feature vectors
 * @param options - Clustering options
 * @returns Clustering result with centroids and assignments
 */
export function miniBatchKMeans(
	features: readonly LabelledFeature[],
	options: KMeansOptions,
): KMeansResult {
	const { k, maxIterations = 100, tolerance = 1e-6, seed = 42 } = options;

	if (features.length === 0) {
		return {
			centroids: [],
			assignments: new Map(),
			k,
		};
	}

	const rng = createRNG(seed);
	const n = features.length;
	const effectiveK = Math.min(k, n);

	// Initialise centroids using k-means++ seeding
	const centroids: FeatureVector3D[] = initialiseCentroidsKMeansPP(
		features,
		effectiveK,
		rng,
	);

	// Assignments map
	const assignments = new Map<string, number>();

	// Mini-batch size (10% of data or at least 10)
	const batchSize = Math.max(10, Math.floor(n / 10));

	for (let iter = 0; iter < maxIterations; iter++) {
		// Sample mini-batch
		const batchIndices = new Set<number>();
		while (batchIndices.size < Math.min(batchSize, n)) {
			batchIndices.add(Math.floor(rng() * n));
		}

		// Assign batch points to nearest centroid
		const batchPoints: { feature: LabelledFeature; cluster: number }[] = [];
		for (const idx of batchIndices) {
			const feature = features[idx];
			if (feature === undefined) continue;
			let minDist = Infinity;
			let bestCluster = 0;
			for (let c = 0; c < centroids.length; c++) {
				const centroid = centroids[c];
				if (centroid === undefined) continue;
				const dist = euclideanDistance(feature, centroid);
				if (dist < minDist) {
					minDist = dist;
					bestCluster = c;
				}
			}
			batchPoints.push({ feature, cluster: bestCluster });
		}

		// Update centroids based on batch
		const oldCentroids = centroids.map((c) => ({ ...c }));

		// Compute per-cluster counts and sums from batch
		const clusterCounts = Array.from({ length: centroids.length }, () => 0);
		const clusterSums: [number, number, number][] = Array.from(
			{ length: centroids.length },
			(): [number, number, number] => [0, 0, 0],
		);

		for (const { feature, cluster } of batchPoints) {
			const currentCount = clusterCounts[cluster];
			if (currentCount !== undefined) {
				clusterCounts[cluster] = currentCount + 1;
			}
			const sum = clusterSums[cluster];
			if (sum !== undefined) {
				sum[0] += feature.f1;
				sum[1] += feature.f2;
				sum[2] += feature.f3;
			}
		}

		// Update centroids
		for (let c = 0; c < centroids.length; c++) {
			const count = clusterCounts[c] ?? 0;
			if (count > 0) {
				const sum = clusterSums[c];
				if (sum !== undefined) {
					centroids[c] = {
						f1: sum[0] / count,
						f2: sum[1] / count,
						f3: sum[2] / count,
					};
				}
			}
		}

		// Check convergence
		let maxShift = 0;
		for (let c = 0; c < centroids.length; c++) {
			const newCentroid = centroids[c];
			const oldCentroid = oldCentroids[c];
			if (newCentroid !== undefined && oldCentroid !== undefined) {
				const shift = euclideanDistance(newCentroid, oldCentroid);
				maxShift = Math.max(maxShift, shift);
			}
		}

		if (maxShift < tolerance) {
			break;
		}
	}

	// Final assignment of all points
	for (const feature of features) {
		let minDist = Infinity;
		let bestCluster = 0;
		for (let c = 0; c < centroids.length; c++) {
			const centroid = centroids[c];
			if (centroid === undefined) continue;
			const dist = euclideanDistance(feature, centroid);
			if (dist < minDist) {
				minDist = dist;
				bestCluster = c;
			}
		}
		assignments.set(feature.nodeId, bestCluster);
	}

	return {
		centroids,
		assignments,
		k: effectiveK,
	};
}

/**
 * K-means++ initialisation for better centroid seeding.
 */
function initialiseCentroidsKMeansPP(
	features: readonly LabelledFeature[],
	k: number,
	rng: () => number,
): FeatureVector3D[] {
	const centroids: FeatureVector3D[] = [];
	const n = features.length;

	// Choose first centroid randomly
	const firstIdx = Math.floor(rng() * n);
	const firstFeature = features[firstIdx];
	if (firstFeature === undefined) {
		return [{ f1: 0, f2: 0, f3: 0 }];
	}
	centroids.push({
		f1: firstFeature.f1,
		f2: firstFeature.f2,
		f3: firstFeature.f3,
	});

	// Choose remaining centroids with probability proportional to squared distance
	const distances = Array.from({ length: n }, () => Infinity);

	for (let c = 1; c < k; c++) {
		// Update distances to nearest centroid
		let totalDistSq = 0;
		for (let i = 0; i < n; i++) {
			const feature = features[i];
			if (feature === undefined) continue;
			const lastCentroid = centroids[c - 1];
			if (lastCentroid === undefined) continue;
			const dist = euclideanDistance(feature, lastCentroid);
			const currentMin = distances[i];
			if (currentMin !== undefined && dist < currentMin) {
				distances[i] = dist;
			}
			const d = distances[i];
			if (d !== undefined) {
				totalDistSq += d * d;
			}
		}

		// Choose next centroid with probability proportional to squared distance
		const threshold = rng() * totalDistSq;
		let cumulative = 0;
		let nextIdx = 0;
		for (let i = 0; i < n; i++) {
			const d = distances[i];
			if (d !== undefined) {
				cumulative += d * d;
				if (cumulative >= threshold) {
					nextIdx = i;
					break;
				}
			}
		}

		const nextFeature = features[nextIdx];
		if (nextFeature !== undefined) {
			centroids.push({
				f1: nextFeature.f1,
				f2: nextFeature.f2,
				f3: nextFeature.f3,
			});
		} else {
			// Fallback: use zero centroid
			centroids.push({ f1: 0, f2: 0, f3: 0 });
		}
	}

	return centroids;
}
