/**
 * SCALE (Structural Coherence via Adjacency Lattice Entropy) MI variant.
 *
 * Combines Jaccard similarity with degree ratio to capture both
 * neighbourhood overlap and degree balance.
 *
 * SCALE(u,v) = 2 * Jaccard(u,v) * deg_ratio / (Jaccard(u,v) + deg_ratio)
 * where deg_ratio = min(deg(u), deg(v)) / max(deg(u), deg(v))
 *
 * Range: [0, 1]
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { MIConfig } from "./types";

/**
 * Compute SCALE MI between two nodes.
 */
export function scale<N extends NodeData, E extends EdgeData>(
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

	const sourceDegree = sourceNeighbours.size;
	const targetDegree = targetNeighbours.size;

	// Compute Jaccard
	let intersectionSize = 0;
	for (const neighbour of sourceNeighbours) {
		if (targetNeighbours.has(neighbour)) {
			intersectionSize++;
		}
	}

	const unionSize = sourceDegree + targetDegree - intersectionSize;
	const jaccard = unionSize > 0 ? intersectionSize / unionSize : 0;

	// Compute degree ratio
	const minDegree = Math.min(sourceDegree, targetDegree);
	const maxDegree = Math.max(sourceDegree, targetDegree);
	const degreeRatio = maxDegree > 0 ? minDegree / maxDegree : 0;

	// Harmonic mean combination
	if (jaccard + degreeRatio === 0) {
		return epsilon;
	}

	const score = (2 * jaccard * degreeRatio) / (jaccard + degreeRatio);

	return Math.max(epsilon, Math.min(1, score));
}
