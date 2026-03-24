/**
 * SAGE (Salience-Aware Graph Expansion) algorithm.
 *
 * Two-phase expansion:
 * 1. Initial DOME-style expansion to discover candidate paths
 * 2. Re-prioritise based on path salience scores
 *
 * Combines structural exploration with semantic ranking.
 *
 * @module expansion/sage
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
 * Configuration for SAGE expansion.
 */
export interface SAGEConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> extends ExpansionConfig<N, E> {
	/** MI function for salience computation (default: jaccard) */
	readonly mi?: (
		graph: ReadableGraph<N, E>,
		source: string,
		target: string,
	) => number;
	/** Weight for salience component (0-1, default: 0.5) */
	readonly salienceWeight?: number;
}

/**
 * SAGE priority function.
 *
 * Combines degree with salience:
 * Priority = (1 - w) * degree + w * (1 - avg_salience)
 * Lower values = higher priority
 */
function sagePriority<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
	mi: (graph: ReadableGraph<N, E>, source: string, target: string) => number,
	salienceWeight: number,
): number {
	const graph = context.graph;
	const degree = context.degree;
	const frontierIndex = context.frontierIndex;

	// Compute average salience to visited nodes in this frontier
	let totalSalience = 0;
	let count = 0;

	for (const [visitedId, idx] of context.visitedByFrontier) {
		if (idx === frontierIndex && visitedId !== nodeId) {
			totalSalience += mi(graph, visitedId, nodeId);
			count++;
		}
	}

	const avgSalience = count > 0 ? totalSalience / count : 0;

	// Combine degree with salience
	// Lower priority value = expanded first
	// High salience should lower priority value
	const degreeComponent = (1 - salienceWeight) * degree;
	const salienceComponent = salienceWeight * (1 - avgSalience);

	return degreeComponent + salienceComponent;
}

/**
 * Run SAGE expansion algorithm.
 *
 * Combines structural exploration with semantic salience.
 * Useful for finding paths that are both short and semantically meaningful.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration with MI function
 * @returns Expansion result with discovered paths
 */
export function sage<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: SAGEConfig<N, E>,
): ExpansionResult {
	const { mi = jaccard, salienceWeight = 0.5, ...restConfig } = config ?? {};

	const priority = (nodeId: string, context: PriorityContext<N, E>): number =>
		sagePriority(nodeId, context, mi, salienceWeight);

	return base(graph, seeds, {
		...restConfig,
		priority,
	});
}
