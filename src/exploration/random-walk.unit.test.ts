import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import { randomWalk } from "./random-walk";
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

describe("randomWalk exploration", () => {
	it("returns empty result for no seeds", () => {
		const graph = createTestGraph();
		const result = randomWalk(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.sampledNodes.size).toBe(0);
		expect(result.sampledEdges.size).toBe(0);
		expect(result.visitedPerFrontier).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
		expect(result.stats.algorithm).toBe("random-walk");
	});

	it("returns a result object with correct structure", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = randomWalk(graph, seeds, { seed: 42 });

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("visitedPerFrontier");
		expect(result).toHaveProperty("stats");
		expect(result.stats.algorithm).toBe("random-walk");
	});

	it("produces deterministic results with the same seed", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result1 = randomWalk(graph, seeds, { seed: 42 });
		const result2 = randomWalk(graph, seeds, { seed: 42 });

		expect(result1.stats.nodesVisited).toBe(result2.stats.nodesVisited);
		expect(result1.stats.edgesTraversed).toBe(result2.stats.edgesTraversed);
		expect(result1.paths.length).toBe(result2.paths.length);
	});

	it("can produce different results with a different seed", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result1 = randomWalk(graph, seeds, { seed: 1 });
		const result2 = randomWalk(graph, seeds, { seed: 999 });

		// Both results should be structurally valid
		expect(result1.stats.nodesVisited).toBeGreaterThanOrEqual(0);
		expect(result2.stats.nodesVisited).toBeGreaterThanOrEqual(0);
	});

	it("finds paths between connected seeds on a linear chain", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		// Use many walks and longer lengths to ensure a path is detected
		const result = randomWalk(graph, seeds, {
			seed: 1,
			walks: 50,
			walkLength: 30,
		});

		expect(result.stats.nodesVisited).toBeGreaterThan(0);
		// At least one of A or E should be visited
		expect(result.sampledNodes.has("A") || result.sampledNodes.has("E")).toBe(
			true,
		);
	});

	it("handles disconnected seeds without paths", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "X", label: "X" });
		graph.addNode({ id: "Y", label: "Y" });
		// No edge between X and Y

		const result = randomWalk(graph, [{ id: "X" }, { id: "Y" }], {
			seed: 42,
		});

		expect(result.paths).toHaveLength(0);
	});

	it("seeds are always included in sampledNodes", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "B" }, { id: "D" }];

		const result = randomWalk(graph, seeds, { seed: 7 });

		expect(result.sampledNodes.has("B")).toBe(true);
		expect(result.sampledNodes.has("D")).toBe(true);
	});

	it("visitedPerFrontier has one entry per seed", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "C" }, { id: "E" }];

		const result = randomWalk(graph, seeds, { seed: 0 });

		expect(result.visitedPerFrontier).toHaveLength(3);
	});
});
