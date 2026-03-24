import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import { hae } from "./hae";
import type { Seed } from "./types";

interface TestNode extends NodeData {
	readonly label: string;
	readonly category?: string;
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

describe("hae expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createTestGraph();
		const result = hae(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = hae(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("sets algorithm name in stats", () => {
		const graph = createTestGraph();
		const result = hae(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.algorithm).toBeDefined();
	});

	it("handles disconnected seeds", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });

		const result = hae(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("uses default type mapper when none provided", () => {
		const graph = createTestGraph();
		const result = hae(graph, [{ id: "A" }, { id: "E" }]);

		// Should work without error
		expect(result).toHaveProperty("paths");
	});

	it("uses custom type mapper when provided", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A", category: "TypeX" });
		graph.addNode({ id: "B", label: "B", category: "TypeX" });
		graph.addNode({ id: "C", label: "C", category: "TypeY" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });

		const isNodeWithCategory = (
			node: unknown,
		): node is { category?: string } => {
			return (
				typeof node === "object" &&
				node !== null &&
				("category" in node || "id" in node)
			);
		};

		const result = hae(graph, [{ id: "A" }, { id: "C" }] as const, {
			typeMapper: (node) => {
				// Custom mapper can access extended properties on TestNode
				if (isNodeWithCategory(node)) {
					return node.category ?? "default";
				}
				return "default";
			},
		});

		// Should work with custom mapper
		expect(result).toHaveProperty("paths");
	});

	it("discovers paths between connected seeds", () => {
		const graph = createTestGraph();
		const result = hae(graph, [{ id: "A" }, { id: "E" }]);

		expect(result.paths.length).toBeGreaterThan(0);
	});
});
