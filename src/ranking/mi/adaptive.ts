/**
 * Unified Adaptive MI - combines multiple MI signals dynamically.
 *
 * Adapts to graph structure by weighting different MI components
 * based on structural properties.
 *
 * Three-component weighted sum:
 * - Structural: Jaccard neighbourhood overlap
 * - Degree: Adamic-Adar inverse-log-degree weighting
 * - Overlap: Overlap coefficient (intersection / min degree)
 *
 * Range: [0, 1] - higher values indicate stronger association
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import { neighbourSet, neighbourOverlap } from "../../utils";
import type { AdaptiveMIConfig } from "./types";
import { jaccard } from "./jaccard";
import { adamicAdar } from "./adamic-adar";

/**
 * Compute unified adaptive MI between two connected nodes.
 *
 * Combines structural, degree, and overlap signals with
 * configurable weighting.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param config - Optional configuration with component weights
 * @returns Adaptive MI score in [0, 1]
 */
export function adaptive<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: AdaptiveMIConfig,
): number {
	const {
		epsilon = 1e-10,
		structuralWeight = 0.4,
		degreeWeight = 0.3,
		overlapWeight = 0.3,
	} = config ?? {};

	// Component 1: Structural similarity (Jaccard)
	const structural = jaccard(graph, source, target, { epsilon });

	// Component 2: Degree-weighted association (Adamic-Adar, normalised)
	const degreeComponent = adamicAdar(graph, source, target, {
		epsilon,
		normalise: true,
	});

	// Component 3: Overlap coefficient
	const sourceNeighbours = neighbourSet(graph, source, target);
	const targetNeighbours = neighbourSet(graph, target, source);

	let overlap: number;
	if (sourceNeighbours.size > 0 && targetNeighbours.size > 0) {
		const { intersection } = neighbourOverlap(
			sourceNeighbours,
			targetNeighbours,
		);
		const minDegree = Math.min(sourceNeighbours.size, targetNeighbours.size);
		overlap = minDegree > 0 ? intersection / minDegree : epsilon;
	} else {
		overlap = epsilon;
	}

	// Normalise weights
	const totalWeight = structuralWeight + degreeWeight + overlapWeight;

	// Weighted combination
	const score =
		(structuralWeight * structural +
			degreeWeight * degreeComponent +
			overlapWeight * overlap) /
		totalWeight;

	return Math.max(epsilon, Math.min(1, score));
}
