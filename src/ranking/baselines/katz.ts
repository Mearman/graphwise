/**
 * Katz baseline ranking.
 *
 * Truncated Katz centrality: score(s,t) = sum_{k=1}^{K} beta^k * walks_k(s,t)
 * Parameters: K=5 (truncation depth), beta=0.005 (safe damping < 1/lambda_1).
 * For path scoring: score(P) = katz(P.start, P.end), normalised to [0, 1].
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import type { BaselineConfig, BaselineResult, ScoredPath } from "./types";

/**
 * Compute truncated Katz centrality between two nodes.
 *
 * Uses iterative matrix-vector products to avoid full matrix powers.
 * score(s,t) = sum_{k=1}^{K} beta^k * walks_k(s,t)
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
	k = 5,
	beta = 0.005,
): number {
	const nodes = Array.from(graph.nodeIds());
	const nodeToIdx = new Map<string, number>();
	nodes.forEach((nodeId, idx) => {
		nodeToIdx.set(nodeId, idx);
	});

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
	let walks = new Float64Array(n);
	walks[targetIdx] = 1; // Base case: walks[target] = 1

	let katzScore = 0;

	// Iterate from depth 1 to k
	for (let depth = 1; depth <= k; depth++) {
		// Multiply by adjacency matrix: walks_next[i] = sum_j A[i,j] * walks[j]
		const walksNext = new Float64Array(n);

		for (const sourceNode of nodes) {
			const srcIdx = nodeToIdx.get(sourceNode);
			if (srcIdx === undefined) continue;

			const neighbours = graph.neighbours(sourceNode);
			for (const neighbourId of neighbours) {
				const nIdx = nodeToIdx.get(neighbourId);
				if (nIdx === undefined) continue;

				walksNext[srcIdx] = (walksNext[srcIdx] ?? 0) + (walks[nIdx] ?? 0);
			}
		}

		// Add contribution: beta^depth * walks_depth[source]
		const walkCount = walksNext[sourceIdx] ?? 0;
		katzScore += Math.pow(beta, depth) * walkCount;

		walks = walksNext;
	}

	return katzScore;
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
	paths: readonly ExpansionPath[],
	config?: BaselineConfig,
): BaselineResult {
	const { includeScores = true } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "katz",
		};
	}

	// Score paths by Katz between endpoints
	const scored: { path: ExpansionPath; score: number }[] = paths.map((path) => {
		const source = path.nodes[0];
		const target = path.nodes[path.nodes.length - 1];

		if (source === undefined || target === undefined) {
			return { path, score: 0 };
		}

		const katzScore = computeKatz(graph, source, target);
		return { path, score: katzScore };
	});

	// Find max for normalisation
	const maxScore = Math.max(...scored.map((s) => s.score));

	// Handle zero-max case
	if (maxScore === 0) {
		return {
			paths: paths.map((path) => ({
				...path,
				score: 0,
			})),
			method: "katz",
		};
	}

	// Normalise and sort
	const ranked: ScoredPath[] = scored
		.map(({ path, score }) => ({
			...path,
			score: includeScores ? score / maxScore : score / maxScore,
		}))
		.sort((a, b) => b.score - a.score);

	return {
		paths: ranked,
		method: "katz",
	};
}
