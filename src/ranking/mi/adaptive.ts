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
import type { AsyncReadableGraph } from "../../graph/async-interfaces";
import { computeJaccard, neighbourOverlap } from "../../utils";
import { collectAsyncIterable } from "../../async/utils";
import type { AdaptiveMIConfig } from "./types";
import { adamicAdar } from "./adamic-adar";
import { adamicAdarAsync } from "./adamic-adar";

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

	// Compute Jaccard and retrieve neighbourhood sets for the overlap coefficient
	const {
		jaccard: jaccardScore,
		sourceNeighbours,
		targetNeighbours,
	} = computeJaccard(graph, source, target);

	// Component 1: Structural similarity (Jaccard)
	// Returns 0 only when both neighbourhood sets are empty (union = 0); otherwise applies epsilon floor
	const structural =
		sourceNeighbours.size === 0 && targetNeighbours.size === 0
			? 0
			: Math.max(epsilon, jaccardScore);

	// Component 2: Degree-weighted association (Adamic-Adar, normalised)
	const degreeComponent = adamicAdar(graph, source, target, {
		epsilon,
		normalise: true,
	});

	// Component 3: Overlap coefficient
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

/**
 * Async variant of Adaptive MI for use with async graph data sources.
 *
 * Fetches both neighbourhoods concurrently, then delegates degree-weighted
 * component to the async Adamic-Adar variant.
 */
export async function adaptiveAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: AdaptiveMIConfig,
): Promise<number> {
	const {
		epsilon = 1e-10,
		structuralWeight = 0.4,
		degreeWeight = 0.3,
		overlapWeight = 0.3,
	} = config ?? {};

	// Fetch both neighbourhoods in parallel alongside the Adamic-Adar component
	const [sourceArr, targetArr, degreeComponent] = await Promise.all([
		collectAsyncIterable(graph.neighbours(source)),
		collectAsyncIterable(graph.neighbours(target)),
		adamicAdarAsync(graph, source, target, { epsilon, normalise: true }),
	]);

	const srcSet = new Set(sourceArr.filter((n) => n !== target));
	const tgtSet = new Set(targetArr.filter((n) => n !== source));

	// Compute Jaccard from sets
	let intersection = 0;
	for (const n of srcSet) {
		if (tgtSet.has(n)) intersection++;
	}
	const union = srcSet.size + tgtSet.size - intersection;
	const jaccardScore = union > 0 ? intersection / union : 0;

	// Component 1: Structural similarity (Jaccard)
	const structural =
		srcSet.size === 0 && tgtSet.size === 0
			? 0
			: Math.max(epsilon, jaccardScore);

	// Component 3: Overlap coefficient
	let overlap: number;
	if (srcSet.size > 0 && tgtSet.size > 0) {
		const minDegree = Math.min(srcSet.size, tgtSet.size);
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
