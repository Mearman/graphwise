/**
 * GRASP — Graph-agnostic Representative Seed pAir Sampling.
 *
 * Novel blind structural seed selection algorithm that selects structurally
 * representative seed pairs without requiring domain knowledge or loading
 * the full graph into memory.
 *
 * Three phases:
 * 1. Reservoir sampling — stream edges, maintain reservoir of N nodes
 * 2. Structural feature computation — log-degree, clustering coeff, approx PageRank
 * 3. Mini-batch K-means clustering, then sample pairs within and across clusters
 *
 * @packageDocumentation
 */

import type { ReadableGraph, NodeId } from "../graph";
import type { Seed } from "../schemas/index";
import {
	miniBatchKMeans,
	zScoreNormalise,
	type LabelledFeature,
	type FeatureVector3D,
} from "../utils/kmeans";

/**
 * Configuration options for GRASP seed selection.
 */
export interface GraspOptions {
	/** Number of clusters for K-means (default: 100) */
	readonly nClusters?: number;
	/** Number of pairs to sample per cluster (default: 10) */
	readonly pairsPerCluster?: number;
	/** Ratio of within-cluster pairs vs cross-cluster pairs (default: 0.5) */
	readonly withinClusterRatio?: number;
	/** Reservoir sample size (default: 200000) */
	readonly sampleSize?: number;
	/** Random seed for reproducibility (default: 42) */
	readonly rngSeed?: number;
	/** Number of PageRank iterations for feature computation (default: 10) */
	readonly pagerankIterations?: number;
}

/**
 * A sampled seed pair with structural metadata.
 */
export interface GraspSeedPair {
	/** Source seed */
	readonly source: Seed;
	/** Target seed */
	readonly target: Seed;
	/** Euclidean distance in feature space */
	readonly featureDistance: number;
	/** Whether both seeds are from the same cluster */
	readonly sameCluster: boolean;
	/** Cluster index of source (or -1 if unclustered) */
	readonly sourceCluster: number;
	/** Cluster index of target (or -1 if unclustered) */
	readonly targetCluster: number;
}

/**
 * Result of GRASP seed selection.
 */
export interface GraspResult {
	/** Sampled seed pairs */
	readonly pairs: readonly GraspSeedPair[];
	/** Number of clusters used */
	readonly nClusters: number;
	/** Total nodes sampled */
	readonly sampledNodeCount: number;
	/** Features computed for sampled nodes */
	readonly features: readonly LabelledFeature[];
	/** Cluster assignments (nodeId -> cluster index) */
	readonly clusterAssignments: ReadonlyMap<string, number>;
}

