import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import { randomPriority } from "./random-priority";
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

describe("randomPriority expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createTestGraph();
		const result = randomPriority(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = randomPriority(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("is reproducible with same seed", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result1 = randomPriority(graph, seeds, { seed: 42 });
		const result2 = randomPriority(graph, seeds, { seed: 42 });

		expect(result1.stats.nodesVisited).toBe(result2.stats.nodesVisited);
	});

	it("may produce different results with different seeds", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result1 = randomPriority(graph, seeds, { seed: 42 });
		const result2 = randomPriority(graph, seeds, { seed: 43 });

		// Both should produce valid results with no null values
		expect(result1.stats.nodesVisited).toBeGreaterThanOrEqual(0);
		expect(result2.stats.nodesVisited).toBeGreaterThanOrEqual(0);
	});

	it("handles disconnected seeds", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });

		const result = randomPriority(graph, [{ id: "A" }, { id: "B" }], {
			seed: 42,
		});

		expect(result.paths).toHaveLength(0);
	});

	it("respects maxNodes limit", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = randomPriority(graph, seeds, {
			maxNodes: 2,
			seed: 42,
		});

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(2);
		expect(result.stats.termination).toBe("limit");
	});
});
