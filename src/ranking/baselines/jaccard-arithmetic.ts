/**
 * Jaccard-Arithmetic baseline ranking.
 *
 * Ranks paths by arithmetic mean of edge Jaccard similarities.
 * Contrast with PARSE which uses geometric mean.
 * Score = (1/k) * sum(jaccard(u, v) for each edge (u,v)).
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import type { BaselineConfig, BaselineResult, ScoredPath } from "./types";
import { jaccard } from "../mi/jaccard";

/**
 * Rank paths by arithmetic mean of edge Jaccard similarities.
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths (highest arithmetic mean first)
 */
export function jaccardArithmetic<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	config?: BaselineConfig,
): BaselineResult {
	const { includeScores = true } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "jaccard-arithmetic",
		};
	}

	// Compute raw scores (arithmetic mean of edge similarities)
	const scored: { path: ExpansionPath; score: number }[] = paths.map((path) => {
		if (path.nodes.length < 2) {
			// Single-node path: no edges, score = 1
			return { path, score: 1 };
		}

		let similaritySum = 0;
		let edgeCount = 0;

		for (let i = 0; i < path.nodes.length - 1; i++) {
			const source = path.nodes[i];
			const target = path.nodes[i + 1];
			if (source === undefined || target === undefined) continue;

			const edgeSimilarity = jaccard(graph, source, target);
			similaritySum += edgeSimilarity;
			edgeCount++;
		}

		// Arithmetic mean
		const score = edgeCount > 0 ? similaritySum / edgeCount : 1;
		return { path, score };
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
			method: "jaccard-arithmetic",
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
		method: "jaccard-arithmetic",
	};
}
