/**
 * Katz baseline ranking.
 *
 * Truncated Katz centrality: score(s,t) = sum_{k=1}^{K} beta^k * walks_k(s,t)
 * Parameters: K=5 (truncation depth), beta=0.005 (safe damping < 1/lambda_1).
 * For path scoring: score(P) = katz(P.start, P.end), normalised to [0, 1].
 *
 * GPU Support: When `config.gpu?.backend === 'gpu'` and a root is provided,
 * uses WebGPU-accelerated SpMV for improved performance on large graphs.
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExplorationPath } from "../../exploration/types";
import type { BaselineConfig, BaselineResult } from "./types";
import { normaliseAndRank, scorePathsByWalkSeries } from "./utils";
import { gpuSpmv } from "../../gpu/operations";
import type { GPUComputeOptions } from "../../gpu/types";

/** Walk lengths summed by the Katz score. */
const KATZ_DEPTH = 5;

/** Attenuation applied per walk step. */
const KATZ_BETA = 0.005;

/**
 * Series weights for Katz: beta^d for walks of length d from 1 to the depth, nothing for the identity term.
 */
function katzCoefficients(k = KATZ_DEPTH, beta = KATZ_BETA): readonly number[] {
	return Array.from({ length: k + 1 }, (_, depth) =>
		depth === 0 ? 0 : Math.pow(beta, depth),
	);
}

/**
 * Compute Katz centrality between two nodes.
 *
 * Truncated Katz index: sum over d of beta^d times the number of walks of length d from source to target.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param k - Truncation depth (default 5)
 * @param beta - Attenuation factor (default 0.005)
 * @returns Katz score
 */
function computeKatz<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: string,
	target: string,
	k = KATZ_DEPTH,
	beta = KATZ_BETA,
): number {
	const scored = scorePathsByWalkSeries(
		graph,
		[
			{
				fromSeed: { id: source },
				toSeed: { id: target },
				nodes: [source, target],
			},
		],
		katzCoefficients(k, beta),
	);
	return scored[0]?.score ?? 0;
}

/**
 * Rank paths by Katz centrality between endpoints.
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths (highest Katz score first)
 */
export function katz<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExplorationPath[],
	config?: BaselineConfig,
): BaselineResult {
	const { includeScores = true } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "katz",
		};
	}

	// Score paths by Katz between endpoints, propagating walks once per anchor endpoint
	const scored = scorePathsByWalkSeries(graph, paths, katzCoefficients());

	return normaliseAndRank(paths, scored, "katz", includeScores);
}

/**
 * Compute Katz centrality between two nodes using GPU SpMV.
 *
 * Uses iterative SpMV operations for matrix-vector products.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param nodeToIdx - Node ID to index mapping
 * @param k - Truncation depth (default 5)
 * @param beta - Attenuation factor (default 0.005)
 * @param gpuOptions - GPU compute options
 * @returns Promise resolving to Katz score
 */
async function computeKatzGPU<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: string,
	target: string,
	nodeToIdx: Map<string, number>,
	k: number,
	beta: number,
	gpuOptions: GPUComputeOptions,
): Promise<number> {
	const nodes = Array.from(graph.nodeIds());
	const n = nodes.length;

	if (n === 0) {
		return 0;
	}

	const sourceIdx = nodeToIdx.get(source);
	const targetIdx = nodeToIdx.get(target);

	if (sourceIdx === undefined || targetIdx === undefined) {
		return 0;
	}

	// Current column of A^depth (number of walks of length depth from each node to target)
	let walks = new Float32Array(n);
	walks[targetIdx] = 1; // Base case: walks[target] = 1

	let katzScore = 0;

	// Iterate from depth 1 to k
	for (let depth = 1; depth <= k; depth++) {
		// Use GPU SpMV: walks_next = A * walks
		const result = await gpuSpmv(graph, walks, gpuOptions);
		const walksNext = new Float32Array(result.value); // Copy to ensure ArrayBuffer type

		// Add contribution: beta^depth * walks_depth[source]
		const walkCount = walksNext[sourceIdx] ?? 0;
		katzScore += Math.pow(beta, depth) * walkCount;

		walks = walksNext;
	}

	return katzScore;
}

/**
 * Rank paths by Katz centrality between endpoints (async with GPU support).
 *
 * GPU Support: When `config.gpu?.backend === 'gpu'` and a GPU root is provided,
 * uses WebGPU-accelerated SpMV for improved performance on large graphs.
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Promise resolving to ranked paths (highest Katz score first)
 */
export async function katzAsync<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExplorationPath[],
	config?: BaselineConfig,
): Promise<BaselineResult> {
	const { includeScores = true, gpu } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "katz",
		};
	}

	// Build node index mapping once for all computations
	const nodes = Array.from(graph.nodeIds());
	const nodeToIdx = new Map<string, number>();
	nodes.forEach((nodeId, idx) => {
		nodeToIdx.set(nodeId, idx);
	});

	// Score paths by Katz between endpoints
	const useGPU = gpu?.backend === "gpu" && gpu.root !== undefined;

	const scored: { path: ExplorationPath; score: number }[] = [];

	if (useGPU) {
		// Use GPU SpMV for each path
		for (const path of paths) {
			const source = path.nodes[0];
			const target = path.nodes[path.nodes.length - 1];

			if (source === undefined || target === undefined) {
				scored.push({ path, score: 0 });
				continue;
			}

			const katzScore = await computeKatzGPU(
				graph,
				source,
				target,
				nodeToIdx,
				5,
				0.005,
				{ backend: "gpu", root: gpu.root },
			);
			scored.push({ path, score: katzScore });
		}
	} else {
		// CPU fallback
		for (const path of paths) {
			const source = path.nodes[0];
			const target = path.nodes[path.nodes.length - 1];

			if (source === undefined || target === undefined) {
				scored.push({ path, score: 0 });
				continue;
			}

			const katzScore = computeKatz(graph, source, target);
			scored.push({ path, score: katzScore });
		}
	}

	return normaliseAndRank(paths, scored, "katz", includeScores);
}
