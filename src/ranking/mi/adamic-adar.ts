/**
 * Adamic-Adar index for edge salience.
 *
 * Sum of inverse log degrees of common neighbours:
 * MI(u,v) = Σ_{z ∈ N(u) ∩ N(v)} 1 / log(deg(z) + 1)
 *
 * Range: [0, ∞) - higher values indicate stronger association
 * Normalised to [0, 1] by dividing by max possible value.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { AsyncReadableGraph } from "../../graph/async-interfaces";
import { neighbourSet, neighbourIntersection } from "../../utils";
import { collectAsyncIterable } from "../../async/utils";
import type { MIConfig } from "./types";

/**
 * Compute Adamic-Adar index between neighbourhoods of two nodes.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param config - Optional configuration
 * @returns Adamic-Adar index (normalised to [0, 1] if configured)
 */
export function adamicAdar<N extends NodeData, E extends EdgeData>(
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

	// Sum inverse log degrees of common neighbours
	let score = 0;
	for (const neighbour of commonNeighbours) {
		const degree = graph.degree(neighbour);
		score += 1 / Math.log(degree + 1);
	}

	// Normalise to [0, 1] if requested
	if (normalise && commonNeighbours.size > 0) {
		// Max possible is when all common neighbours have minimum degree (1)
		// 1 / log(1 + 1) = 1 / log(2)
		const maxScore = commonNeighbours.size / Math.log(2);
		score = score / maxScore;
	}

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}

/**
 * Async variant of Adamic-Adar index for use with async graph data sources.
 *
 * Fetches both neighbourhoods concurrently, then fetches degree for each common
 * neighbour to compute the inverse-log-degree weighted sum.
 */
export async function adamicAdarAsync<N extends NodeData, E extends EdgeData>(
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

	// Sum inverse log degrees
	let score = 0;
	for (const degree of degrees) {
		score += 1 / Math.log(degree + 1);
	}

	// Normalise to [0, 1] if requested
	if (normalise) {
		// Max possible is when all common neighbours have minimum degree (1)
		// 1 / log(1 + 1) = 1 / log(2)
		const maxScore = commonNeighbours.length / Math.log(2);
		score = score / maxScore;
	}

	return Math.max(epsilon, score);
}
