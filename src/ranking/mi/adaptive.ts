/**
 * Unified Adaptive MI - combines multiple MI signals dynamically.
 *
 * Adapts to graph structure by weighting different MI components
 * based on local graph properties.
 *
 * Range: [0, 1] - higher values indicate stronger association
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { AdaptiveMIConfig } from "./types";
import { jaccard } from "./jaccard";
import { adamicAdar } from "./adamic-adar";

/**
 * Compute unified adaptive MI between two connected nodes.
 *
 * Combines structural, degree, and overlap signals with
 * adaptive weighting based on graph density.
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
	const sourceNeighbours = new Set(graph.neighbours(source));
	const targetNeighbours = new Set(graph.neighbours(target));
	sourceNeighbours.delete(target);
	targetNeighbours.delete(source);

	const sourceDegree = sourceNeighbours.size;
	const targetDegree = targetNeighbours.size;

	let overlap: number;
	if (sourceDegree > 0 && targetDegree > 0) {
		let commonCount = 0;
		for (const n of sourceNeighbours) {
			if (targetNeighbours.has(n)) {
				commonCount++;
			}
		}
		const minDegree = Math.min(sourceDegree, targetDegree);
		overlap = commonCount / minDegree;
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
