/**
 * MAZE (Multi-frontier Adaptive Zone) algorithm.
 *
 * Three-phase expansion algorithm combining path potential (PIPE) and
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
 * @module expansion/maze
 */

import type { NodeData, EdgeData, ReadableGraph, NodeId } from "../graph";
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";

/** Default threshold for switching to phase 2 (after M paths) */
const DEFAULT_PHASE2_THRESHOLD = 1;

/** Salience weighting factor */
const SALIENCE_WEIGHT = 1000;

/**
 * Run MAZE expansion algorithm.
 *
 * Multi-phase expansion combining path potential and salience with
 * adaptive frontier steering.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function maze<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
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
			// Initialise salience counts from existing paths
			for (const path of context.discoveredPaths) {
				for (const node of path.nodes) {
					salienceCounts.set(node, (salienceCounts.get(node) ?? 0) + 1);
				}
			}
		}

		// Update salience counts for newly discovered paths in phase 2
		if (inPhase2 && pathCount > lastPathCount) {
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
