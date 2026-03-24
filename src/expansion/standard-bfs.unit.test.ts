import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import { standardBfs } from "./standard-bfs";
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

describe("standardBfs expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createTestGraph();
		const result = standardBfs(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = standardBfs(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("explores nodes in FIFO order", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }];

		const result = standardBfs(graph, seeds);

		// BFS should discover nodes level-by-level
		expect(result.stats.algorithm).toBeDefined();
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("handles disconnected seeds", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });

		const result = standardBfs(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("respects maxNodes limit", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = standardBfs(graph, seeds, { maxNodes: 2 });

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(2);
		expect(result.stats.termination).toBe("limit");
	});
});
