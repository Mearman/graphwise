/**
 * MAZE (Multi-frontier Adaptive Zone) algorithm.
 *
 * Three-phase exploration algorithm combining path potential (PIPE) and
 * salience feedback (SAGE) with adaptive termination criteria.
 *
 * Phase 1 (before M paths found): π(v) = deg(v) / (1 + path_potential(v))
 *   where path_potential(v) = count of neighbours visited by other frontiers
 *
 * Phase 2 (after M paths, salience feedback):
 *   π(v) = [deg/(1+path_potential)] × [1/(1+λ×salience(v))]
 *   where salience(v) = count of discovered paths containing v, λ = 1000
 *
 * Phase 3: Adaptive termination when combination of:
 *   - Path count plateau (no new paths in recent iterations)
 *   - Salience distribution stabilisation
 *   - Frontier diversity convergence
 *
 * Simplified implementation: Phase 1 uses path potential, phase 2 adds
 * salience weighting, implicit phase 3 via collision detection.
 *
 * @module exploration/maze
 */

import type { NodeData, EdgeData, ReadableGraph, NodeId } from "../graph";
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type {
	Seed,
	ExplorationResult,
	ExplorationConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";
import type { AsyncExpansionConfig } from "./base";
import { baseAsync } from "./base";
import { updateSalienceCounts } from "./priority-helpers";

/** Default threshold for switching to phase 2 (after M paths) */
const DEFAULT_PHASE2_THRESHOLD = 1;

/** Salience weighting factor */
const SALIENCE_WEIGHT = 1000;

/**
 * Run MAZE exploration algorithm.
 *
 * Multi-phase exploration combining path potential and salience with
 * adaptive frontier steering.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function maze<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExplorationConfig<N, E>,
): ExplorationResult {
	// Closure state: encapsulate phase tracking and salience counts
	const salienceCounts = new Map<NodeId, number>();
	let inPhase2 = false;
	let lastPathCount = 0;

	/**
	 * MAZE priority function with path potential and salience feedback.
	 */
	function mazePriority(
		nodeId: NodeId,
		context: PriorityContext<N, E>,
	): number {
		const pathCount = context.discoveredPaths.length;

		// Detect phase transition: threshold of paths reached
		if (pathCount >= DEFAULT_PHASE2_THRESHOLD && !inPhase2) {
			inPhase2 = true;
			// Initialise salience counts from all existing paths
			updateSalienceCounts(salienceCounts, context.discoveredPaths, 0);
		}

		// Incrementally update salience counts for newly discovered paths in phase 2
		if (inPhase2 && pathCount > lastPathCount) {
			lastPathCount = updateSalienceCounts(
				salienceCounts,
				context.discoveredPaths,
				lastPathCount,
			);
		}

		// Compute path potential: neighbours visited by other frontiers
		// This is a bridge score indicating how likely this node is on important paths
		const nodeNeighbours = graph.neighbours(nodeId);
		let pathPotential = 0;

		for (const neighbour of nodeNeighbours) {
			const visitedBy = context.visitedByFrontier.get(neighbour);
			if (visitedBy !== undefined && visitedBy !== context.frontierIndex) {
				pathPotential++;
			}
		}

		// Phase 1: Path potential-based priority
		// Lower degree and high path potential = high priority (expanded first)
		if (!inPhase2) {
			return context.degree / (1 + pathPotential);
		}

		// Phase 2: Salience-weighted path potential
		// Nodes on existing paths (high salience) are deprioritised
		const salience = salienceCounts.get(nodeId) ?? 0;
		const basePriority = context.degree / (1 + pathPotential);
		const salienceFactor = 1 / (1 + SALIENCE_WEIGHT * salience);

		return basePriority * salienceFactor;
	}

	return base(graph, seeds, {
		...config,
		priority: mazePriority,
	});
}

/**
 * Run MAZE exploration asynchronously.
 *
 * Creates fresh closure state (salienceCounts, phase tracking) for this
 * invocation. The MAZE priority function accesses `context.graph` to
 * retrieve neighbour lists for path potential computation. Full async
 * equivalence requires PriorityContext refactoring (Phase 4b deferred).
 * This export establishes the async API surface.
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the exploration result
 */
export async function mazeAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExplorationResult> {
	// Fresh closure state — independent of any concurrent sync invocations
	const salienceCounts = new Map<NodeId, number>();
	let inPhase2 = false;
	let lastPathCount = 0;

	function mazePriority(
		nodeId: NodeId,
		context: PriorityContext<N, E>,
	): number {
		const pathCount = context.discoveredPaths.length;

		if (pathCount >= DEFAULT_PHASE2_THRESHOLD && !inPhase2) {
			inPhase2 = true;
			updateSalienceCounts(salienceCounts, context.discoveredPaths, 0);
		}

		if (inPhase2 && pathCount > lastPathCount) {
			lastPathCount = updateSalienceCounts(
				salienceCounts,
				context.discoveredPaths,
				lastPathCount,
			);
		}

		// context.graph is the sentinel in pure async mode — Phase 4b will resolve this
		const nodeNeighbours = context.graph.neighbours(nodeId);
		let pathPotential = 0;

		for (const neighbour of nodeNeighbours) {
			const visitedBy = context.visitedByFrontier.get(neighbour);
			if (visitedBy !== undefined && visitedBy !== context.frontierIndex) {
				pathPotential++;
			}
		}

		if (!inPhase2) {
			return context.degree / (1 + pathPotential);
		}

		const salience = salienceCounts.get(nodeId) ?? 0;
		const basePriority = context.degree / (1 + pathPotential);
		const salienceFactor = 1 / (1 + SALIENCE_WEIGHT * salience);

		return basePriority * salienceFactor;
	}

	return baseAsync(graph, seeds, { ...config, priority: mazePriority });
}
