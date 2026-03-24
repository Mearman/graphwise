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
import { neighbourSet, neighbourOverlap } from "../../utils";
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

	// Get neighbourhoods, excluding opposite endpoint
	const sourceNeighbours = neighbourSet(graph, source, target);
	const targetNeighbours = neighbourSet(graph, target, source);

	// Compute Jaccard
	const { intersection, union } = neighbourOverlap(
		sourceNeighbours,
		targetNeighbours,
	);
	const jaccard = union > 0 ? intersection / union : 0;

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

	const score = jaccard / density;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}
