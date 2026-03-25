/**
 * Hub Promoted index for edge salience.
 *
 * Hub-promoting neighbourhood overlap:
 * MI(u,v) = |N(u) ∩ N(v)| / min(deg(u), deg(v))
 *
 * Range: [0, 1]
 * Uses node degrees rather than neighbourhood set sizes.
 * Similar to Overlap Coefficient but normalised by degree.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { AsyncReadableGraph } from "../../graph/async-interfaces";
import { neighbourSet, neighbourOverlap } from "../../utils";
import { collectAsyncIterable } from "../../async/utils";
import type { MIConfig } from "./types";

/**
 * Compute Hub Promoted index between neighbourhoods of two nodes.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param config - Optional configuration
 * @returns Hub Promoted index in [0, 1]
 */
export function hubPromoted<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): number {
	const { epsilon = 1e-10 } = config ?? {};

	// Get neighbourhoods, excluding opposite endpoint
	const sourceNeighbours = neighbourSet(graph, source, target);
	const targetNeighbours = neighbourSet(graph, target, source);

	// Compute intersection size
	const { intersection } = neighbourOverlap(sourceNeighbours, targetNeighbours);

	// Compute denominator using actual degrees
	const sourceDegree = graph.degree(source);
	const targetDegree = graph.degree(target);
	const denominator = Math.min(sourceDegree, targetDegree);

	// Avoid division by zero
	if (denominator === 0) {
		return 0;
	}

	const score = intersection / denominator;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}

/**
 * Async variant of Hub Promoted index for use with async graph data sources.
 *
 * Fetches both neighbourhoods and degrees concurrently, then applies the same formula.
 */
export async function hubPromotedAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): Promise<number> {
	const { epsilon = 1e-10 } = config ?? {};

	// Fetch both neighbourhoods and degrees in parallel
	const [sourceArr, targetArr, sourceDegree, targetDegree] = await Promise.all([
		collectAsyncIterable(graph.neighbours(source)),
		collectAsyncIterable(graph.neighbours(target)),
		graph.degree(source),
		graph.degree(target),
	]);

	const srcSet = new Set(sourceArr.filter((n) => n !== target));
	const tgtSet = new Set(targetArr.filter((n) => n !== source));

	// Compute intersection size
	let intersection = 0;
	for (const n of srcSet) {
		if (tgtSet.has(n)) intersection++;
	}

	// Compute denominator using actual degrees
	const denominator = Math.min(sourceDegree, targetDegree);

	// Avoid division by zero
	if (denominator === 0) {
		return 0;
	}

	const score = intersection / denominator;

	return Math.max(epsilon, score);
}
