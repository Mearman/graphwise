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
import { neighbourSet, neighbourOverlap } from "../../utils";
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

	// Get neighbourhoods, excluding opposite endpoint
	const sourceNeighbours = neighbourSet(graph, source, target);
	const targetNeighbours = neighbourSet(graph, target, source);

	// Compute Jaccard
	const { intersection, union } = neighbourOverlap(
		sourceNeighbours,
		targetNeighbours,
	);
	const jaccard = union > 0 ? intersection / union : 0;

	// Compute clustering coefficients
	const sourceCc = localClusteringCoefficient(graph, source);
	const targetCc = localClusteringCoefficient(graph, target);

	// Apply bridge penalty: downweight edges between highly-embedded nodes
	const bridgePenalty = 1 - Math.max(sourceCc, targetCc);

	const score = jaccard * bridgePenalty;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}
