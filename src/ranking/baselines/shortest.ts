/**
 * Shortest path baseline ranking.
 *
 * Ranks paths by length (shorter = higher score).
 * Score = 1 / length (normalised).
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import type { BaselineConfig, BaselineResult } from "./types";
import { normaliseAndRank } from "./utils";

/**
 * Rank paths by length (shortest first).
 *
 * Score = 1 / path_length, normalised to [0, 1].
 *
 * @param _graph - Source graph (unused for length ranking)
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths (shortest first)
 */
export function shortest<N extends NodeData, E extends EdgeData>(
	_graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	config?: BaselineConfig,
): BaselineResult {
	const { includeScores = true } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "shortest",
		};
	}

	// Compute raw scores (1 / length)
	const scored: { path: ExpansionPath; score: number }[] = paths.map(
		(path) => ({
			path,
			score: 1 / path.nodes.length,
		}),
	);

	return normaliseAndRank(paths, scored, "shortest", includeScores);
}
