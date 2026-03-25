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
import type { AsyncReadableGraph } from "../../graph/async-interfaces";
import { computeJaccard, countNodesOfType } from "../../utils";
import { collectAsyncIterable } from "../../async/utils";
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

	const { jaccard: jaccardScore } = computeJaccard(graph, source, target);

	// Get node data
	const sourceNode = graph.getNode(source);
	const targetNode = graph.getNode(target);

	// If either node lacks a type, fall back to Jaccard
	if (sourceNode?.type === undefined || targetNode?.type === undefined) {
		return Math.max(epsilon, jaccardScore);
	}

	// Compute node rarity: log(total nodes / nodes of this type)
	const sourceTypeCount = countNodesOfType(graph, sourceNode.type);
	const targetTypeCount = countNodesOfType(graph, targetNode.type);

	// Avoid division by zero
	if (sourceTypeCount === 0 || targetTypeCount === 0) {
		return Math.max(epsilon, jaccardScore);
	}

	const sourceRarity = Math.log(graph.nodeCount / sourceTypeCount);
	const targetRarity = Math.log(graph.nodeCount / targetTypeCount);

	const score = jaccardScore * sourceRarity * targetRarity;

	// Apply epsilon floor for numerical stability
	return Math.max(epsilon, score);
}

/**
 * Async variant of NOTCH MI for use with async graph data sources.
 *
 * Fetches both neighbourhoods and node data concurrently, then counts
 * nodes of each type by iterating the async node stream.
 */
export async function notchAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): Promise<number> {
	const { epsilon = 1e-10 } = config ?? {};

	// Fetch neighbourhoods and node data concurrently
	const [sourceArr, targetArr, sourceNode, targetNode] = await Promise.all([
		collectAsyncIterable(graph.neighbours(source)),
		collectAsyncIterable(graph.neighbours(target)),
		graph.getNode(source),
		graph.getNode(target),
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

	// If either node lacks a type, fall back to Jaccard
	if (sourceNode?.type === undefined || targetNode?.type === undefined) {
		return Math.max(epsilon, jaccardScore);
	}

	const sourceType = sourceNode.type;
	const targetType = targetNode.type;

	// Count nodes of each type and total nodes by iterating all node IDs
	let totalNodes = 0;
	let sourceTypeCount = 0;
	let targetTypeCount = 0;
	for await (const nodeId of graph.nodeIds()) {
		totalNodes++;
		const node = await graph.getNode(nodeId);
		if (node?.type === sourceType) sourceTypeCount++;
		if (node?.type === targetType) targetTypeCount++;
	}

	// Avoid division by zero
	if (sourceTypeCount === 0 || targetTypeCount === 0) {
		return Math.max(epsilon, jaccardScore);
	}

	const sourceRarity = Math.log(totalNodes / sourceTypeCount);
	const targetRarity = Math.log(totalNodes / targetTypeCount);

	const score = jaccardScore * sourceRarity * targetRarity;

	return Math.max(epsilon, score);
}
