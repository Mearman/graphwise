/**
 * PARSE (Path-Aware Ranking via Salience Estimation).
 *
 * Ranks discovered paths by computing geometric mean of edge MI scores.
 * Path salience = (∏ MI(uᵢ, uᵢ₊₁))^(1/|path|)
 *
 * This ranking is length-unbiased: shorter paths with strong edges
 * can outrank longer paths with weak edges.
 *
 * @module ranking/parse
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type { ExplorationPath } from "../exploration/types";
import type { MIFunction, AsyncMIFunction } from "./mi/types";
import { jaccard } from "./mi/jaccard";
import { jaccardAsync } from "./mi/jaccard";

/**
 * Configuration for PARSE ranking.
 */
export interface PARSEConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> {
	/** MI function to use (default: jaccard) */
	readonly mi?: MIFunction<N, E>;
	/** Minimum epsilon for MI (default: 1e-10) */
	readonly epsilon?: number;
	/** Whether to include salience scores in result (default: true) */
	readonly includeSalience?: boolean;
}

/**
 * A ranked path with salience score.
 */
export interface RankedPath extends ExplorationPath {
	/** Salience score (geometric mean of edge MI) */
	readonly salience: number;
}

/**
 * Result of PARSE ranking.
 */
export interface PARSEResult {
	/** Paths ranked by salience (highest first) */
	readonly paths: readonly RankedPath[];
	/** Ranking statistics */
	readonly stats: {
		/** Total paths ranked */
		readonly pathsRanked: number;
		/** Mean salience */
		readonly meanSalience: number;
		/** Median salience */
		readonly medianSalience: number;
		/** Maximum salience */
		readonly maxSalience: number;
		/** Minimum salience */
		readonly minSalience: number;
		/** Ranking duration in milliseconds */
		readonly durationMs: number;
	};
}

/**
 * Rank paths using PARSE (Path-Aware Ranking via Salience Estimation).
 *
 * Computes geometric mean of edge MI scores for each path,
 * then sorts by salience (highest first).
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths with statistics
 */
export function parse<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExplorationPath[],
	config?: PARSEConfig<N, E>,
): PARSEResult {
	const startTime = performance.now();

	const { mi = jaccard, epsilon = 1e-10 } = config ?? {};

	const rankedPaths: RankedPath[] = [];

	for (const path of paths) {
		const salience = computePathSalience(graph, path, mi, epsilon);
		rankedPaths.push({
			...path,
			salience,
		});
	}

	// Sort by salience descending
	rankedPaths.sort((a, b) => b.salience - a.salience);

	const endTime = performance.now();

	// Compute statistics
	const saliences = rankedPaths.map((p) => p.salience);
	const meanSalience =
		saliences.length > 0
			? saliences.reduce((a, b) => a + b, 0) / saliences.length
			: 0;
	const sortedSaliences = [...saliences].sort((a, b) => a - b);
	const mid = Math.floor(sortedSaliences.length / 2);
	const medianSalience =
		sortedSaliences.length > 0
			? sortedSaliences.length % 2 !== 0
				? (sortedSaliences[mid] ?? 0)
				: ((sortedSaliences[mid - 1] ?? 0) + (sortedSaliences[mid] ?? 0)) / 2
			: 0;
	const maxSalience =
		sortedSaliences.length > 0
			? (sortedSaliences[sortedSaliences.length - 1] ?? 0)
			: 0;
	const minSalience =
		sortedSaliences.length > 0 ? (sortedSaliences[0] ?? 0) : 0;

	return {
		paths: rankedPaths,
		stats: {
			pathsRanked: rankedPaths.length,
			meanSalience,
			medianSalience,
			maxSalience,
			minSalience,
			durationMs: endTime - startTime,
		},
	};
}

/**
 * Configuration for async PARSE ranking.
 */
export interface AsyncPARSEConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> {
	/** Async MI function to use (default: jaccardAsync) */
	readonly mi?: AsyncMIFunction<N, E>;
	/** Minimum epsilon for MI (default: 1e-10) */
	readonly epsilon?: number;
}

