/**
 * NOTCH (Neighbourhood Overlap Topology Coherence via Homophily) MI variant.
 *
 * Node-type rarity weighting applied to Jaccard base.
 * Formula: MI(u,v) = Jaccard(u,v) * rarity(nodeType(u)) * rarity(nodeType(v))
 * where rarity(t) = log(|V| / count(nodes with type t))
 *
 * Paths connecting nodes of rare types (fewer instances in the graph) receive higher
 * salience, making discoveries involving unusual node types more significant.
 *
 * Range: [0, ∞) but typically [0, 1] for well-typed nodes
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import { neighbourSet, neighbourOverlap, countNodesOfType } from "../../utils";
import type { MIConfig } from "./types";

/**
 * Compute NOTCH MI between two nodes.
 */
export function notch<N extends NodeData, E extends EdgeData>(
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

	// Get node data
	const sourceNode = graph.getNode(source);
	const targetNode = graph.getNode(target);

	// If either node lacks a type, fall back to Jaccard
	if (sourceNode?.type === undefined || targetNode?.type === undefined) {
		return Math.max(epsilon, jaccard);
	}

	// Compute node rarity: log(total nodes / nodes of this type)
	const sourceTypeCount = countNodesOfType(graph, sourceNode.type);
	const targetTypeCount = countNodesOfType(graph, targetNode.type);

	// Avoid division by zero
	if (sourceTypeCount === 0 || targetTypeCount === 0) {
		return Math.max(epsilon, jaccard);
	}

	const sourceRarity = Math.log(graph.nodeCount / sourceTypeCount);
	const targetRarity = Math.log(graph.nodeCount / targetTypeCount);

	const score = jaccard * sourceRarity * targetRarity;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}
