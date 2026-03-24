/**
 * NOTCH (Neighbourhood Overlap Topology Coherence via Homophily) MI variant.
 *
 * Combines neighbourhood overlap with degree correlation to capture
 * both local structure and global position similarity.
 *
 * NOTCH(u,v) = overlap * 0.6 + degree_correlation * 0.4
 *
 * Range: [0, 1]
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { MIConfig } from "./types";

/**
 * Compute NOTCH MI between two nodes.
 */
export function notch<N extends NodeData, E extends EdgeData>(
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

	// Component 1: Overlap coefficient
	let intersectionSize = 0;
	for (const neighbour of sourceNeighbours) {
		if (targetNeighbours.has(neighbour)) {
			intersectionSize++;
		}
	}

	const minDegree = Math.min(sourceDegree, targetDegree);
	const overlap = minDegree > 0 ? intersectionSize / minDegree : 0;

	// Component 2: Degree correlation (similarity to ideal degree match)
	const maxDegree = Math.max(sourceDegree, targetDegree);
	const correlation =
		maxDegree > 0 ? 1 - Math.abs(sourceDegree - targetDegree) / maxDegree : 1;

	// Weighted combination
	const score = overlap * 0.6 + correlation * 0.4;

	return Math.max(epsilon, Math.min(1, score));
}
