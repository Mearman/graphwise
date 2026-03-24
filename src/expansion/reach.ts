/**
 * REACH (Retrospective Expansion with Adaptive Convergence Heuristic) algorithm.
 *
 * Two-phase expansion algorithm that computes mean Jaccard similarity
 * between candidate nodes and discovered path endpoints, using this
 * mutual information estimate to guide expansion.
 *
 * Phase 1 (before first path): priority = log(degree + 1)
 * Phase 2 (after first path): priority = log(degree + 1) × (1 - MI_hat(v))
 *
 * where MI_hat(v) = mean Jaccard(N(v), N(endpoint)) over all discovered
 * path endpoints (source and target of each path).
 *
 * In phase 2, nodes with high neighbourhood similarity to path endpoints
 * are deprioritised, encouraging discovery of structurally dissimilar paths.
 *
 * @module expansion/reach
 */

import type { NodeData, EdgeData, ReadableGraph, NodeId } from "../graph";
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";
import { jaccard } from "../ranking/mi/jaccard";

/**
 * Run REACH expansion algorithm.
 *
 * Mutual information-aware multi-frontier expansion with two phases:
 * - Phase 1: Degree-based priority (early exploration)
 * - Phase 2: Structural similarity feedback (MI-guided frontier steering)
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function reach<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	// Closure state: encapsulate phase tracking
	let inPhase2 = false;

	// Closure state: cache Jaccard scores by (source, target) key
	// Symmetric property ensures consistent ordering
	const jaccardCache = new Map<string, number>();

	/**
	 * Compute Jaccard similarity with caching.
	 *
	 * Exploits symmetry of Jaccard (J(A,B) = J(B,A)) to reduce
	 * duplicate computations when the same pair appears in multiple
	 * discovered paths. Key format ensures consistent ordering.
	 */
	function cachedJaccard(source: NodeId, target: NodeId): number {
		// Symmetric key: consistent ordering ensures cache hits
		const key =
			source < target ? `${source}::${target}` : `${target}::${source}`;

		let score = jaccardCache.get(key);
		if (score === undefined) {
			score = jaccard(graph, source, target);
			jaccardCache.set(key, score);
		}

		return score;
	}

	/**
	 * REACH priority function with MI estimation.
	 */
	function reachPriority(
		nodeId: NodeId,
		context: PriorityContext<N, E>,
	): number {
		const pathCount = context.discoveredPaths.length;

		// Detect phase transition: first path discovered
		if (pathCount > 0 && !inPhase2) {
			inPhase2 = true;
		}

		// Phase 1: Degree-based priority before first path
		if (!inPhase2) {
			return Math.log(context.degree + 1);
		}

		// Phase 2: Compute MI_hat(v) = mean Jaccard to all discovered path endpoints
		// Collect all endpoint nodes from discovered paths
		let totalMI = 0;
		let endpointCount = 0;

		for (const path of context.discoveredPaths) {
			const fromNodeId = path.fromSeed.id;
			const toNodeId = path.toSeed.id;

			// Compute Jaccard similarity between candidate node and each endpoint
			// Using cached variant to avoid recomputing identical pairs
			totalMI += cachedJaccard(nodeId, fromNodeId);
			totalMI += cachedJaccard(nodeId, toNodeId);
			endpointCount += 2;
		}

		const miHat = endpointCount > 0 ? totalMI / endpointCount : 0;

		// Phase 2 priority: degree-weighted by dissimilarity
		// Lower MI → lower priority value → expanded first
		return Math.log(context.degree + 1) * (1 - miHat);
	}

	return base(graph, seeds, {
		...config,
		priority: reachPriority,
	});
}
