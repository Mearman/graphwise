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
import type { AsyncReadableGraph } from "../../graph/async-interfaces";
import { computeJaccard } from "../../utils";
import { collectAsyncIterable } from "../../async/utils";
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

	const {
		jaccard: jaccardScore,
		sourceNeighbours,
		targetNeighbours,
	} = computeJaccard(graph, source, target);

	// Return 0 only when the union is empty (no neighbours on either side)
	if (sourceNeighbours.size === 0 && targetNeighbours.size === 0) {
		return 0;
	}

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, jaccardScore);
}

/**
 * Async variant of Jaccard similarity for use with async graph data sources.
 *
 * Fetches both neighbourhoods concurrently, then applies the same formula.
 */
export async function jaccardAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): Promise<number> {
	const { epsilon = 1e-10 } = config ?? {};

	// Fetch both neighbourhoods in parallel
	const [sourceNeighboursArr, targetNeighboursArr] = await Promise.all([
		collectAsyncIterable(graph.neighbours(source)),
		collectAsyncIterable(graph.neighbours(target)),
	]);

	const srcSet = new Set(sourceNeighboursArr.filter((n) => n !== target));
	const tgtSet = new Set(targetNeighboursArr.filter((n) => n !== source));

	// Return 0 only when the union is empty (no neighbours on either side)
	if (srcSet.size === 0 && tgtSet.size === 0) {
		return 0;
	}

	// Compute intersection and union sizes
	let intersection = 0;
	for (const n of srcSet) {
		if (tgtSet.has(n)) intersection++;
	}
	const union = srcSet.size + tgtSet.size - intersection;

	const jaccardScore = union > 0 ? intersection / union : 0;

	return Math.max(epsilon, jaccardScore);
}
