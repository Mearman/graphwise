/**
 * REACH (Rank-Enhanced Adaptive Collision Hash) algorithm.
 *
 * Two-phase expansion:
 * 1. Phase 1: Degree-ordered expansion to collect MI statistics
 * 2. Phase 2: MI-guided expansion using learned thresholds
 *
 * Adapts to graph structure by learning optimal MI thresholds.
 *
 * @module expansion/reach
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
 * REACH priority function (phase 2).
 *
 * Uses learned MI threshold to prioritise high-MI edges.
 */
function reachPriority<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
	mi: (graph: ReadableGraph<N, E>, source: string, target: string) => number,
	miThreshold: number,
): number {
	const graph = context.graph;
	const frontierIndex = context.frontierIndex;

	// Compute average MI to visited nodes
	let totalMi = 0;
	let count = 0;

	for (const [visitedId, idx] of context.visitedByFrontier) {
		if (idx === frontierIndex && visitedId !== nodeId) {
			totalMi += mi(graph, visitedId, nodeId);
			count++;
		}
	}

	const avgMi = count > 0 ? totalMi / count : 0;

	// If MI is above threshold, give high priority (low value)
	// Otherwise, fall back to degree
	if (avgMi >= miThreshold) {
		return 1 - avgMi; // High MI = low priority value
	} else {
		return context.degree + 100; // Low MI = delayed expansion
	}
}

/**
 * Run REACH expansion algorithm.
 *
 * Two-phase adaptive expansion that learns MI thresholds
 * from initial sampling, then uses them for guided expansion.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function reach<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: REACHConfig<N, E>,
): ExpansionResult {
	const { mi = jaccard, miThreshold = 0.25, ...restConfig } = config ?? {};

	// Run guided expansion with MI threshold
	const priority = (nodeId: string, context: PriorityContext<N, E>): number =>
		reachPriority(nodeId, context, mi, miThreshold);

	return base(graph, seeds, {
		...restConfig,
		priority,
	});
}
