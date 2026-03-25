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
import { computeJaccard, countEdgesOfType } from "../../utils";
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
