/**
 * GPU-accelerated PARSE (Path-Aware Ranking via Salience Estimation).
 *
 * Ranks discovered paths using batched GPU MI computation.
 * All edge-MI calls across all paths are batched into one GPU dispatch,
 * then geometric mean is computed per path on CPU.
 *
 * @module ranking/parse-gpu
 */

import type { NodeData, EdgeData, NodeId, ReadableGraph } from "../graph";
import type { ExplorationPath } from "../exploration/types";
import type { MIVariantName } from "./mi/types";
import type { PARSEResult, RankedPath } from "./parse";
import type { ComputeBackend } from "../gpu/types";
import { gpuMIBatch } from "../gpu/operations";

/**
 * Configuration for GPU-accelerated PARSE ranking.
 */
export interface GPUPARSEConfig {
	/** MI variant to use (default: jaccard) */
	readonly mi?: MIVariantName;
	/** Minimum epsilon for MI (default: 1e-10) */
	readonly epsilon?: number;
	/** Whether to include salience scores in result (default: true) */
	readonly includeSalience?: boolean;
	/** GPU backend to use (default: auto-detect) */
	readonly backend?: ComputeBackend;
}

/**
 * Rank paths using GPU-accelerated PARSE.
 *
 * Collects all unique edge pairs across all paths, computes MI for all
 * edges in a single GPU batch call, then computes geometric mean per path.
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths with statistics
 */
export async function parseGpu<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExplorationPath[],
	config?: GPUPARSEConfig,
): Promise<PARSEResult> {
	const startTime = performance.now();

	const { mi = "jaccard", epsilon = 1e-10 } = config ?? {};

	// Phase 1: Collect all unique edge pairs across all paths
	const edgePairs = new Map<string, readonly [NodeId, NodeId]>();
	const pathEdges: (readonly [NodeId, NodeId])[][] = [];

	for (const path of paths) {
		const edges: (readonly [NodeId, NodeId])[] = [];
		const nodes = path.nodes;

		for (let i = 0; i < nodes.length - 1; i++) {
			const source = nodes[i];
			const target = nodes[i + 1];

			if (source !== undefined && target !== undefined) {
				// Normalise edge order for undirected graphs
				const [u, v] = source < target ? [source, target] : [target, source];
				const key = `${u}:${v}`;
				edgePairs.set(key, [u, v]);
				edges.push([u, v]);
			}
		}

		pathEdges.push(edges);
	}

	// Phase 2: Single GPU batch call for all unique edges
	const uniquePairs = Array.from(edgePairs.values());
	const edgeToMI = new Map<string, number>();

	if (uniquePairs.length > 0) {
		const batchResult = await gpuMIBatch(graph, uniquePairs, mi, {
			backend: config?.backend ?? "auto",
		});

		// Build lookup map from edge key to MI score
		for (let i = 0; i < uniquePairs.length; i++) {
			const pair = uniquePairs[i];
			if (pair !== undefined) {
				const [u, v] = pair;
				const key = `${u}:${v}`;
				const score = batchResult.value.scores[i];
				edgeToMI.set(key, score ?? epsilon);
			}
		}
	}

	// Phase 3: Compute geometric mean per path using batched results
	const rankedPaths: RankedPath[] = [];

	for (let pathIdx = 0; pathIdx < paths.length; pathIdx++) {
		const path = paths[pathIdx];
		if (path === undefined) continue;
		const edges = pathEdges[pathIdx];

		if (edges === undefined || edges.length === 0) {
			rankedPaths.push({
				fromSeed: path.fromSeed,
				toSeed: path.toSeed,
				nodes: path.nodes,
				salience: epsilon,
			});
			continue;
		}

		// Compute geometric mean of edge MI scores
		let productMi = 1;
		let edgeCount = 0;

		for (const [u, v] of edges) {
			const key = `${u}:${v}`;
			const edgeMi = edgeToMI.get(key) ?? epsilon;
			productMi *= Math.max(epsilon, edgeMi);
			edgeCount++;
		}

		// Geometric mean
		const salience =
			edgeCount > 0 ? Math.pow(productMi, 1 / edgeCount) : epsilon;
		const clampedSalience = Math.max(epsilon, Math.min(1, salience));

		rankedPaths.push({
			fromSeed: path.fromSeed,
			toSeed: path.toSeed,
			nodes: path.nodes,
			salience: clampedSalience,
		});
	}

	// Phase 4: Sort by salience descending
	rankedPaths.sort((a, b) => b.salience - a.salience);

	const endTime = performance.now();

	// Compute statistics
	const saliences = rankedPaths.map((p) => p.salience);
	const meanSalience =
		saliences.length > 0
			? saliences.reduce((a, b) => a + b, 0) / saliences.length
			: 0;
	const sortedSaliences = [...saliences].sort((a, b) => a - b);
	const mid = Math.floor(sortedSaliences.length / 2);
	const medianSalience =
		sortedSaliences.length > 0
			? sortedSaliences.length % 2 !== 0
				? (sortedSaliences[mid] ?? 0)
				: ((sortedSaliences[mid - 1] ?? 0) + (sortedSaliences[mid] ?? 0)) / 2
			: 0;
	const maxSalience =
		sortedSaliences.length > 0
			? (sortedSaliences[sortedSaliences.length - 1] ?? 0)
			: 0;
	const minSalience =
		sortedSaliences.length > 0 ? (sortedSaliences[0] ?? 0) : 0;

	return {
		paths: rankedPaths,
		stats: {
			pathsRanked: rankedPaths.length,
			meanSalience,
			medianSalience,
			maxSalience,
			minSalience,
			durationMs: endTime - startTime,
		},
	};
}
