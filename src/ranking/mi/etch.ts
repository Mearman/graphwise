/**
 * ETCH (Edge Topology Coherence via Homophily) MI variant.
 *
 * Measures the density of connections among common neighbours,
 * capturing structural cohesion around the edge.
 *
 * ETCH(u,v) = weighted combination of:
 *   - Joint density: edges among N(u) ∩ N(v)
 *   - Common density: edges from (u,v) to common neighbours
 *
 * Range: [0, 1]
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
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

	// Get neighbourhoods
	const sourceNeighbours = new Set(graph.neighbours(source));
	const targetNeighbours = new Set(graph.neighbours(target));

	// Remove self-references
	sourceNeighbours.delete(target);
	targetNeighbours.delete(source);

	// Find common neighbours
	const commonNeighbours: NodeId[] = [];
	for (const neighbour of sourceNeighbours) {
		if (targetNeighbours.has(neighbour)) {
			commonNeighbours.push(neighbour);
		}
	}

	if (commonNeighbours.length < 2) {
		return epsilon;
	}

	// Component 1: Joint density (edges among common neighbours)
	let jointEdges = 0;
	for (let i = 0; i < commonNeighbours.length; i++) {
		for (let j = i + 1; j < commonNeighbours.length; j++) {
			const ni = commonNeighbours[i];
			const nj = commonNeighbours[j];
			if (
				ni !== undefined &&
				nj !== undefined &&
				graph.getEdge(ni, nj) !== undefined
			) {
				jointEdges++;
			}
		}
	}

	const maxJointEdges =
		(commonNeighbours.length * (commonNeighbours.length - 1)) / 2;
	const jointDensity = maxJointEdges > 0 ? jointEdges / maxJointEdges : 0;

	// Component 2: Common density (edges from endpoints to common neighbours)
	let commonEdges = 0;
	for (const cn of commonNeighbours) {
		if (graph.getEdge(source, cn) !== undefined) {
			commonEdges++;
		}
		if (graph.getEdge(target, cn) !== undefined) {
			commonEdges++;
		}
	}

	const maxCommonEdges = commonNeighbours.length * 2;
	const commonDensity = maxCommonEdges > 0 ? commonEdges / maxCommonEdges : 0;

	// Weighted combination
	const score = jointDensity * 0.7 + commonDensity * 0.3;

	return Math.max(epsilon, Math.min(1, score));
}
