/**
 * Helper functions for test fixture manipulation and analysis.
 *
 * These utilities support creation and analysis of expansion paths,
 * path MI calculation, and other common test operations.
 */

import type { NodeId, ReadableGraph, NodeData, EdgeData } from "../../graph";
import type {
	ExpansionPath,
	ExpansionResult,
	ExpansionStats,
} from "../../expansion";
import type { MIFunction } from "../../ranking/mi";

/**
 * Create an ExpansionPath from an array of node IDs.
 *
 * The first node becomes the source seed and the last becomes the target seed.
 * Useful for constructing paths in tests without manually creating Seed objects.
 *
 * @param nodes - Array of node IDs forming the path (must have at least 1 element)
 * @returns ExpansionPath with fromSeed and toSeed inferred from endpoints
 *
 * @example
 * ```typescript
 * const path = createPath(['A', 'B', 'C']);
 * // path.fromSeed.id === 'A'
 * // path.toSeed.id === 'C'
 * // path.nodes === ['A', 'B', 'C']
 * ```
 */
export function createPath(nodes: readonly NodeId[]): ExpansionPath {
	if (nodes.length === 0) {
		throw new Error("Cannot create path from empty node array");
	}

	const firstNode = nodes[0];
	const lastNode = nodes[nodes.length - 1];

	if (firstNode === undefined || lastNode === undefined) {
		throw new Error("Invalid path node array");
	}

	return {
		nodes,
		fromSeed: { id: firstNode },
		toSeed: { id: lastNode },
	};
}

/**
 * Compute mutual information (MI) for a single edge.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param mi - MI function to use
 * @returns MI score for the edge
 */
function edgeMI<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	mi: MIFunction<N, E>,
): number {
	return mi(graph, source, target);
}

/**
 * Compute the mean MI across all edges in a single path.
 *
 * Uses geometric mean to avoid length bias:
 * M(P) = exp(1/k * sum(log(I(u_i, v_i)))) where k is the number of edges.
 *
 * For single-node paths (no edges), returns NaN.
 * For empty paths, returns NaN.
 *
 * @param graph - Source graph
 * @param path - The path to score
 * @param mi - MI function to use
 * @returns Geometric mean MI, or NaN if path has fewer than 2 nodes
 *
 * @example
 * ```typescript
 * const path = createPath(['A', 'B', 'C']);
 * const score = pathMI(graph, path, jaccard);
 * // score is geometric mean of MI(A,B) and MI(B,C)
 * ```
 */
export function pathMI<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	path: ExpansionPath,
	mi: MIFunction<N, E>,
): number {
	const nodes = path.nodes;

	// Single node or empty path has no edges
	if (nodes.length < 2) {
		return Number.NaN;
	}

	let logSum = 0;

	for (let i = 0; i < nodes.length - 1; i++) {
		const source = nodes[i];
		const target = nodes[i + 1];

		if (source === undefined || target === undefined) {
			return Number.NaN;
		}

		const score = edgeMI(graph, source, target, mi);

		// Guard against log(0) or log(negative)
		if (score <= 0) {
			return 0;
		}

		logSum += Math.log(score);
	}

	const edgeCount = nodes.length - 1;
	const geometricMean = Math.exp(logSum / edgeCount);

	return geometricMean;
}

/**
 * Assert that an ExpansionResult has the four required top-level properties.
 *
 * Checks for `paths`, `sampledNodes`, `sampledEdges`, and `stats`. Intended
 * as a concise structural guard in expansion unit tests.
 *
 * @param result - The expansion result to validate
 */
export function assertExpansionResultShape(result: ExpansionResult): void {
	if (!("paths" in result)) {
		throw new Error("ExpansionResult missing 'paths' property");
	}
	if (!("sampledNodes" in result)) {
		throw new Error("ExpansionResult missing 'sampledNodes' property");
	}
	if (!("sampledEdges" in result)) {
		throw new Error("ExpansionResult missing 'sampledEdges' property");
	}
	if (!("stats" in result)) {
		throw new Error("ExpansionResult missing 'stats' property");
	}
}

/**
 * Assert that an ExpansionStats object has all expected numeric fields and
 * a valid termination reason.
 *
 * Checks `iterations`, `nodesVisited`, `edgesTraversed`, `pathsFound`,
 * `durationMs`, `algorithm`, and `termination`.
 *
 * @param stats - The stats object to validate
 */
export function assertValidStats(stats: ExpansionStats): void {
	if (typeof stats.iterations !== "number") {
		throw new Error("ExpansionStats.iterations must be a number");
	}
	if (typeof stats.nodesVisited !== "number") {
		throw new Error("ExpansionStats.nodesVisited must be a number");
	}
	if (typeof stats.edgesTraversed !== "number") {
		throw new Error("ExpansionStats.edgesTraversed must be a number");
	}
	if (typeof stats.pathsFound !== "number") {
		throw new Error("ExpansionStats.pathsFound must be a number");
	}
	if (typeof stats.durationMs !== "number") {
		throw new Error("ExpansionStats.durationMs must be a number");
	}
	if (typeof stats.algorithm !== "string") {
		throw new Error("ExpansionStats.algorithm must be a string");
	}
	const validTerminations = [
		"exhausted",
		"limit",
		"collision",
		"error",
	] as const;
	if (!validTerminations.includes(stats.termination)) {
		throw new Error(
			`ExpansionStats.termination '${stats.termination}' is not a valid termination reason`,
		);
	}
}

/**
 * Compute the mean MI across all edges in all paths.
 *
 * Aggregates MI scores across multiple paths by taking the mean
 * of individual path MIs. Paths with no edges (single-node paths)
 * are excluded from the calculation.
 *
 * @param graph - Source graph
 * @param paths - Array of paths to score
 * @param mi - MI function to use
 * @returns Mean MI across all valid paths, or 0 if no valid paths
 *
 * @example
 * ```typescript
 * const paths = [
 *   createPath(['A', 'B', 'C']),
 *   createPath(['D', 'E']),
 * ];
 * const avgScore = meanPathMI(graph, paths, jaccard);
 * ```
 */
export function meanPathMI<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	mi: MIFunction<N, E>,
): number {
	if (paths.length === 0) {
		return 0;
	}

	const scores = paths
		.map((path) => pathMI(graph, path, mi))
		.filter((score) => !Number.isNaN(score));

	if (scores.length === 0) {
		return 0;
	}

	const sum = scores.reduce((acc, score) => acc + score, 0);
	return sum / scores.length;
}
