/**
 * Communicability baseline ranking.
 *
 * Computes communicability between nodes using truncated Taylor series.
 * (e^A)_{s,t} ≈ sum_{k=0}^{15} A^k_{s,t} / k!
 * For path scoring: score(P) = communicability(P.start, P.end), normalised to [0, 1].
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

/** Taylor terms of the matrix exponential that are summed. */
const COMMUNICABILITY_DEPTH = 15;

/**
 * Series weights for communicability: 1 / d! for d from 0 (the identity term) to the depth.
 */
function communicabilityCoefficients(
	k = COMMUNICABILITY_DEPTH,
): readonly number[] {
	const weights: number[] = [1];
	let factorial = 1;
	for (let depth = 1; depth <= k; depth++) {
		factorial *= depth;
		weights.push(1 / factorial);
	}
	return weights;
}

/**
 * Compute communicability between two nodes.
 *
 * Uses the Taylor expansion (e^A)_{s,t} approximated by the sum over d of A^d_{s,t} / d!.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param k - Truncation depth (default 15)
 * @returns Communicability score
 */
function computeCommunicability<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: string,
	target: string,
	k = COMMUNICABILITY_DEPTH,
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
		communicabilityCoefficients(k),
	);
	return scored[0]?.score ?? 0;
}

/**
 * Rank paths by communicability between endpoints.
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths (highest communicability first)
 */
export function communicability<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExplorationPath[],
	config?: BaselineConfig,
): BaselineResult {
	const { includeScores = true } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "communicability",
		};
	}

	// Score paths by communicability between endpoints, propagating walks once per anchor endpoint
	const scored = scorePathsByWalkSeries(
		graph,
		paths,
		communicabilityCoefficients(),
	);

	return normaliseAndRank(paths, scored, "communicability", includeScores);
}

/**
 * Compute communicability between two nodes using GPU SpMV.
 *
 * Uses Taylor series expansion with GPU-accelerated matrix-vector products.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param nodeToIdx - Node ID to index mapping
 * @param n - Number of nodes
 * @param k - Truncation depth (default 15)
 * @param gpuOptions - GPU compute options
 * @returns Promise resolving to communicability score
 */
async function computeCommunicabilityGPU<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: ReadableGraph<N, E>,
	source: string,
	target: string,
	nodeToIdx: Map<string, number>,
	n: number,
	k: number,
	gpuOptions: GPUComputeOptions,
): Promise<number> {
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

	// Compute sum: sum_{k=0}^{K} A^k_{s,t} / k!
	let commScore = walks[sourceIdx] ?? 0; // k=0 term (identity matrix)

	let factorial = 1;

	// Iterate from k=1 to k
	for (let depth = 1; depth <= k; depth++) {
		// Use GPU SpMV: walks_next = A * walks
		const result = await gpuSpmv(graph, walks, gpuOptions);
		const walksNext = new Float32Array(result.value); // Copy to ensure ArrayBuffer type

		factorial *= depth;

		// Add contribution: A^depth[s,t] / k!
		commScore += (walksNext[sourceIdx] ?? 0) / factorial;

		walks = walksNext;
	}

	return commScore;
}

/**
 * Rank paths by communicability between endpoints (async with GPU support).
 *
 * GPU Support: When `config.gpu?.backend === 'gpu'` and a GPU root is provided,
 * uses WebGPU-accelerated SpMV for improved performance on large graphs.
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Promise resolving to ranked paths (highest communicability first)
 */
export async function communicabilityAsync<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExplorationPath[],
	config?: BaselineConfig,
): Promise<BaselineResult> {
	const { includeScores = true, gpu } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "communicability",
		};
	}

	// Build node index mapping once for all computations
	const nodes = Array.from(graph.nodeIds());
	const nodeToIdx = new Map<string, number>();
	nodes.forEach((nodeId, idx) => {
		nodeToIdx.set(nodeId, idx);
	});

	// Score paths by communicability between endpoints
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

			const commScore = await computeCommunicabilityGPU(
				graph,
				source,
				target,
				nodeToIdx,
				nodes.length,
				15,
				{ backend: "gpu", root: gpu.root },
			);
			scored.push({ path, score: commScore });
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

			const commScore = computeCommunicability(graph, source, target);
			scored.push({ path, score: commScore });
		}
	}

	return normaliseAndRank(paths, scored, "communicability", includeScores);
}
