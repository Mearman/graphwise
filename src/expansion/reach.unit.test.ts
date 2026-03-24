import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import { reach } from "./reach";
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

describe("reach expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createTestGraph();
		const result = reach(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = reach(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("reports algorithm name", () => {
		const graph = createTestGraph();
		const result = reach(graph, [{ id: "A" }, { id: "B" }]);

		// REACH wraps BASE, so algorithm name is inherited
		expect(result.stats.algorithm).toBeDefined();
	});

	it("handles disconnected seeds", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });

		const result = reach(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("uses custom MI threshold", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = reach(graph, seeds, { miThreshold: 0.5 });

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("uses custom MI function", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		// Custom MI function that returns constant value
		const customMi = (): number => 0.5;

		const result = reach(graph, seeds, { mi: customMi });

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("respects maxNodes configuration", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = reach(graph, seeds, { maxNodes: 3 });

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(3);
	});

	it("respects maxIterations configuration", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = reach(graph, seeds, { maxIterations: 2 });

		expect(result.stats.iterations).toBeLessThanOrEqual(2);
	});

	it("respects maxPaths configuration", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = reach(graph, seeds, { maxPaths: 1 });

		expect(result.paths.length).toBeLessThanOrEqual(1);
	});

	it("handles single seed", () => {
		const graph = createTestGraph();
		const result = reach(graph, [{ id: "A" }]);

		// Single seed cannot discover paths between seeds
		expect(result.paths).toHaveLength(0);
	});

	it("handles seed not in graph", () => {
		const graph = createTestGraph();
		const result = reach(graph, [{ id: "NONEXISTENT" }, { id: "A" }]);

		// Should handle gracefully without throwing
		expect(result).toHaveProperty("paths");
	});

	it("returns visitedPerFrontier array", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = reach(graph, seeds);

		expect(result.visitedPerFrontier).toBeDefined();
		expect(Array.isArray(result.visitedPerFrontier)).toBe(true);
	});
});
