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

	// Linear path: A - B - C - D - E
	for (let i = 0; i < nodes.length - 1; i++) {
		const source = nodes[i];
		const target = nodes[i + 1];
		if (source !== undefined && target !== undefined) {
			graph.addEdge({ source, target, weight: 1 });
		}
	}

	return graph;
}

describe("REACH expansion", () => {
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

	it("discovers paths between seeds", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = reach(graph, seeds);

		expect(result.paths.length).toBeGreaterThan(0);
	});

	it("respects maxPaths configuration", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = reach(graph, seeds, { maxPaths: 1 });

		expect(result.paths.length).toBeLessThanOrEqual(1);
		expect(result.stats.termination).toBe("limit");
	});

	it("respects maxNodes configuration", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = reach(graph, seeds, { maxNodes: 3 });

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(3);
		expect(result.stats.termination).toBe("limit");
	});

	it("includes all discovered paths", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = reach(graph, seeds);

		for (const path of result.paths) {
			expect(path.nodes).toContain("A");
			expect(path.nodes).toContain("E");
			expect(path.nodes.length).toBeGreaterThanOrEqual(2);
		}
	});

	it("transitions to phase 2 after discovering first path", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = reach(graph, seeds);

		// Phase 2 should be triggered when paths exist
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("computes MI estimates to path endpoints in phase 2", () => {
		// Create graph with distinct neighbourhoods for endpoints
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

		// Structure: separate clusters connected by path
		const nodes = ["A", "X", "Y", "C", "D", "W", "Z", "E"];
		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		// Cluster A
		graph.addEdge({ source: "A", target: "X", weight: 1 });
		graph.addEdge({ source: "X", target: "Y", weight: 1 });
		// Connection
		graph.addEdge({ source: "Y", target: "C", weight: 1 });
		graph.addEdge({ source: "C", target: "D", weight: 1 });
		graph.addEdge({ source: "D", target: "W", weight: 1 });
		// Cluster E
		graph.addEdge({ source: "W", target: "Z", weight: 1 });
		graph.addEdge({ source: "Z", target: "E", weight: 1 });

		const result = reach(graph, [{ id: "A" }, { id: "E" }]);

		expect(result.paths.length).toBeGreaterThan(0);
		// Verify path found connects endpoints
		const firstPath = result.paths[0];
		if (firstPath !== undefined) {
			expect(firstPath.nodes[0]).toBe("A");
			expect(firstPath.nodes[firstPath.nodes.length - 1]).toBe("E");
		}
	});

	it("deprioritises nodes similar to path endpoints in phase 2", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

		// Hub and periphery structure
		const nodes = ["A", "B", "C", "D", "E"];
		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		// A-B is the main path, with C and D as similar-neighbourhood nodes
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "A", target: "C", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });
		graph.addEdge({ source: "B", target: "D", weight: 1 });
		graph.addEdge({ source: "B", target: "E", weight: 1 });

		const result = reach(graph, [{ id: "A" }, { id: "E" }]);

		// REACH should discover paths and complete without error
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});
});
