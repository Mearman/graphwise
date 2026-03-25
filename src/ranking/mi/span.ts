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
import type { AsyncReadableGraph } from "../../graph/async-interfaces";
import { computeJaccard } from "../../utils";
import { localClusteringCoefficient } from "../../utils";
import { collectAsyncIterable } from "../../async/utils";
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

/**
 * Async variant of SPAN MI for use with async graph data sources.
 *
 * Fetches both neighbourhoods concurrently, then computes the clustering
 * coefficient for each endpoint from the collected neighbour arrays.
 */
export async function spanAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	source: NodeId,
	target: NodeId,
	config?: MIConfig,
): Promise<number> {
	const { epsilon = 1e-10 } = config ?? {};

	// Fetch both neighbourhoods in parallel
	const [sourceArr, targetArr] = await Promise.all([
		collectAsyncIterable(graph.neighbours(source)),
		collectAsyncIterable(graph.neighbours(target)),
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

	// Compute clustering coefficients for source and target asynchronously.
	// CC(v) = 2 * |triangles| / (deg * (deg - 1))
	// We need to check which pairs of neighbours are connected.
	const computeClusteringCoefficient = async (
		nodeId: NodeId,
		neighbourArr: readonly NodeId[],
	): Promise<number> => {
		const degree = neighbourArr.length;
		if (degree < 2) return 0;

		// Check each pair of neighbours for connectivity in parallel
		const pairs: [NodeId, NodeId][] = [];
		for (let i = 0; i < neighbourArr.length; i++) {
			for (let j = i + 1; j < neighbourArr.length; j++) {
				const u = neighbourArr[i];
				const v = neighbourArr[j];
				if (u !== undefined && v !== undefined) {
					pairs.push([u, v]);
				}
			}
		}

		const edgeResults = await Promise.all(
			pairs.flatMap(([u, v]) => [graph.getEdge(u, v), graph.getEdge(v, u)]),
		);

		let triangleCount = 0;
		for (let i = 0; i < pairs.length; i++) {
			// Each pair produced two edge lookups at indices 2*i and 2*i+1
			if (
				edgeResults[2 * i] !== undefined ||
				edgeResults[2 * i + 1] !== undefined
			) {
				triangleCount++;
			}
		}

		const possibleTriangles = (degree * (degree - 1)) / 2;
		return triangleCount / possibleTriangles;
	};

	const [sourceCc, targetCc] = await Promise.all([
		computeClusteringCoefficient(source, sourceArr),
		computeClusteringCoefficient(target, targetArr),
	]);

	// Apply bridge penalty: downweight edges between highly-embedded nodes
	const bridgePenalty = 1 - Math.max(sourceCc, targetCc);

	const score = jaccardScore * bridgePenalty;

	return Math.max(epsilon, score);
}
