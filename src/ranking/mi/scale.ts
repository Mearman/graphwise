/**
 * SCALE (Structural Coherence via Adjacency Lattice Entropy) MI variant.
 *
 * Density-normalised Jaccard, correcting for graph density variation.
 * Formula: MI(u,v) = Jaccard(u,v) / ρ(G)
 *
 * where ρ(G) = 2 * |E| / (|V| * (|V| - 1)) for undirected graphs
 *       ρ(G) = |E| / (|V| * (|V| - 1)) for directed graphs
 *
 * Range: [0, ∞) but typically scales with graph density
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { AsyncReadableGraph } from "../../graph/async-interfaces";
import { computeJaccard } from "../../utils";
import { collectAsyncIterable } from "../../async/utils";
import type { MIConfig } from "./types";

/**
 * Compute SCALE MI between two nodes.
 */
export function scale<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): number {
	const { epsilon = 1e-10 } = config ?? {};

	const { jaccard: jaccardScore } = computeJaccard(graph, source, target);

	// Compute graph density
	const n = graph.nodeCount;
	const m = graph.edgeCount;

	// ρ(G) = 2|E| / (|V|(|V|-1)) for undirected; |E| / (|V|(|V|-1)) for directed
	const possibleEdges = n * (n - 1);
	const density =
		possibleEdges > 0 ? (graph.directed ? m : 2 * m) / possibleEdges : 0;

	// Avoid division by zero: if density is 0, fall back to epsilon
	if (density === 0) {
		return epsilon;
	}

	const score = jaccardScore / density;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}

/**
 * Async variant of SCALE MI for use with async graph data sources.
 *
 * Fetches both neighbourhoods, node count, and edge count concurrently.
 */
export async function scaleAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): Promise<number> {
	const { epsilon = 1e-10 } = config ?? {};

	// Fetch neighbourhoods, node count, and edge count in parallel
	const [sourceArr, targetArr, n, m] = await Promise.all([
		collectAsyncIterable(graph.neighbours(source)),
		collectAsyncIterable(graph.neighbours(target)),
		graph.nodeCount,
		graph.edgeCount,
	]);

	const srcSet = new Set(sourceArr.filter((node) => node !== target));
	const tgtSet = new Set(targetArr.filter((node) => node !== source));

	// Compute Jaccard from sets
	let intersection = 0;
	for (const node of srcSet) {
		if (tgtSet.has(node)) intersection++;
	}
	const union = srcSet.size + tgtSet.size - intersection;
	const jaccardScore = union > 0 ? intersection / union : 0;

	// Compute graph density
	// ρ(G) = 2|E| / (|V|(|V|-1)) for undirected; |E| / (|V|(|V|-1)) for directed
	const possibleEdges = n * (n - 1);
	const density =
		possibleEdges > 0 ? (graph.directed ? m : 2 * m) / possibleEdges : 0;

	// Avoid division by zero: if density is 0, fall back to epsilon
	if (density === 0) {
		return epsilon;
	}

	const score = jaccardScore / density;

	return Math.max(epsilon, score);
}
