/**
 * Resource Allocation index for edge salience.
 *
 * Sum of inverse degrees of common neighbours:
 * MI(u,v) = Σ_{z ∈ N(u) ∩ N(v)} 1 / deg(z)
 *
 * Range: [0, ∞)
 * Assumption: shared neighbours with low degree are more informative than hubs.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import { neighbourSet, neighbourIntersection } from "../../utils";
import type { MIConfig } from "./types";

/**
 * Compute Resource Allocation index between neighbourhoods of two nodes.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param config - Optional configuration
 * @returns Resource Allocation index (normalised to [0, 1] if configured)
 */
export function resourceAllocation<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): number {
	const { epsilon = 1e-10, normalise = true } = config ?? {};

	// Get neighbourhoods, excluding opposite endpoint
	const sourceNeighbours = neighbourSet(graph, source, target);
	const targetNeighbours = neighbourSet(graph, target, source);

	// Compute common neighbours
	const commonNeighbours = neighbourIntersection(
		sourceNeighbours,
		targetNeighbours,
	);

	// Sum inverse degrees of common neighbours
	let score = 0;
	for (const neighbour of commonNeighbours) {
		const degree = graph.degree(neighbour);
		if (degree > 0) {
			score += 1 / degree;
		}
	}

	// Normalise to [0, 1] if requested
	if (normalise && commonNeighbours.size > 0) {
		// Max possible is when all common neighbours have minimum degree (1)
		const maxScore = commonNeighbours.size;
		score = score / maxScore;
	}

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}
