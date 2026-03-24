import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import { lace } from "./lace";
import type { LACEConfig } from "./lace";
import type { Seed } from "./types";
import { jaccard } from "../ranking/mi/jaccard";

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

/**
 * Create a graph with varying neighbourhood overlap.
 *
 * Structure:
 *   A - B - C
 *   |   |   |
 *   D - E - F
 *
 * A-E and C-E have higher MI due to shared neighbours.
 */
function createOverlapGraph(): AdjacencyMapGraph<TestNode, TestEdge> {
	const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
	const nodes = ["A", "B", "C", "D", "E", "F"];

	for (const id of nodes) {
		graph.addNode({ id, label: `Node ${id}` });
	}

	// Horizontal edges
	graph.addEdge({ source: "A", target: "B", weight: 1 });
	graph.addEdge({ source: "B", target: "C", weight: 1 });
	graph.addEdge({ source: "D", target: "E", weight: 1 });
	graph.addEdge({ source: "E", target: "F", weight: 1 });

	// Vertical edges
	graph.addEdge({ source: "A", target: "D", weight: 1 });
	graph.addEdge({ source: "B", target: "E", weight: 1 });
	graph.addEdge({ source: "C", target: "F", weight: 1 });

	return graph;
}

describe("lace expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createTestGraph();
		const result = lace(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = lace(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("reports algorithm name", () => {
		const graph = createTestGraph();
		const result = lace(graph, [{ id: "A" }, { id: "B" }]);

		// LACE wraps BASE, so algorithm name is inherited
		expect(result.stats.algorithm).toBeDefined();
	});

	it("handles disconnected seeds", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });

		const result = lace(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("includes duration in stats", () => {
		const graph = createTestGraph();
		const result = lace(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("accepts custom MI function", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		// Custom MI function that returns fixed values
		const customMi = (): number => 0.5;

		const result = lace(graph, seeds, { mi: customMi });

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("accepts LACEConfig with MI function", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const config: LACEConfig<TestNode, TestEdge> = {
			mi: jaccard,
			maxIterations: 10,
		};

		const result = lace(graph, seeds, config);

		expect(result).toHaveProperty("paths");
	});

	it("respects maxIterations config", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = lace(graph, seeds, { maxIterations: 2 });

		// Should stop early due to iteration limit
		expect(result.stats.iterations).toBeLessThanOrEqual(2);
	});

	it("respects maxNodes config", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = lace(graph, seeds, { maxNodes: 3 });

		// Should stop when node limit reached
		expect(result.sampledNodes.size).toBeLessThanOrEqual(3);
	});

	it("uses default jaccard MI when no MI function provided", () => {
		const graph = createOverlapGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "C" }];

		// Should not throw when using default jaccard
		const result = lace(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("stats");
	});

	it("handles graph with no edges", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });

		const result = lace(graph, [{ id: "A" }, { id: "B" }]);

		// No paths possible without edges
		expect(result.paths).toHaveLength(0);
	});

	it("handles single node graph", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });

		const result = lace(graph, [{ id: "A" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("returns paths with seed endpoints when paths discovered", () => {
		const graph = createOverlapGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "F" }];

		const result = lace(graph, seeds);

		// If paths are found, they should have correct structure
		for (const path of result.paths) {
			expect(path).toHaveProperty("fromSeed");
			expect(path).toHaveProperty("toSeed");
			expect(path).toHaveProperty("nodes");
			expect(path.nodes.length).toBeGreaterThan(0);
		}
	});

	it("produces deterministic results with same seeds", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result1 = lace(graph, seeds);
		const result2 = lace(graph, seeds);

		expect(result1.stats.nodesVisited).toBe(result2.stats.nodesVisited);
		expect(result1.paths.length).toBe(result2.paths.length);
	});
});