/** Default configuration values */
const DEFAULTS = {
	nClusters: 100,
	pairsPerCluster: 10,
	withinClusterRatio: 0.5,
	sampleSize: 200000,
	rngSeed: 42,
	pagerankIterations: 10,
} as const;

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
 * Reservoir sampling (Vitter's Algorithm R) for streaming node selection.
 *
 * Maintains a uniform sample of nodes as edges are streamed, without
 * requiring the full graph in memory.
 */
function reservoirSample(
	graph: ReadableGraph,
	sampleSize: number,
	rng: () => number,
): { nodeIds: Set<NodeId>; neighbourMap: Map<NodeId, Set<NodeId>> } {
	const reservoir: NodeId[] = [];
	const neighbourMap = new Map<NodeId, Set<NodeId>>();
	const inReservoir = new Set<NodeId>();

	// Track total nodes seen for reservoir probability
	let nodesSeen = 0;

	// Stream all edges and sample nodes
	for (const edge of graph.edges()) {
		// Process source node
		const source = edge.source;
		if (!inReservoir.has(source)) {
			nodesSeen++;
			if (reservoir.length < sampleSize) {
				reservoir.push(source);
				inReservoir.add(source);
				neighbourMap.set(source, new Set<NodeId>());
			} else {
				// Reservoir sampling: replace with probability sampleSize/nodesSeen
				const j = Math.floor(rng() * nodesSeen);
				if (j < sampleSize) {
					const oldNode = reservoir[j];
					if (oldNode !== undefined) {
						inReservoir.delete(oldNode);
						neighbourMap.delete(oldNode);
					}
					reservoir[j] = source;
					inReservoir.add(source);
					neighbourMap.set(source, new Set<NodeId>());
				}
			}
		}

		// Process target node
		const target = edge.target;
		if (!inReservoir.has(target)) {
			nodesSeen++;
			if (reservoir.length < sampleSize) {
				reservoir.push(target);
				inReservoir.add(target);
				neighbourMap.set(target, new Set<NodeId>());
			} else {
				const j = Math.floor(rng() * nodesSeen);
				if (j < sampleSize) {
					const oldNode = reservoir[j];
					if (oldNode !== undefined) {
						inReservoir.delete(oldNode);
						neighbourMap.delete(oldNode);
					}
					reservoir[j] = target;
					inReservoir.add(target);
					neighbourMap.set(target, new Set<NodeId>());
				}
			}
		}

		// Store neighbour relationships for sampled nodes
		if (inReservoir.has(source) && inReservoir.has(target)) {
			const sourceNeighbours = neighbourMap.get(source);
			const targetNeighbours = neighbourMap.get(target);
			sourceNeighbours?.add(target);
			targetNeighbours?.add(source);
		}
	}

	return { nodeIds: inReservoir, neighbourMap };
}

/**
 * Compute approximate PageRank scores using power iteration on the reservoir subgraph.
 *
 * This is an approximation since it only considers the sampled nodes and their
 * connections within the reservoir, not the full graph.
 */
function approximatePageRank(
	nodeIds: Set<NodeId>,
	neighbourMap: Map<NodeId, Set<NodeId>>,
	iterations: number,
	dampingFactor = 0.85,
): Map<NodeId, number> {
	const n = nodeIds.size;
	if (n === 0) return new Map();

	const nodeIdList = [...nodeIds];
	const nodeIndex = new Map(nodeIdList.map((id, i) => [id, i] as const));

	// Initialise PageRank scores uniformly
	const scores = new Float64Array(n).fill(1 / n);
	const newScores = new Float64Array(n);

	// Power iteration
	for (let iter = 0; iter < iterations; iter++) {
		newScores.fill((1 - dampingFactor) / n);

		for (let i = 0; i < n; i++) {
			const nodeId = nodeIdList[i];
			if (nodeId === undefined) continue;

			const neighbours = neighbourMap.get(nodeId);
			if (neighbours === undefined) continue;

			const outDegree = neighbours.size;
			if (outDegree === 0) continue;

			const contribution = (dampingFactor * (scores[i] ?? 0)) / outDegree;

			for (const neighbour of neighbours) {
				const neighbourIdx = nodeIndex.get(neighbour);
				if (neighbourIdx !== undefined) {
					newScores[neighbourIdx] =
						(newScores[neighbourIdx] ?? 0) + contribution;
				}
			}
		}

		// Swap buffers
		for (let i = 0; i < n; i++) {
			scores[i] = newScores[i] ?? 0;
		}
	}

	// Build result map
	const result = new Map<NodeId, number>();
	for (let i = 0; i < n; i++) {
		const nodeId = nodeIdList[i];
		const score = scores[i];
		if (nodeId !== undefined && score !== undefined) {
			result.set(nodeId, score);
		}
	}

	return result;
}

/**
 * Compute structural features for sampled nodes.
 *
 * Features:
 * - f1: log(deg(v) + 1) — scale-normalised connectivity
 * - f2: clustering_coefficient(v) — local density
 * - f3: approx_pagerank(v) — positional importance
 */
function computeFeatures(
	graph: ReadableGraph,
	nodeIds: Set<NodeId>,
	neighbourMap: Map<NodeId, Set<NodeId>>,
	pagerankScores: Map<NodeId, number>,
): LabelledFeature[] {
	const features: LabelledFeature[] = [];

	for (const nodeId of nodeIds) {
		const degree = graph.degree(nodeId, "both");
		const neighbours = neighbourMap.get(nodeId);

		// Compute local clustering coefficient using neighbour map
		let clusteringCoef = 0;
		if (neighbours !== undefined && neighbours.size >= 2) {
			let triangleCount = 0;
			const neighbourList = [...neighbours];

			for (let i = 0; i < neighbourList.length; i++) {
				for (let j = i + 1; j < neighbourList.length; j++) {
					const u = neighbourList[i];
					const w = neighbourList[j];
					if (u !== undefined && w !== undefined) {
						// Check if u and w are connected
						const uNeighbours = neighbourMap.get(u);
						if (uNeighbours?.has(w) === true) {
							triangleCount++;
						}
					}
				}
			}

			const possibleTriangles = (degree * (degree - 1)) / 2;
			clusteringCoef = triangleCount / possibleTriangles;
		}

		const pagerank = pagerankScores.get(nodeId) ?? 0;

		features.push({
			nodeId,
			f1: Math.log(degree + 1),
			f2: clusteringCoef,
			f3: pagerank,
		});
	}

	return features;
}

/**
 * Sample seed pairs from clusters.
 *
 * For each cluster, samples a mix of within-cluster and cross-cluster pairs.
 */
function samplePairs(
	features: readonly LabelledFeature[],
	clusterAssignments: ReadonlyMap<string, number>,
	nClusters: number,
	pairsPerCluster: number,
	withinClusterRatio: number,
	rng: () => number,
): GraspSeedPair[] {
	const pairs: GraspSeedPair[] = [];

	// Group nodes by cluster
	const clusterNodes = new Map<number, LabelledFeature[]>();
	for (const feature of features) {
		const cluster = clusterAssignments.get(feature.nodeId);
		if (cluster === undefined) continue;

		let nodes = clusterNodes.get(cluster);
		if (nodes === undefined) {
			nodes = [];
			clusterNodes.set(cluster, nodes);
		}
		nodes.push(feature);
	}

	const withinCount = Math.floor(pairsPerCluster * withinClusterRatio);
	const crossCount = pairsPerCluster - withinCount;

	// Sample pairs for each cluster
	for (let clusterIdx = 0; clusterIdx < nClusters; clusterIdx++) {
		const nodes = clusterNodes.get(clusterIdx);
		if (nodes === undefined || nodes.length < 2) continue;

		// Within-cluster pairs
		for (let i = 0; i < withinCount; i++) {
			// Sample two distinct nodes
			const idx1 = Math.floor(rng() * nodes.length);
			let idx2 = Math.floor(rng() * nodes.length);
			while (idx1 === idx2) {
				idx2 = Math.floor(rng() * nodes.length);
			}

			const source = nodes[idx1];
			const target = nodes[idx2];
			if (source === undefined || target === undefined) continue;

			const distance = computeFeatureDistance(source, target);

			pairs.push({
				source: { id: source.nodeId },
				target: { id: target.nodeId },
				featureDistance: distance,
				sameCluster: true,
				sourceCluster: clusterIdx,
				targetCluster: clusterIdx,
			});
		}

		// Cross-cluster pairs
		for (let i = 0; i < crossCount; i++) {
			const source = nodes[Math.floor(rng() * nodes.length)];
			if (source === undefined) continue;

			// Pick a random other cluster
			const otherClusterIdx = Math.floor(rng() * nClusters);
			if (otherClusterIdx === clusterIdx) continue;

			const otherNodes = clusterNodes.get(otherClusterIdx);
			if (otherNodes === undefined || otherNodes.length === 0) continue;

			const target = otherNodes[Math.floor(rng() * otherNodes.length)];
			if (target === undefined) continue;

			const distance = computeFeatureDistance(source, target);

			pairs.push({
				source: { id: source.nodeId },
				target: { id: target.nodeId },
				featureDistance: distance,
				sameCluster: false,
				sourceCluster: clusterIdx,
				targetCluster: otherClusterIdx,
			});
		}
	}

	return pairs;
}

/**
 * Compute Euclidean distance between two feature vectors.
 */
function computeFeatureDistance(
	a: FeatureVector3D,
	b: FeatureVector3D,
): number {
	const d1 = a.f1 - b.f1;
	const d2 = a.f2 - b.f2;
	const d3 = a.f3 - b.f3;
	return Math.sqrt(d1 * d1 + d2 * d2 + d3 * d3);
}

/**
 * GRASP — Graph-agnostic Representative Seed pAir Sampling.
 *
 * Selects structurally representative seed pairs without domain knowledge.
 * The algorithm streams edges, samples nodes via reservoir sampling, computes
 * structural features, clusters nodes, and samples pairs within/across clusters.
 *
 * @param graph - The graph to sample seeds from
 * @param options - Configuration options
 * @returns Sampled seed pairs with structural metadata
 *
 * @example
 * ```typescript
 * const graph = new AdjacencyMapGraph();
 * // ... populate graph ...
 *
 * const result = grasp(graph, {
 *   nClusters: 50,
 *   pairsPerCluster: 20,
 *   sampleSize: 100000,
 * });
 *
 * console.log(`Sampled ${result.pairs.length} pairs from ${result.sampledNodeCount} nodes`);
 * ```
 */
export function grasp(
	graph: ReadableGraph,
	options: GraspOptions = {},
): GraspResult {
	const config = {
		...DEFAULTS,
		...options,
	};

	const rng = createRNG(config.rngSeed);

	// Phase 1: Reservoir sampling
	const { nodeIds, neighbourMap } = reservoirSample(
		graph,
		config.sampleSize,
		rng,
	);

	// Phase 2: Approximate PageRank on reservoir subgraph
	const pagerankScores = approximatePageRank(
		nodeIds,
		neighbourMap,
		config.pagerankIterations,
	);

	// Phase 2: Compute structural features
	let features = computeFeatures(graph, nodeIds, neighbourMap, pagerankScores);

	// Normalise features
	if (features.length > 0) {
		features = zScoreNormalise(features);
	}

	// Phase 3: K-means clustering
	const k = Math.min(config.nClusters, features.length);
	const kmeansResult = miniBatchKMeans(features, {
		k,
		seed: config.rngSeed,
		maxIterations: 100,
	});

	// Phase 3: Sample pairs
	const pairs = samplePairs(
		features,
		kmeansResult.assignments,
		kmeansResult.k,
		config.pairsPerCluster,
		config.withinClusterRatio,
		rng,
	);

	return {
		pairs,
		nClusters: kmeansResult.k,
		sampledNodeCount: nodeIds.size,
		features,
		clusterAssignments: kmeansResult.assignments,
	};
}
