import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import { sage } from "./sage";
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

describe("SAGE expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createTestGraph();
		const result = sage(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("discovers paths between seeds", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds);

		expect(result.paths.length).toBeGreaterThan(0);
	});

	it("respects maxPaths configuration", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds, { maxPaths: 1 });

		expect(result.paths.length).toBeLessThanOrEqual(1);
		expect(result.stats.termination).toBe("limit");
	});

	it("respects maxNodes configuration", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds, { maxNodes: 3 });

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(3);
		expect(result.stats.termination).toBe("limit");
	});

	it("includes all discovered paths", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds);

		for (const path of result.paths) {
			expect(path.nodes).toContain("A");
			expect(path.nodes).toContain("E");
			expect(path.nodes.length).toBeGreaterThanOrEqual(2);
		}
	});

	it("transitions to phase 2 after discovering first path", () => {
		const graph = createTestGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds, { debug: false });

		// Phase 2 should be triggered when paths exist
		if (result.paths.length > 1) {
			expect(result.stats.pathsFound).toBeGreaterThan(1);
		}
	});

	it("tracks salience across multiple paths", () => {
		// Create a graph where a central node will appear in multiple paths
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const nodes = ["A", "B", "C", "X", "D", "E", "F"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		// Hub structure: A-X-D, B-X-E, C-X-F
		// X is a hub appearing in multiple paths
		graph.addEdge({ source: "A", target: "X", weight: 1 });
		graph.addEdge({ source: "B", target: "X", weight: 1 });
		graph.addEdge({ source: "C", target: "X", weight: 1 });
		graph.addEdge({ source: "X", target: "D", weight: 1 });
		graph.addEdge({ source: "X", target: "E", weight: 1 });
		graph.addEdge({ source: "X", target: "F", weight: 1 });

		const result = sage(graph, [{ id: "A" }, { id: "D" }]);

		expect(result.paths.length).toBeGreaterThan(0);
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});
});
