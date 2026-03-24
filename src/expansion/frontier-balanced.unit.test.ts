import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import { frontierBalanced } from "./frontier-balanced";
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

	for (let i = 0; i < nodes.length - 1; i++) {
		const source = nodes[i];
		const target = nodes[i + 1];
		if (source !== undefined && target !== undefined) {
			graph.addEdge({ source, target, weight: 1 });
		}
	}

	return graph;
}

describe("frontierBalanced expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createTestGraph();
		const result = frontierBalanced(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = frontierBalanced(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("balances expansion across frontiers", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = frontierBalanced(graph, seeds);

		// Both frontiers should be visited
		expect(result.visitedPerFrontier.length).toBe(2);
		if (
			result.visitedPerFrontier[0] !== undefined &&
			result.visitedPerFrontier[1] !== undefined
		) {
			// Both should have some nodes visited
			expect(result.visitedPerFrontier[0].size).toBeGreaterThan(0);
			expect(result.visitedPerFrontier[1].size).toBeGreaterThan(0);
		}
	});

	it("handles disconnected seeds", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });

		const result = frontierBalanced(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("respects maxIterations limit", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = frontierBalanced(graph, seeds, { maxIterations: 3 });

		expect(result.stats.iterations).toBeLessThanOrEqual(3);
		expect(result.stats.termination).toBe("limit");
	});
});
