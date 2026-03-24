/**
 * Jaccard similarity coefficient for edge salience.
 *
 * Measures overlap between neighbourhoods of connected nodes:
 * MI(u,v) = |N(u) ∩ N(v)| / |N(u) ∪ N(v)|
 *
 * Range: [0, 1]
 * - 0: No shared neighbours (low salience)
 * - 1: Identical neighbourhoods (high salience)
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import { neighbourSet, neighbourOverlap } from "../../utils";
import type { MIConfig } from "./types";

/**
 * Compute Jaccard similarity between neighbourhoods of two nodes.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param config - Optional configuration
 * @returns Jaccard coefficient in [0, 1]
 */
export function jaccard<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): number {
	const { epsilon = 1e-10 } = config ?? {};

	// Get neighbourhoods, excluding opposite endpoint
	const sourceNeighbours = neighbourSet(graph, source, target);
	const targetNeighbours = neighbourSet(graph, target, source);

	// Compute intersection and union
	const { intersection, union } = neighbourOverlap(
		sourceNeighbours,
		targetNeighbours,
	);

	// Avoid division by zero
	if (union === 0) {
		return 0;
	}

	const score = intersection / union;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}
