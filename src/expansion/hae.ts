/**
 * HAE (High-Association Expansion) algorithm.
 *
 * Prioritises exploration by mutual information scores.
 * Expands high-MI edges first, favouring paths with strong associations.
 *
 * Requires MI function configuration.
 *
 * @module expansion/hae
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";
import { jaccard } from "../ranking/mi/jaccard";

/**
 * Configuration for HAE expansion.
 */
export interface HAEConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> extends ExpansionConfig<N, E> {
	/** MI function for computing edge priorities (default: jaccard) */
	readonly mi?: (
		graph: ReadableGraph<N, E>,
		source: string,
		target: string,
	) => number;
}

/**
 * HAE priority function.
 *
 * Priority = 1 - MI(source, neighbour)
 * Higher MI = lower priority value = explored first
 */
function haePriority<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
	mi: (graph: ReadableGraph<N, E>, source: string, target: string) => number,
): number {
	const graph = context.graph;
	const frontierIndex = context.frontierIndex;

	// Get the seed node for this frontier
	// We need to find the predecessor to compute MI
	let maxMi = 0;

	// Compute average MI to all visited nodes in this frontier
	let totalMi = 0;
	let count = 0;

	for (const [visitedId, idx] of context.visitedByFrontier) {
		if (idx === frontierIndex && visitedId !== nodeId) {
			const edgeMi = mi(graph, visitedId, nodeId);
			totalMi += edgeMi;
			count++;
			if (edgeMi > maxMi) {
				maxMi = edgeMi;
			}
		}
	}

	// Use average MI (higher = more important = lower priority value)
	const avgMi = count > 0 ? totalMi / count : 0;

	// Invert so higher MI = lower priority value = expanded first
	return 1 - avgMi;
}

/**
 * Run HAE expansion algorithm.
 *
 * Expands from seeds prioritising high-MI edges.
 * Useful for finding paths with strong semantic associations.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration with MI function
 * @returns Expansion result with discovered paths
 */
export function hae<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: HAEConfig<N, E>,
): ExpansionResult {
	const { mi = jaccard, ...restConfig } = config ?? {};

	const priority = (nodeId: string, context: PriorityContext<N, E>): number =>
		haePriority(nodeId, context, mi);

	return base(graph, seeds, {
		...restConfig,
		priority,
	});
}
