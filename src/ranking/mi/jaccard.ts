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

	// Get neighbourhoods
	const sourceNeighbours = new Set(graph.neighbours(source));
	const targetNeighbours = new Set(graph.neighbours(target));

	// Remove self-references
	sourceNeighbours.delete(target);
	targetNeighbours.delete(source);

	// Compute intersection size
	let intersectionSize = 0;
	for (const neighbour of sourceNeighbours) {
		if (targetNeighbours.has(neighbour)) {
			intersectionSize++;
		}
	}

	// Compute union size
	const unionSize =
		sourceNeighbours.size + targetNeighbours.size - intersectionSize;

	// Avoid division by zero
	if (unionSize === 0) {
		return 0;
	}

	const score = intersectionSize / unionSize;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}
