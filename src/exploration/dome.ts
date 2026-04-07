/**
 * DOME (Degree-Ordered Multi-Exploration) algorithm.
 *
 * Simplest BASE variant: priority = node degree.
 * Lower degree nodes are expanded first (can be reversed via config).
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type {
	Seed,
	ExplorationResult,
	ExplorationConfig,
	PriorityContext,
} from "./types";
import { base, baseAsync } from "./base";
import type { AsyncExpansionConfig } from "./base";

/**
 * DOME priority: lower degree is expanded first.
 */
function domePriority<N extends NodeData, E extends EdgeData>(
	_nodeId: string,
	context: PriorityContext<N, E>,
): number {
	return context.degree;
}

/**
 * DOME high-degree priority: negate degree to prioritise high-degree nodes.
 */
function domeHighDegreePriority<N extends NodeData, E extends EdgeData>(
	_nodeId: string,
	context: PriorityContext<N, E>,
): number {
	return -context.degree;
}

/**
 * Run DOME exploration (degree-ordered).
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function dome<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExplorationConfig<N, E>,
): ExplorationResult {
	return base(graph, seeds, {
		...config,
		priority: domePriority,
	});
}

/**
 * Run DOME exploration asynchronously (degree-ordered).
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the exploration result
 */
export async function domeAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExplorationResult> {
	return baseAsync(graph, seeds, { ...config, priority: domePriority });
}

/**
 * DOME with reverse priority (high degree first).
 */
export function domeHighDegree<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExplorationConfig<N, E>,
): ExplorationResult {
	return base(graph, seeds, {
		...config,
		priority: domeHighDegreePriority,
	});
}

/**
 * Run DOME high-degree exploration asynchronously (high degree first).
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the exploration result
 */
export async function domeHighDegreeAsync<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExplorationResult> {
	return baseAsync(graph, seeds, {
		...config,
		priority: domeHighDegreePriority,
	});
}
