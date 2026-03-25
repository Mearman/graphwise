/**
 * Baseline path ranking methods.
 *
 * These provide comparison points for PARSE evaluation.
 *
 * @module ranking/baselines
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import type { GPUComputeOptions } from "../../gpu/types";

/**
 * Configuration for baseline ranking methods.
 */
export interface BaselineConfig {
	/** Whether to include scores in result */
	readonly includeScores?: boolean;
	/** GPU acceleration options */
	readonly gpu?: GPUComputeOptions;
}

/**
 * A scored path from baseline ranking.
 */
export interface ScoredPath extends ExpansionPath {
	/** Ranking score */
	readonly score: number;
}

/**
 * Result from baseline ranking.
 */
export interface BaselineResult {
	/** Paths ranked by score */
	readonly paths: readonly ScoredPath[];
	/** Ranking method name */
	readonly method: string;
}

/**
 * Path ranking function type.
 */
export type PathRanker<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> = (
	graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	config?: BaselineConfig,
) => BaselineResult;
