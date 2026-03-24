/**
 * SKEW (Structural Kernel Entropy Weighting) MI variant.
 *
 * Weights neighbours by inverse degree (like Adamic-Adar) but
 * also considers the skew of the degree distribution.
 *
 * SKEW(u,v) = sum_{w in N(u) ∩ N(v)} 1 / log(deg(w) + 1)
 *           / max weighted intersection possible
 *
 * Range: [0, 1]
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { MIConfig } from "./types";

/**
 * Compute SKEW MI between two nodes.
 */
export function skew<N extends NodeData, E extends EdgeData>(
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

	// Compute weighted intersection (Adamic-Adar style)
	let weightedIntersection = 0;
	let commonCount = 0;

	for (const neighbour of sourceNeighbours) {
		if (targetNeighbours.has(neighbour)) {
			commonCount++;
			const degree = graph.degree(neighbour);
			if (degree > 1) {
				weightedIntersection += 1 / Math.log(degree);
			}
		}
	}

	if (commonCount === 0) {
		return epsilon;
	}

	// Normalise by theoretical maximum
	const sourceDegree = sourceNeighbours.size;
	const targetDegree = targetNeighbours.size;
	const minDegree = Math.min(sourceDegree, targetDegree);

	// Approximate max score
	const maxScore = minDegree / Math.log(2);
	const score = weightedIntersection / maxScore;

	return Math.max(epsilon, Math.min(1, score));
}
