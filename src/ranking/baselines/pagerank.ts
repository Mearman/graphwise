/**
 * PageRank baseline ranking.
 *
 * Computes PageRank centrality for all nodes, then sums PR values per path.
 * Uses power iteration: r(v) = (1-d)/N + d * sum(r(u)/deg_out(u) for u->v)
 * Parameters: d=0.85 (damping factor), tolerance=1e-6, max 100 iterations.
 * Score = sum(pagerank(v) for v in path), normalised to [0, 1].
 *
 * GPU Support: When `config.gpu?.backend === 'gpu'` and a root is provided,
 * uses WebGPU-accelerated computation for improved performance on large graphs.
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExplorationPath } from "../../exploration/types";
import type { BaselineConfig, BaselineResult } from "./types";
import { gpuPageRank } from "../../gpu/operations";
import { normaliseAndRank } from "./utils";

/**
 * Compute PageRank centrality for all nodes using power iteration.
 *
 * @param graph - Source graph
 * @param damping - Damping factor (default 0.85)
 * @param tolerance - Convergence tolerance (default 1e-6)
 * @param maxIterations - Maximum iterations (default 100)
 * @returns Map of node ID to PageRank value
 */
function computePageRank<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	damping = 0.85,
	tolerance = 1e-6,
	maxIterations = 100,
): Map<string, number> {
	const nodes = Array.from(graph.nodeIds());
	const n = nodes.length;

	if (n === 0) {
		return new Map();
	}

	// Initialise ranks uniformly
	const ranks = new Map<string, number>();
	const newRanks = new Map<string, number>();
	for (const nodeId of nodes) {
		ranks.set(nodeId, 1 / n);
		newRanks.set(nodeId, 0);
	}

	// Power iteration
	let isCurrentRanks = true; // Track which map is current

	for (let iteration = 0; iteration < maxIterations; iteration++) {
		let maxChange = 0;
		const currMap = isCurrentRanks ? ranks : newRanks;
		const nextMap = isCurrentRanks ? newRanks : ranks;

		for (const nodeId of nodes) {
			// Sum contributions from incoming neighbours
			let incomingSum = 0;

			for (const incomingId of graph.neighbours(nodeId, "in")) {
				const incomingRank = currMap.get(incomingId) ?? 0;
				const outDegree = graph.degree(incomingId);
				if (outDegree > 0) {
					incomingSum += incomingRank / outDegree;
				}
			}

			// PageRank formula
			const newRank = (1 - damping) / n + damping * incomingSum;
			nextMap.set(nodeId, newRank);

			// Track convergence
			const oldRank = currMap.get(nodeId) ?? 0;
			maxChange = Math.max(maxChange, Math.abs(newRank - oldRank));
		}

		// Check convergence before swapping
		if (maxChange < tolerance) {
			break;
		}

		// Swap buffers and clear the old current map for next iteration
		isCurrentRanks = !isCurrentRanks;
		currMap.clear();
	}

	return isCurrentRanks ? ranks : newRanks;
}

/**
 * Rank paths by sum of PageRank scores.
 *
 * GPU Support: When `config.gpu?.backend === 'gpu'` and a GPU root is provided,
 * uses WebGPU-accelerated computation for improved performance on large graphs.
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths (highest PageRank sum first)
 */
export async function pagerankAsync<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExplorationPath[],
	config?: BaselineConfig,
): Promise<BaselineResult> {
	const { includeScores = true, gpu } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "pagerank",
		};
	}

	// Compute PageRank with GPU if available
	let ranks: Map<string, number>;

	if (gpu?.backend === "gpu" && gpu.root) {
		const result = await gpuPageRank(graph, {
			backend: "gpu",
			root: gpu.root,
		});
		// Convert Float32Array to Map
		const nodeIds = Array.from(graph.nodeIds());
		ranks = new Map();
		for (let i = 0; i < nodeIds.length; i++) {
			const nodeId = nodeIds[i];
			const score = result.value[i];
			if (nodeId !== undefined && score !== undefined) {
				ranks.set(nodeId, score);
			}
		}
	} else {
		ranks = computePageRank(graph);
	}

	// Score paths by sum of node ranks
	const scored: { path: ExplorationPath; score: number }[] = paths.map(
		(path) => {
			let prSum = 0;
			for (const nodeId of path.nodes) {
				prSum += ranks.get(nodeId) ?? 0;
			}
			return { path, score: prSum };
		},
	);

	return normaliseAndRank(paths, scored, "pagerank", includeScores);
}

/**
 * Rank paths by sum of PageRank scores (synchronous version).
 *
 * This synchronous version uses CPU computation only.
 * For GPU support, use the async `pagerankAsync` function.
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths (highest PageRank sum first)
 */
export function pagerank<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExplorationPath[],
	config?: BaselineConfig,
): BaselineResult {
	const { includeScores = true } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "pagerank",
		};
	}

	// Compute PageRank (CPU only for sync version)
	const ranks = computePageRank(graph);

	// Score paths by sum of node ranks
	const scored: { path: ExplorationPath; score: number }[] = paths.map(
		(path) => {
			let prSum = 0;
			for (const nodeId of path.nodes) {
				prSum += ranks.get(nodeId) ?? 0;
			}
			return { path, score: prSum };
		},
	);

	return normaliseAndRank(paths, scored, "pagerank", includeScores);
}
