/**
 * SKEW (Structural Kernel Entropy Weighting) MI variant.
 *
 * IDF-style rarity weighting on endpoints, applied to Jaccard base.
 * Formula: MI(u,v) = Jaccard(u,v) * log(N/deg(u)+1) * log(N/deg(v)+1)
 *
 * Range: [0, ∞) but typically [0, 1] for well-connected graphs
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { AsyncReadableGraph } from "../../graph/async-interfaces";
import { computeJaccard } from "../../utils";
import { collectAsyncIterable } from "../../async/utils";
import type { MIConfig } from "./types";

/**
 * Compute SKEW MI between two nodes.
 */
export function skew<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): number {
	const { epsilon = 1e-10 } = config ?? {};

	const { jaccard: jaccardScore } = computeJaccard(graph, source, target);

	// Compute IDF-style weights for endpoints
	const N = graph.nodeCount;
	const sourceDegree = graph.degree(source);
	const targetDegree = graph.degree(target);

	const sourceIdf = Math.log(N / (sourceDegree + 1));
	const targetIdf = Math.log(N / (targetDegree + 1));

	const score = jaccardScore * sourceIdf * targetIdf;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}

/**
 * Async variant of SKEW MI for use with async graph data sources.
 *
 * Fetches both neighbourhoods, degrees, and node count concurrently.
 */
export async function skewAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): Promise<number> {
	const { epsilon = 1e-10 } = config ?? {};

	// Fetch neighbourhoods, node count, and endpoint degrees in parallel
	const [sourceArr, targetArr, N, sourceDegree, targetDegree] =
		await Promise.all([
			collectAsyncIterable(graph.neighbours(source)),
			collectAsyncIterable(graph.neighbours(target)),
			graph.nodeCount,
			graph.degree(source),
			graph.degree(target),
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

	// Compute IDF-style weights for endpoints
	const sourceIdf = Math.log(N / (sourceDegree + 1));
	const targetIdf = Math.log(N / (targetDegree + 1));

	const score = jaccardScore * sourceIdf * targetIdf;

	return Math.max(epsilon, score);
}
