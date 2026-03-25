/**
 * SAGE (Salience-Accumulation Guided Expansion) algorithm.
 *
 * Two-phase expansion algorithm that tracks how often nodes appear
 * in discovered paths and uses this salience to guide expansion.
 *
 * Phase 1 (before first path): priority = log(degree + 1)
 * Phase 2 (after first path): priority = -(salience(v) × 1000 - degree)
 *
 * where salience(v) = count of discovered paths containing v
 *
 * In phase 2, nodes that appear frequently in paths are deprioritised,
 * encouraging exploration of fresh frontier regions.
 *
 * @module expansion/sage
 */

import type { NodeData, EdgeData, ReadableGraph, NodeId } from "../graph";
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
import { updateSalienceCounts } from "./priority-helpers";

/**
 * Run SAGE expansion algorithm.
 *
 * Salience-aware multi-frontier expansion with two phases:
 * - Phase 1: Degree-based priority (early exploration)
 * - Phase 2: Salience feedback (path-aware frontier steering)
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function sage<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	// Closure state: encapsulate phase tracking and salience counts per call
	const salienceCounts = new Map<NodeId, number>();
	let inPhase2 = false;
	let lastPathCount = 0;

	/**
	 * SAGE priority function with phase transition logic.
	 */
	function sagePriority(
		nodeId: NodeId,
		context: PriorityContext<N, E>,
	): number {
		const pathCount = context.discoveredPaths.length;

		// Detect phase transition: first path discovered
		if (pathCount > 0 && !inPhase2) {
			inPhase2 = true;
			// No scan needed — the incremental update below handles it
		}

		// Update salience counts for newly discovered paths
		if (pathCount > lastPathCount) {
			lastPathCount = updateSalienceCounts(
				salienceCounts,
				context.discoveredPaths,
				lastPathCount,
			);
		}

		// Phase 1: Degree-based priority before first path
		if (!inPhase2) {
			return Math.log(context.degree + 1);
		}

		// Phase 2: Salience-guided priority
		// Nodes with high salience are deprioritised, fresh nodes get lower priority
		const salience = salienceCounts.get(nodeId) ?? 0;
		return -(salience * 1000 - context.degree);
	}

	return base(graph, seeds, {
		...config,
		priority: sagePriority,
	});
}

/**
 * Run SAGE expansion asynchronously.
 *
 * Creates fresh closure state (salienceCounts, phase tracking) for this
 * invocation. The SAGE priority function does not access `context.graph`
 * directly, so it is safe to use in async mode via `baseAsync`.
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the expansion result
 */
export async function sageAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExpansionResult> {
	// Fresh closure state — independent of any concurrent sync invocations
	const salienceCounts = new Map<NodeId, number>();
	let inPhase2 = false;
	let lastPathCount = 0;

	function sagePriority(
		nodeId: NodeId,
		context: PriorityContext<N, E>,
	): number {
		const pathCount = context.discoveredPaths.length;

		if (pathCount > 0 && !inPhase2) {
			inPhase2 = true;
		}

		if (pathCount > lastPathCount) {
			lastPathCount = updateSalienceCounts(
				salienceCounts,
				context.discoveredPaths,
				lastPathCount,
			);
		}

		if (!inPhase2) {
			return Math.log(context.degree + 1);
		}

		const salience = salienceCounts.get(nodeId) ?? 0;
		return -(salience * 1000 - context.degree);
	}

	return baseAsync(graph, seeds, { ...config, priority: sagePriority });
}
