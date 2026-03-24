/**
 * Standard BFS (Breadth-First Search) expansion.
 *
 * Simplest baseline: FIFO order based on discovery iteration.
 * All nodes at the same frontier are explored in discovery order.
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
 * Run standard BFS expansion (FIFO discovery order).
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function standardBfs<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	// BFS uses iteration order (discovery order) as priority
	const bfsPriority = (
		_nodeId: string,
		context: PriorityContext<N, E>,
	): number => {
		// Suppress unused variable warning
		void graph;
		return context.iteration;
	};

	return base(graph, seeds, {
		...config,
		priority: bfsPriority,
	});
}
