/**
 * REACH (Rank-Enhanced Adaptive Collision Hash) algorithm.
 *
 * Two-phase exploration:
 * 1. Phase 1: Degree-ordered exploration to collect MI statistics
 * 2. Phase 2: MI-guided exploration using learned thresholds
 *
 * Adapts to graph structure by learning optimal MI thresholds.
 *
 * @module exploration/sift
 */

import type { NodeData, EdgeData, ReadableGraph, NodeId } from "../graph";
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type {
	Seed,
	ExplorationResult,
	ExplorationConfig,
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
 * Configuration for REACH exploration.
 */
export interface REACHConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> extends ExplorationConfig<N, E> {
	/** MI function for salience computation (default: jaccard) */
	readonly mi?: (
		graph: ReadableGraph<N, E>,
		source: string,
		target: string,
	) => number;
	/** MI percentile threshold for phase 2 (default: 0.25) */
	readonly miThreshold?: number;
	/** Maximum nodes for phase 1 sampling (default: 1000) */
	readonly phase1MaxNodes?: number;
}

/**
 * REACH (SIFT) priority function.
 *
 * Prioritises nodes with average frontier MI above the threshold;
 * falls back to degree-based ordering for those below it.
 */
function siftPriority<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
	mi: (graph: ReadableGraph<N, E>, source: string, target: string) => number,
	miThreshold: number,
): number {
	const avgMi = avgFrontierMI(context.graph, nodeId, context, mi);

	// If MI is above threshold, give high priority (low value)
	// Otherwise, fall back to degree
	if (avgMi >= miThreshold) {
		return 1 - avgMi; // High MI = low priority value
	} else {
		return context.degree + 100; // Low MI = delayed exploration
	}
}

/**
 * Run SIFT exploration algorithm.
 *
 * Two-phase adaptive exploration that learns MI thresholds
 * from initial sampling, then uses them for guided exploration.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function sift<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: REACHConfig<N, E>,
): ExplorationResult {
	const { mi = jaccard, miThreshold = 0.25, ...restConfig } = config ?? {};

	// Run guided exploration with MI threshold
	const priority = (nodeId: string, context: PriorityContext<N, E>): number =>
		siftPriority(nodeId, context, mi, miThreshold);

	return base(graph, seeds, {
		...restConfig,
		priority,
	});
}

/**
 * Run SIFT exploration asynchronously.
 *
 * Note: the SIFT priority function accesses `context.graph` via
 * `avgFrontierMI`. Full async equivalence requires PriorityContext
 * refactoring (Phase 4b deferred). This export establishes the async
 * API surface.
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for exploration
 * @param config - SIFT (REACHConfig) configuration combined with async runner options
 * @returns Promise resolving to the exploration result
 */
export async function siftAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: REACHConfig<N, E> & AsyncExpansionConfig<N, E>,
): Promise<ExplorationResult> {
	const { mi = jaccard, miThreshold = 0.25, ...restConfig } = config ?? {};

	const priority = (nodeId: string, context: PriorityContext<N, E>): number =>
		siftPriority(nodeId, context, mi, miThreshold);

	return baseAsync(graph, seeds, { ...restConfig, priority });
}

/**
 * Create a batch priority function for SIFT with configurable threshold.
 *
 * Nodes with average MI above the threshold get high priority (low value).
 * Nodes below the threshold are deferred with degree-based penalty.
 *
 * @param miThreshold - MI threshold for phase transition (default: 0.25)
 * @returns Batch priority function
 */
export function createSiftBatchPriority<N extends NodeData, E extends EdgeData>(
	miThreshold = 0.25,
): BatchPriorityFunction<N, E> {
	return (
		candidates: readonly NodeId[],
		context: BatchPriorityContext<N, E>,
	): ReadonlyMap<NodeId, number> => {
		// Get nodes visited by the same frontier
		const sameFrontierVisited = getSameFrontierVisited(context);

		// Compute batch MI scores
		const avgMIScores = batchAvgMI(
			context.graph,
			candidates,
			sameFrontierVisited,
		);

		// Compute priorities with threshold-based logic
		const priorities = new Map<NodeId, number>();
		for (const candidate of candidates) {
			const avgMI = avgMIScores.get(candidate) ?? 0;
			if (avgMI >= miThreshold) {
				// High MI = low priority value = expanded first
				priorities.set(candidate, 1 - avgMI);
			} else {
				// Low MI = delayed exploration
				const degree = context.graph.degree(candidate);
				priorities.set(candidate, degree + 100);
			}
		}

		return priorities;
	};
}

/**
 * Default SIFT batch priority function with miThreshold = 0.25.
 */
export const siftBatchPriority: BatchPriorityFunction =
	createSiftBatchPriority(0.25);

/**
 * Create a SIFT config with batch priority enabled.
 *
 * @param config - Base SIFT configuration
 * @returns Configuration with batchPriority set
 */
export function siftWithBatchPriority<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>(
	config?: REACHConfig<N, E>,
): REACHConfig<N, E> & { batchPriority: BatchPriorityFunction<N, E> } {
	return {
		...config,
		batchPriority: createSiftBatchPriority(config?.miThreshold ?? 0.25),
	};
}
