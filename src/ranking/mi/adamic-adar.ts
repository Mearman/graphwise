/**
 * Adamic-Adar index for edge salience.
 *
 * Sum of inverse log degrees of common neighbours:
 * MI(u,v) = Σ_{z ∈ N(u) ∩ N(v)} 1 / log(deg(z))
 *
 * Range: [0, ∞) - higher values indicate stronger association
 * Normalised to [0, 1] by dividing by max possible value.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
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

	// Get neighbourhoods
	const sourceNeighbours = new Set(graph.neighbours(source));
	const targetNeighbours = new Set(graph.neighbours(target));

	// Remove self-references
	sourceNeighbours.delete(target);
	targetNeighbours.delete(source);

	// Compute common neighbours and sum inverse log degrees
	let score = 0;
	for (const neighbour of sourceNeighbours) {
		if (targetNeighbours.has(neighbour)) {
			const degree = graph.degree(neighbour);
			if (degree > 1) {
				score += 1 / Math.log(degree);
			}
		}
	}

	// Normalise to [0, 1] if requested
	if (normalise) {
		// Max possible is when all common neighbours have degree 2 (minimum for log)
		// This is a heuristic normalisation
		const commonCount =
			sourceNeighbours.size < targetNeighbours.size
				? sourceNeighbours.size
				: targetNeighbours.size;
		if (commonCount === 0) {
			return 0;
		}
		const maxScore = commonCount / Math.log(2);
		score = score / maxScore;
	}

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}
