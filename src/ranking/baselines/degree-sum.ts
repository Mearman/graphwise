/**
 * Degree-Sum baseline ranking.
 *
 * Ranks paths by sum of node degrees.
 * Higher degree nodes may indicate more connected (central) nodes.
 * Score = sum(deg(v) for v in path), normalised to [0, 1].
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import type { BaselineConfig, BaselineResult, ScoredPath } from "./types";

/**
 * Rank paths by sum of node degrees.
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths (highest degree-sum first)
 */
export function degreeSum<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	config?: BaselineConfig,
): BaselineResult {
	const { includeScores = true } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "degree-sum",
		};
	}

	// Compute raw scores (sum of degrees)
	const scored: { path: ExpansionPath; score: number }[] = paths.map((path) => {
		let degreeSum = 0;
		for (const nodeId of path.nodes) {
			degreeSum += graph.degree(nodeId);
		}
		return { path, score: degreeSum };
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
			method: "degree-sum",
		};
	}

	// Normalise and sort
	const ranked: ScoredPath[] = scored
		.map(({ path, score }) => ({
			...path,
			score: includeScores ? score / maxScore : score,
		}))
		.sort((a, b) => b.score - a.score);

	return {
		paths: ranked,
		method: "degree-sum",
	};
}
