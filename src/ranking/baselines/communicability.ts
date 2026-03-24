/**
 * Communicability baseline ranking.
 *
 * Computes communicability between nodes using truncated Taylor series.
 * (e^A)_{s,t} ≈ sum_{k=0}^{15} A^k_{s,t} / k!
 * For path scoring: score(P) = communicability(P.start, P.end), normalised to [0, 1].
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import type { BaselineConfig, BaselineResult, ScoredPath } from "./types";

/**
 * Compute truncated communicability between two nodes.
 *
 * Uses Taylor series expansion: (e^A)_{s,t} ≈ sum_{k=0}^{K} A^k_{s,t} / k!
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
	k = 15,
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

	// Current column of A^depth
	let walks = new Float64Array(n);
	walks[targetIdx] = 1; // Base case: walks[target] = 1

	// Compute sum: sum_{k=0}^{K} A^k_{s,t} / k!
	let commScore = walks[sourceIdx] ?? 0; // k=0 term (identity matrix): A^0 = I, so [I]_{s,t} = delta_{s,t}

	let factorial = 1;

	// Iterate from k=1 to k
	for (let depth = 1; depth <= k; depth++) {
		// Multiply by adjacency matrix: walks_next[i] = sum_j A[i,j] * walks[j]
		const walksNext = new Float64Array(n);

		for (const fromNode of nodes) {
			const fromIdx = nodeToIdx.get(fromNode);
			if (fromIdx === undefined) continue;

			const neighbours = graph.neighbours(fromNode);
			for (const toNodeId of neighbours) {
				const toIdx = nodeToIdx.get(toNodeId);
				if (toIdx === undefined) continue;

				walksNext[fromIdx] = (walksNext[fromIdx] ?? 0) + (walks[toIdx] ?? 0);
			}
		}

		factorial *= depth;

		// Add contribution: A^depth[s,t] / k!
		commScore += (walksNext[sourceIdx] ?? 0) / factorial;

		walks = walksNext;
	}

	return commScore;
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
	paths: readonly ExpansionPath[],
	config?: BaselineConfig,
): BaselineResult {
	const { includeScores = true } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "communicability",
		};
	}

	// Score paths by communicability between endpoints
	const scored: { path: ExpansionPath; score: number }[] = paths.map((path) => {
		const source = path.nodes[0];
		const target = path.nodes[path.nodes.length - 1];

		if (source === undefined || target === undefined) {
			return { path, score: 0 };
		}

		const commScore = computeCommunicability(graph, source, target);
		return { path, score: commScore };
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
			method: "communicability",
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
		method: "communicability",
	};
}