/**
 * Rank paths using async PARSE (Path-Aware Ranking via Salience Estimation).
 *
 * Async variant suitable for use with remote or lazy graph data sources.
 * Computes geometric mean of edge MI scores for each path using Promise.all
 * for parallelism, then sorts by salience (highest first).
 *
 * @param graph - Async source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths with statistics
 */
export async function parseAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	paths: readonly ExplorationPath[],
	config?: AsyncPARSEConfig<N, E>,
): Promise<PARSEResult> {
	const startTime = performance.now();

	const { mi = jaccardAsync, epsilon = 1e-10 } = config ?? {};

	// Compute salience for all paths in parallel
	const rankedPaths = await Promise.all(
		paths.map(async (path) => ({
			...path,
			salience: await computePathSalienceAsync(graph, path, mi, epsilon),
		})),
	);

	// Sort by salience descending
	rankedPaths.sort((a, b) => b.salience - a.salience);

	const endTime = performance.now();

	// Compute statistics
	const saliences = rankedPaths.map((p) => p.salience);
	const meanSalience =
		saliences.length > 0
			? saliences.reduce((a, b) => a + b, 0) / saliences.length
			: 0;
	const sortedSaliences = [...saliences].sort((a, b) => a - b);
	const mid = Math.floor(sortedSaliences.length / 2);
	const medianSalience =
		sortedSaliences.length > 0
			? sortedSaliences.length % 2 !== 0
				? (sortedSaliences[mid] ?? 0)
				: ((sortedSaliences[mid - 1] ?? 0) + (sortedSaliences[mid] ?? 0)) / 2
			: 0;
	const maxSalience =
		sortedSaliences.length > 0
			? (sortedSaliences[sortedSaliences.length - 1] ?? 0)
			: 0;
	const minSalience =
		sortedSaliences.length > 0 ? (sortedSaliences[0] ?? 0) : 0;

	return {
		paths: rankedPaths,
		stats: {
			pathsRanked: rankedPaths.length,
			meanSalience,
			medianSalience,
			maxSalience,
			minSalience,
			durationMs: endTime - startTime,
		},
	};
}

/**
 * Compute salience for a single path asynchronously.
 *
 * Uses geometric mean of edge MI scores for length-unbiased ranking.
 * Edge MI values are computed in parallel via Promise.all.
 */
async function computePathSalienceAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	path: ExplorationPath,
	mi: AsyncMIFunction<N, E>,
	epsilon: number,
): Promise<number> {
	const nodes = path.nodes;

	if (nodes.length < 2) {
		return epsilon;
	}

	// Compute MI for each edge in parallel
	const edgeMIs = await Promise.all(
		nodes.slice(0, -1).map((source, i) => {
			const target = nodes[i + 1];
			if (target !== undefined) {
				return mi(graph, source, target);
			}
			return Promise.resolve(epsilon);
		}),
	);

	let productMi = 1;
	let edgeCount = 0;

	for (const edgeMi of edgeMIs) {
		productMi *= Math.max(epsilon, edgeMi);
		edgeCount++;
	}

	if (edgeCount === 0) {
		return epsilon;
	}

	// Geometric mean
	const salience = Math.pow(productMi, 1 / edgeCount);
	return Math.max(epsilon, Math.min(1, salience));
}

/**
 * Compute salience for a single path.
 *
 * Uses geometric mean of edge MI scores for length-unbiased ranking.
 */
function computePathSalience<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	path: ExplorationPath,
	mi: MIFunction<N, E>,
	epsilon: number,
): number {
	const nodes = path.nodes;

	if (nodes.length < 2) {
		return epsilon;
	}

	// Compute MI for each edge
	let productMi = 1;
	let edgeCount = 0;

	for (let i = 0; i < nodes.length - 1; i++) {
		const source = nodes[i];
		const target = nodes[i + 1];

		if (source !== undefined && target !== undefined) {
			const edgeMi = mi(graph, source, target);
			productMi *= Math.max(epsilon, edgeMi);
			edgeCount++;
		}
	}

	if (edgeCount === 0) {
		return epsilon;
	}

	// Geometric mean
	const salience = Math.pow(productMi, 1 / edgeCount);
	return Math.max(epsilon, Math.min(1, salience));
}
