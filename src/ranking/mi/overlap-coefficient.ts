/**
 * Overlap Coefficient for edge salience.
 *
 * Minimum-based neighbourhood overlap:
 * MI(u,v) = |N(u) ∩ N(v)| / min(|N(u)|, |N(v)|)
 *
 * Range: [0, 1]
 * - 0: No shared neighbours or one node has no neighbours
 * - 1: One neighbourhood is a subset of the other
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { AsyncReadableGraph } from "../../graph/async-interfaces";
import { neighbourSet, neighbourOverlap } from "../../utils";
import { collectAsyncIterable } from "../../async/utils";
import type { MIConfig } from "./types";

/**
 * Compute Overlap Coefficient between neighbourhoods of two nodes.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param config - Optional configuration
 * @returns Overlap Coefficient in [0, 1]
 */
export function overlapCoefficient<N extends NodeData, E extends EdgeData>(
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

	// Compute denominator: min(|N(u)|, |N(v)|)
	const denominator = Math.min(sourceNeighbours.size, targetNeighbours.size);

	// Avoid division by zero
	if (denominator === 0) {
		return 0;
	}

	const score = intersection / denominator;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}

/**
 * Async variant of Overlap Coefficient for use with async graph data sources.
 *
 * Fetches both neighbourhoods concurrently, then applies the same formula.
 */
export async function overlapCoefficientAsync<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: AsyncReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): Promise<number> {
	const { epsilon = 1e-10 } = config ?? {};

	// Fetch both neighbourhoods in parallel
	const [sourceArr, targetArr] = await Promise.all([
		collectAsyncIterable(graph.neighbours(source)),
		collectAsyncIterable(graph.neighbours(target)),
	]);

	const srcSet = new Set(sourceArr.filter((n) => n !== target));
	const tgtSet = new Set(targetArr.filter((n) => n !== source));

	// Compute intersection size
	let intersection = 0;
	for (const n of srcSet) {
		if (tgtSet.has(n)) intersection++;
	}

	// Compute denominator: min(|N(u)|, |N(v)|)
	const denominator = Math.min(srcSet.size, tgtSet.size);

	// Avoid division by zero
	if (denominator === 0) {
		return 0;
	}

	const score = intersection / denominator;

	return Math.max(epsilon, score);
}
