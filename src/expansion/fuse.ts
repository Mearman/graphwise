/**
 * FUSE (Forward Unified Semantic Exploration-Aware Graph Expansion) algorithm.
 *
 * Two-phase expansion:
 * 1. Initial DOME-style expansion to discover candidate paths
 * 2. Re-prioritise based on path salience scores
 *
 * Combines structural exploration with semantic ranking.
 *
 * @module expansion/fuse
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";
import type { AsyncExpansionConfig } from "./base";
import { baseAsync } from "./base";
import { jaccard } from "../ranking/mi/jaccard";
import { avgFrontierMI } from "./priority-helpers";

/**
 * Configuration for FUSE expansion.
 */
export interface FUSEConfig<
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
 * @deprecated Use {@link FUSEConfig} instead.
 */
export type SAGEConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> = FUSEConfig<N, E>;

/**
 * FUSE priority function.
 *
 * Combines degree with average frontier MI as a salience proxy:
 * Priority = (1 - w) * degree + w * (1 - avgMI)
 * Lower values = higher priority; high salience lowers priority
 */
function fusePriority<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
	mi: (graph: ReadableGraph<N, E>, source: string, target: string) => number,
	salienceWeight: number,
): number {
	const avgSalience = avgFrontierMI(context.graph, nodeId, context, mi);

	// Combine degree with salience — lower priority value = expanded first
	const degreeComponent = (1 - salienceWeight) * context.degree;
	const salienceComponent = salienceWeight * (1 - avgSalience);

	return degreeComponent + salienceComponent;
}

/**
 * Run FUSE expansion algorithm.
 *
 * Combines structural exploration with semantic salience.
 * Useful for finding paths that are both short and semantically meaningful.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration with MI function
 * @returns Expansion result with discovered paths
 */
export function fuse<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: FUSEConfig<N, E>,
): ExpansionResult {
	const { mi = jaccard, salienceWeight = 0.5, ...restConfig } = config ?? {};

	const priority = (nodeId: string, context: PriorityContext<N, E>): number =>
		fusePriority(nodeId, context, mi, salienceWeight);

	return base(graph, seeds, {
		...restConfig,
		priority,
	});
}

/**
 * Run FUSE expansion asynchronously.
 *
 * Note: the FUSE priority function accesses `context.graph` via
 * `avgFrontierMI`. Full async equivalence requires PriorityContext
 * refactoring (Phase 4b deferred). This export establishes the async
 * API surface.
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for expansion
 * @param config - FUSE configuration combined with async runner options
 * @returns Promise resolving to the expansion result
 */
export async function fuseAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: FUSEConfig<N, E> & AsyncExpansionConfig<N, E>,
): Promise<ExpansionResult> {
	const { mi = jaccard, salienceWeight = 0.5, ...restConfig } = config ?? {};

	const priority = (nodeId: string, context: PriorityContext<N, E>): number =>
		fusePriority(nodeId, context, mi, salienceWeight);

	return baseAsync(graph, seeds, { ...restConfig, priority });
}
