/**
 * Sorensen-Dice coefficient for edge salience.
 *
 * Harmonic mean of overlap:
 * MI(u,v) = 2|N(u) ∩ N(v)| / (|N(u)| + |N(v)|)
 *
 * Range: [0, 1]
 * - 0: No shared neighbours
 * - 1: Identical neighbourhoods
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import { neighbourSet, neighbourOverlap } from "../../utils";
import type { MIConfig } from "./types";

/**
 * Compute Sorensen-Dice similarity between neighbourhoods of two nodes.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param config - Optional configuration
 * @returns Sorensen-Dice coefficient in [0, 1]
 */
export function sorensen<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): number {
	const { epsilon = 1e-10 } = config ?? {};

	// Get neighbourhoods, excluding opposite endpoint
	const sourceNeighbours = neighbourSet(graph, source, target);
	const targetNeighbours = neighbourSet(graph, target, source);

	// Compute intersection size
	const { intersection } = neighbourOverlap(sourceNeighbours, targetNeighbours);

	// Compute denominator: |N(u)| + |N(v)|
	const denominator = sourceNeighbours.size + targetNeighbours.size;

	// Avoid division by zero
	if (denominator === 0) {
		return 0;
	}

	const score = (2 * intersection) / denominator;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}
