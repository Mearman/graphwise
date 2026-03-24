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
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";

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
			// Initialise salience counts from existing paths
			for (const path of context.discoveredPaths) {
				for (const node of path.nodes) {
					salienceCounts.set(node, (salienceCounts.get(node) ?? 0) + 1);
				}
			}
		}

		// Update salience counts for newly discovered paths
		if (pathCount > lastPathCount) {
			for (let i = lastPathCount; i < pathCount; i++) {
				const path = context.discoveredPaths[i];
				if (path !== undefined) {
					for (const node of path.nodes) {
						salienceCounts.set(node, (salienceCounts.get(node) ?? 0) + 1);
					}
				}
			}
			lastPathCount = pathCount;
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
