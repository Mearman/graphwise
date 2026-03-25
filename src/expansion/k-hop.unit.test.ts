import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import { kHop } from "./k-hop";
import type { Seed } from "./types";

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

function createTestGraph(): AdjacencyMapGraph<TestNode, TestEdge> {
	const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
	const nodes = ["A", "B", "C", "D", "E"];

	for (const id of nodes) {
		graph.addNode({ id, label: `Node ${id}` });
	}

	// Linear chain: A - B - C - D - E
	for (let i = 0; i < nodes.length - 1; i++) {
		const source = nodes[i];
		const target = nodes[i + 1];
		if (source !== undefined && target !== undefined) {
			graph.addEdge({ source, target, weight: 1 });
		}
	}

	return graph;
}

describe("kHop expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createTestGraph();
		const result = kHop(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = kHop(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("limits exploration to k=1 hop neighbourhood", () => {
		const graph = createTestGraph();
		// Seed A with k=1: A (degree 1) connects only to B, so exactly 2 nodes visited
		const seeds: Seed[] = [{ id: "A" }];

		const result = kHop(graph, seeds, { k: 1 });

		// A and its direct neighbour B — no further nodes reachable at depth 1
		expect(result.stats.nodesVisited).toBe(2);
		expect(result.sampledNodes.has("A")).toBe(true);
		expect(result.sampledNodes.has("B")).toBe(true);
		expect(result.sampledNodes.has("C")).toBe(false);
	});

	it("uses k=2 by default and explores two-hop neighbourhood", () => {
		const graph = createTestGraph();
		// Seed C is in the middle; within 2 hops: C, B, D, A, E
		const seeds: Seed[] = [{ id: "C" }];

		const result = kHop(graph, seeds);

		// All 5 nodes are within 2 hops of C on a 5-node chain
		expect(result.stats.nodesVisited).toBeGreaterThanOrEqual(3);
	});

	it("finds paths between seeds within k hops", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "C" }];

		// A and C are 2 hops apart; default k=2 should find a path
		const result = kHop(graph, seeds, { k: 2 });

		expect(result.paths.length).toBeGreaterThan(0);
	});

	it("handles disconnected seeds", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });

		const result = kHop(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});
});
