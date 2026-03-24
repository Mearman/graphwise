/**
 * Adamic-Adar index for edge salience.
 *
 * Sum of inverse log degrees of common neighbours:
 * MI(u,v) = Σ_{z ∈ N(u) ∩ N(v)} 1 / log(deg(z) + 1)
 *
 * Range: [0, ∞) - higher values indicate stronger association
 * Normalised to [0, 1] by dividing by max possible value.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import { neighbourSet, neighbourIntersection } from "../../utils";
import type { MIConfig } from "./types";

/**
 * Compute Adamic-Adar index between neighbourhoods of two nodes.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param config - Optional configuration
 * @returns Adamic-Adar index (normalised to [0, 1] if configured)
 */
export function adamicAdar<N extends NodeData, E extends EdgeData>(
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

	// Sum inverse log degrees of common neighbours
	let score = 0;
	for (const neighbour of commonNeighbours) {
		const degree = graph.degree(neighbour);
		score += 1 / Math.log(degree + 1);
	}

	// Normalise to [0, 1] if requested
	if (normalise && commonNeighbours.size > 0) {
		// Max possible is when all common neighbours have minimum degree (1)
		// 1 / log(1 + 1) = 1 / log(2)
		const maxScore = commonNeighbours.size / Math.log(2);
		score = score / maxScore;
	}

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}
