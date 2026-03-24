/**
 * SPAN (Structural Pattern ANalysis) MI variant.
 *
 * Combines Jaccard with degree similarity to capture both
 * neighbourhood overlap and structural equivalence.
 *
 * SPAN(u,v) = sqrt(Jaccard(u,v) * deg_similarity)
 * where deg_similarity = 1 - |deg(u) - deg(v)| / max(deg(u), deg(v))
 *
 * Range: [0, 1]
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { MIConfig } from "./types";

/**
 * Compute SPAN MI between two nodes.
 */
export function span<N extends NodeData, E extends EdgeData>(
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

	// Compute degree similarity
	const maxDegree = Math.max(sourceDegree, targetDegree);
	const degreeDiff = Math.abs(sourceDegree - targetDegree);
	const degreeSimilarity = maxDegree > 0 ? 1 - degreeDiff / maxDegree : 1;

	// Geometric mean combination
	const score = Math.sqrt(jaccard * degreeSimilarity);

	return Math.max(epsilon, Math.min(1, score));
}
