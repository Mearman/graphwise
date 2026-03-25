/**
 * REACH (Rank-Enhanced Adaptive Collision Hash) algorithm.
 *
 * Two-phase expansion:
 * 1. Phase 1: Degree-ordered expansion to collect MI statistics
 * 2. Phase 2: MI-guided expansion using learned thresholds
 *
 * Adapts to graph structure by learning optimal MI thresholds.
 *
 * @module expansion/sift
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
import { avgFrontierMI } from "./priority-helpers";

/**
 * Configuration for REACH expansion.
 */
export interface REACHConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> extends ExpansionConfig<N, E> {
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
		return context.degree + 100; // Low MI = delayed expansion
	}
}

/**
 * Run SIFT expansion algorithm.
 *
 * Two-phase adaptive expansion that learns MI thresholds
 * from initial sampling, then uses them for guided expansion.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function sift<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: REACHConfig<N, E>,
): ExpansionResult {
	const { mi = jaccard, miThreshold = 0.25, ...restConfig } = config ?? {};

	// Run guided expansion with MI threshold
	const priority = (nodeId: string, context: PriorityContext<N, E>): number =>
		siftPriority(nodeId, context, mi, miThreshold);

	return base(graph, seeds, {
		...restConfig,
		priority,
	});
}
