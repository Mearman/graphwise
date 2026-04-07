/**
 * Shared utilities for baseline ranking methods.
 *
 * @packageDocumentation
 */

import type { ExplorationPath } from "../../exploration/types";
import type { BaselineResult, ScoredPath } from "./types";

/**
 * Normalise a set of scored paths and return them sorted highest-first.
 *
 * All scores are normalised relative to the maximum observed score.
 * When `includeScores` is false, raw (un-normalised) scores are preserved.
 * Handles degenerate cases: empty input and all-zero scores.
 *
 * @param paths - Original paths in input order
 * @param scored - Paths paired with their computed scores
 * @param method - Method name to embed in the result
 * @param includeScores - When true, normalise scores to [0, 1]; when false, keep raw scores
 * @returns BaselineResult with ranked paths
 */
export function normaliseAndRank(
	paths: readonly ExplorationPath[],
	scored: readonly { readonly path: ExplorationPath; readonly score: number }[],
	method: string,
	includeScores: boolean,
): BaselineResult {
	if (scored.length === 0) {
		return { paths: [], method };
	}

	const maxScore = Math.max(...scored.map((s) => s.score));

	// Handle zero-max case: all paths get score 0
	if (maxScore === 0) {
		return {
			paths: paths.map((path) => ({ ...path, score: 0 })),
			method,
		};
	}

	const ranked: ScoredPath[] = scored
		.map(({ path, score }) => ({
			...path,
			score: includeScores ? score / maxScore : score,
		}))
		.sort((a, b) => b.score - a.score);

	return { paths: ranked, method };
}
