/**
 * Frontier-Balanced expansion.
 *
 * Round-robin exploration across frontiers.
 * Each frontier expands one node before the next frontier gets a turn.
 * Ensures fair expansion across all seed frontiers.
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
 * Run frontier-balanced expansion (round-robin across frontiers).
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function frontierBalanced<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	// Frontier-balanced priority: frontier index first, then iteration
	// Lower frontier index is prioritised, but within each frontier round they share turns
	const balancedPriority = (
		_nodeId: string,
		context: PriorityContext<N, E>,
	): number => {
		// Suppress unused variable warning
		void graph;
		// Scale frontier index to dominate: each frontier gets 1e9 slots
		// then iteration order within that frontier range
		return context.frontierIndex * 1e9 + context.iteration;
	};

	return base(graph, seeds, {
		...config,
		priority: balancedPriority,
	});
}
