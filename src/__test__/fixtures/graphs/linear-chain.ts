/**
 * Simple linear-chain graph fixtures for expansion unit tests.
 *
 * These lightweight fixtures replace the per-file boilerplate found across
 * the expansion algorithm unit tests. Each test file previously declared its
 * own identical `TestNode`, `TestEdge`, and `createTestGraph()` / `createLinearGraph()`
 * — this module is the single canonical source.
 */

import { AdjacencyMapGraph } from "../../../graph";
import type { KGNode } from "../types";

/**
 * Five-node linear chain: A – B – C – D – E, all edges weight 1.
 *
 * Used as the primary test graph in expansion unit tests. Seeds are typically
 * placed at the two endpoints (A and E) to exercise bidirectional expansion
 * across the full chain length.
 */
export function createLinearChainGraph(): AdjacencyMapGraph<KGNode> {
	const graph = AdjacencyMapGraph.undirected<KGNode>();
	const nodes = ["A", "B", "C", "D", "E"];

	for (const id of nodes) {
		graph.addNode({ id, label: `Node ${id}` });
	}

	for (let i = 0; i < nodes.length - 1; i++) {
		const source = nodes[i];
		const target = nodes[i + 1];
		if (source !== undefined && target !== undefined) {
			graph.addEdge({ source, target, weight: 1 });
		}
	}

	return graph;
}

/**
 * Two disconnected nodes A and B with no edges between them.
 *
 * Used to verify that expansion algorithms correctly return zero paths when
 * seeds cannot be connected.
 */
export function createDisconnectedGraph(): AdjacencyMapGraph<KGNode> {
	const graph = AdjacencyMapGraph.undirected<KGNode>();
	graph.addNode({ id: "A", label: "A" });
	graph.addNode({ id: "B", label: "B" });
	return graph;
}
