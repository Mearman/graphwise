/**
 * Random-Ranking baseline.
 *
 * Null hypothesis baseline: ranks paths by seeded random scores.
 * Uses deterministic hash for reproducibility.
 * Score = seededRandom(nodes.join(','), seed), normalised to [0, 1].
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import type { BaselineConfig, BaselineResult, ScoredPath } from "./types";

/**
 * Configuration for random ranking.
 */
interface RandomRankingConfig extends BaselineConfig {
	/** Random seed for deterministic reproducibility */
	readonly seed?: number;
}

/**
 * Deterministic seeded random number generator.
 * Uses FNV-1a-like hash for input → [0, 1] output.
 *
 * @param input - String to hash
 * @param seed - Random seed for reproducibility
 * @returns Deterministic random value in [0, 1]
 */
function seededRandom(input: string, seed = 0): number {
	let h = seed;
	for (let i = 0; i < input.length; i++) {
		h = Math.imul(h ^ input.charCodeAt(i), 0x9e3779b9);

		h ^= h >>> 16;
	}

	return (h >>> 0) / 0xffffffff;
}

/**
 * Rank paths randomly (null hypothesis baseline).
 *
 * @param _graph - Source graph (unused)
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths (randomly ordered)
 */
export function randomRanking<N extends NodeData, E extends EdgeData>(
	_graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	config?: RandomRankingConfig,
): BaselineResult {
	const { includeScores = true, seed = 0 } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "random",
		};
	}

	// Score paths by seeded random hash of node list
	const scored: { path: ExpansionPath; score: number }[] = paths.map((path) => {
		const nodesKey = path.nodes.join(",");
		const score = seededRandom(nodesKey, seed);
		return { path, score };
	});

	// Find max for normalisation
	const maxScore = Math.max(...scored.map((s) => s.score));

	// Handle zero-max case (very unlikely)
	if (maxScore === 0) {
		return {
			paths: paths.map((path) => ({
				...path,
				score: 0,
			})),
			method: "random",
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
		method: "random",
	};
}
