/**
 * Resource Allocation index for edge salience.
 *
 * Sum of inverse degrees of common neighbours:
 * MI(u,v) = Σ_{z ∈ N(u) ∩ N(v)} 1 / deg(z)
 *
 * Range: [0, ∞)
 * Assumption: shared neighbours with low degree are more informative than hubs.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { AsyncReadableGraph } from "../../graph/async-interfaces";
import { neighbourSet, neighbourIntersection } from "../../utils";
import { collectAsyncIterable } from "../../async/utils";
import type { MIConfig } from "./types";

/**
 * Compute Resource Allocation index between neighbourhoods of two nodes.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param config - Optional configuration
 * @returns Resource Allocation index (normalised to [0, 1] if configured)
 */
export function resourceAllocation<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): number {
	const { epsilon = 1e-10, normalise = true } = config ?? {};

	// Get neighbourhoods, excluding opposite endpoint
	const sourceNeighbours = neighbourSet(graph, source, target);
	const targetNeighbours = neighbourSet(graph, target, source);

	// Compute common neighbours
	const commonNeighbours = neighbourIntersection(
		sourceNeighbours,
		targetNeighbours,
	);

	// Sum inverse degrees of common neighbours
	let score = 0;
	for (const neighbour of commonNeighbours) {
		const degree = graph.degree(neighbour);
		if (degree > 0) {
			score += 1 / degree;
		}
	}

	// Normalise to [0, 1] if requested
	if (normalise && commonNeighbours.size > 0) {
		// Max possible is when all common neighbours have minimum degree (1)
		const maxScore = commonNeighbours.size;
		score = score / maxScore;
	}

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}

/**
 * Async variant of Resource Allocation index for use with async graph data sources.
 *
 * Fetches both neighbourhoods concurrently, then fetches degree for each common
 * neighbour to compute the inverse-degree weighted sum.
 */
export async function resourceAllocationAsync<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: AsyncReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): Promise<number> {
	const { epsilon = 1e-10, normalise = true } = config ?? {};

	// Fetch both neighbourhoods in parallel
	const [sourceArr, targetArr] = await Promise.all([
		collectAsyncIterable(graph.neighbours(source)),
		collectAsyncIterable(graph.neighbours(target)),
	]);

	const srcSet = new Set(sourceArr.filter((n) => n !== target));
	const tgtSet = new Set(targetArr.filter((n) => n !== source));

	// Find common neighbours
	const commonNeighbours: NodeId[] = [];
	for (const n of srcSet) {
		if (tgtSet.has(n)) commonNeighbours.push(n);
	}

	if (commonNeighbours.length === 0) {
		return epsilon;
	}

	// Fetch degrees of all common neighbours in parallel
	const degrees = await Promise.all(
		commonNeighbours.map((n) => graph.degree(n)),
	);

	// Sum inverse degrees
	let score = 0;
	for (const degree of degrees) {
		if (degree > 0) {
			score += 1 / degree;
		}
	}

	// Normalise to [0, 1] if requested
	if (normalise) {
		// Max possible is when all common neighbours have minimum degree (1)
		const maxScore = commonNeighbours.length;
		score = score / maxScore;
	}

	return Math.max(epsilon, score);
}
