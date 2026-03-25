/**
 * LACE (Local Association Context Expansion) algorithm.
 *
 * Prioritises exploration by mutual information scores.
 * Expands high-MI edges first, favouring paths with strong associations.
 *
 * Requires MI function configuration.
 *
 * @module expansion/lace
 */

import type { NodeData, EdgeData, ReadableGraph, NodeId } from "../graph";
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
	BatchPriorityContext,
	BatchPriorityFunction,
} from "./types";
import { base } from "./base";
import type { AsyncExpansionConfig } from "./base";
import { baseAsync } from "./base";
import { jaccard } from "../ranking/mi/jaccard";
import {
	avgFrontierMI,
	batchAvgMI,
	getSameFrontierVisited,
} from "./priority-helpers";

/**
 * Configuration for LACE expansion.
 */
export interface LACEConfig<
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
 * LACE priority function.
 *
 * Priority = 1 - avgMI(node, same-frontier visited nodes)
 * Higher average MI = lower priority value = explored first
 */
function lacePriority<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
	mi: (graph: ReadableGraph<N, E>, source: string, target: string) => number,
): number {
	const avgMi = avgFrontierMI(context.graph, nodeId, context, mi);
	// Invert so higher MI = lower priority value = expanded first
	return 1 - avgMi;
}

/**
 * Run LACE expansion algorithm.
 *
 * Expands from seeds prioritising high-MI edges.
 * Useful for finding paths with strong semantic associations.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration with MI function
 * @returns Expansion result with discovered paths
 */
export function lace<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: LACEConfig<N, E>,
): ExpansionResult {
	const { mi = jaccard, ...restConfig } = config ?? {};

	const priority = (nodeId: string, context: PriorityContext<N, E>): number =>
		lacePriority(nodeId, context, mi);

	return base(graph, seeds, {
		...restConfig,
		priority,
	});
}

/**
 * Run LACE expansion asynchronously.
 *
 * Note: the LACE priority function accesses `context.graph` via
 * `avgFrontierMI`. Full async equivalence requires PriorityContext
 * refactoring (Phase 4b deferred). This export establishes the async
 * API surface.
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for expansion
 * @param config - LACE configuration combined with async runner options
 * @returns Promise resolving to the expansion result
 */
export async function laceAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: LACEConfig<N, E> & AsyncExpansionConfig<N, E>,
): Promise<ExpansionResult> {
	const { mi = jaccard, ...restConfig } = config ?? {};

	const priority = (nodeId: string, context: PriorityContext<N, E>): number =>
		lacePriority(nodeId, context, mi);

	return baseAsync(graph, seeds, { ...restConfig, priority });
}

/**
 * Batch priority function for LACE expansion.
 *
 * Computes average MI between each candidate and all nodes visited by the
 * same frontier in a single batch operation. More efficient than computing
 * MI per-candidate when there are many candidates and visited nodes.
 *
 * @param candidates - Candidate node IDs to prioritise
 * @param context - Batch priority context
 * @returns Map of node ID to priority (lower = higher priority)
 */
export function laceBatchPriority<N extends NodeData, E extends EdgeData>(
	candidates: readonly NodeId[],
	context: BatchPriorityContext<N, E>,
): ReadonlyMap<NodeId, number> {
	// Get nodes visited by the same frontier
	const sameFrontierVisited = getSameFrontierVisited(context);

	// Compute batch MI scores
	const avgMIScores = batchAvgMI(
		context.graph,
		candidates,
		sameFrontierVisited,
	);

	// Convert to priorities: higher MI = lower priority value = expanded first
	const priorities = new Map<NodeId, number>();
	for (const candidate of candidates) {
		const avgMI = avgMIScores.get(candidate) ?? 0;
		priorities.set(candidate, 1 - avgMI);
	}

	return priorities;
}

/**
 * Create a LACE config with batch priority enabled.
 *
 * @param config - Base LACE configuration
 * @returns Configuration with batchPriority set
 */
export function laceWithBatchPriority<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>(
	config?: LACEConfig<N, E>,
): LACEConfig<N, E> & { batchPriority: BatchPriorityFunction<N, E> } {
	return {
		...config,
		batchPriority: laceBatchPriority,
	};
}
