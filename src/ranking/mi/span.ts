/**
 * SPAN (Structural Pattern ANalysis) MI variant.
 *
 * Clustering-coefficient penalty, favouring bridge edges.
 * Formula: MI(u,v) = Jaccard(u,v) * (1 - max(cc(u), cc(v)))
 *
 * Nodes with high clustering coefficient are tightly embedded in triangles;
 * edges between such nodes are less likely to be bridge edges. This variant
 * downweights such edges, favouring paths through bridge edges.
 *
 * Range: [0, 1]
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import { computeJaccard } from "../../utils";
import { localClusteringCoefficient } from "../../utils";
import type { MIConfig } from "./types";

/**
 * Compute SPAN MI between two nodes.
 */
export function span<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): number {
	const { epsilon = 1e-10 } = config ?? {};

	const { jaccard: jaccardScore } = computeJaccard(graph, source, target);

	// Compute clustering coefficients
	const sourceCc = localClusteringCoefficient(graph, source);
	const targetCc = localClusteringCoefficient(graph, target);

	// Apply bridge penalty: downweight edges between highly-embedded nodes
	const bridgePenalty = 1 - Math.max(sourceCc, targetCc);

	const score = jaccardScore * bridgePenalty;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}
