/**
 * ETCH (Edge Topology Coherence via Homophily) MI variant.
 *
 * Edge-type rarity weighting applied to Jaccard base.
 * Formula: MI(u,v) = Jaccard(u,v) * rarity(edgeType(u,v))
 * where rarity(t) = log(|E| / count(edges with type t))
 *
 * Edges of rare types (fewer instances in the graph) receive higher salience,
 * making discoveries across unusual edge relationships more significant.
 *
 * Range: [0, ∞) but typically [0, 1] for well-typed edges
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { AsyncReadableGraph } from "../../graph/async-interfaces";
import { computeJaccard, countEdgesOfType } from "../../utils";
import { collectAsyncIterable } from "../../async/utils";
import type { MIConfig } from "./types";

/**
 * Compute ETCH MI between two nodes.
 */
export function etch<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): number {
	const { epsilon = 1e-10 } = config ?? {};

	const { jaccard: jaccardScore } = computeJaccard(graph, source, target);

	// Get edge between source and target
	const edge = graph.getEdge(source, target);

	// If edge has no type or doesn't exist, fall back to Jaccard
	if (edge?.type === undefined) {
		return Math.max(epsilon, jaccardScore);
	}

	// Compute edge rarity: log(total edges / edges of this type)
	const edgeTypeCount = countEdgesOfType(graph, edge.type);

	// Avoid division by zero
	if (edgeTypeCount === 0) {
		return Math.max(epsilon, jaccardScore);
	}

	const rarity = Math.log(graph.edgeCount / edgeTypeCount);
	const score = jaccardScore * rarity;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}

/**
 * Async variant of ETCH MI for use with async graph data sources.
 *
 * Fetches both neighbourhoods and edge data concurrently, then counts
 * edges of the same type by iterating the async edge stream.
 */
export async function etchAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): Promise<number> {
	const { epsilon = 1e-10 } = config ?? {};

	// Fetch neighbourhoods and the source→target edge concurrently
	const [sourceArr, targetArr, edge] = await Promise.all([
		collectAsyncIterable(graph.neighbours(source)),
		collectAsyncIterable(graph.neighbours(target)),
		graph.getEdge(source, target),
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

	// If edge has no type or doesn't exist, fall back to Jaccard
	if (edge?.type === undefined) {
		return Math.max(epsilon, jaccardScore);
	}

	const edgeType = edge.type;

	// Count edges of this type by iterating all edges
	let edgeTypeCount = 0;
	let totalEdges = 0;
	for await (const e of graph.edges()) {
		totalEdges++;
		if (e.type === edgeType) edgeTypeCount++;
	}

	// Avoid division by zero
	if (edgeTypeCount === 0) {
		return Math.max(epsilon, jaccardScore);
	}

	const rarity = Math.log(totalEdges / edgeTypeCount);
	const score = jaccardScore * rarity;

	return Math.max(epsilon, score);
}
