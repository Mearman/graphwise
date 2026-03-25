/**
 * SKEW (Structural Kernel Entropy Weighting) MI variant.
 *
 * IDF-style rarity weighting on endpoints, applied to Jaccard base.
 * Formula: MI(u,v) = Jaccard(u,v) * log(N/deg(u)+1) * log(N/deg(v)+1)
 *
 * Range: [0, ∞) but typically [0, 1] for well-connected graphs
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import { computeJaccard } from "../../utils";
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
