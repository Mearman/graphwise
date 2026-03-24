/**
 * DOME (Degree-Ordered Multi-Expansion) algorithm.
 *
 * Simplest BASE variant: priority = node degree.
 * Lower degree nodes are expanded first (can be reversed via config).
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";

/**
 * Run DOME expansion (degree-ordered).
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function dome<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	// DOME uses degree as priority (lower degree = higher priority)
	const domePriority = (
		nodeId: string,
		context: PriorityContext<N, E>,
	): number => {
		return context.degree;
	};

	return base(graph, seeds, {
		...config,
		priority: domePriority,
	});
}

/**
 * DOME with reverse priority (high degree first).
 */
export function domeHighDegree<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	// Negate degree to prioritise high-degree nodes
	const domePriority = (
		nodeId: string,
		context: PriorityContext<N, E>,
	): number => {
		return -context.degree;
	};

	return base(graph, seeds, {
		...config,
		priority: domePriority,
	});
}
