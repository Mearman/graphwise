/**
 * Widest-Path baseline ranking.
 *
 * Ranks paths by bottleneck similarity (minimum edge salience).
 * Uses Jaccard similarity as the edge salience metric.
 * Score = min(jaccard(u, v) for each edge (u,v) in path).
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import type { BaselineConfig, BaselineResult, ScoredPath } from "./types";
import { jaccard } from "../mi/jaccard";

/**
 * Rank paths by widest bottleneck (minimum edge similarity).
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths (highest bottleneck first)
 */
export function widestPath<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	config?: BaselineConfig,
): BaselineResult {
	const { includeScores = true } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "widest-path",
		};
	}

	// Compute raw scores (minimum edge similarity per path)
	const scored: { path: ExpansionPath; score: number }[] = paths.map((path) => {
		if (path.nodes.length < 2) {
			// Single-node path: no edges
			return { path, score: 1 };
		}

		let minSimilarity = Number.POSITIVE_INFINITY;
		for (let i = 0; i < path.nodes.length - 1; i++) {
			const source = path.nodes[i];
			const target = path.nodes[i + 1];
			if (source === undefined || target === undefined) continue;

			const edgeSimilarity = jaccard(graph, source, target);
			minSimilarity = Math.min(minSimilarity, edgeSimilarity);
		}

		// If no edges were found, default to 1
		const score =
			minSimilarity === Number.POSITIVE_INFINITY ? 1 : minSimilarity;
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
			method: "widest-path",
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
		method: "widest-path",
	};
}
