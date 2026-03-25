/**
 * Cosine similarity for edge salience.
 *
 * Measures similarity between neighbourhoods using vector cosine:
 * MI(u,v) = |N(u) ∩ N(v)| / (√|N(u)| × √|N(v)|)
 *
 * Range: [0, 1]
 * - 0: No overlap or one node has no neighbours
 * - 1: Identical neighbourhoods of equal size
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import { neighbourSet, neighbourOverlap } from "../../utils";
import type { MIConfig } from "./types";

/**
 * Compute cosine similarity between neighbourhoods of two nodes.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param config - Optional configuration
 * @returns Cosine similarity in [0, 1]
 */
export function cosine<N extends NodeData, E extends EdgeData>(
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

	// Compute denominator: √|N(u)| × √|N(v)|
	const denominator =
		Math.sqrt(sourceNeighbours.size) * Math.sqrt(targetNeighbours.size);

	// Avoid division by zero
	if (denominator === 0) {
		return 0;
	}

	const score = intersection / denominator;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}
