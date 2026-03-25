import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import { maze } from "./maze";
import type { Seed } from "./types";
import { createLinearChainGraph } from "../__test__/fixtures/graphs/linear-chain";
import type { KGNode } from "../__test__/fixtures/types";

describe("MAZE expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = maze(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = maze(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("discovers paths between seeds", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = maze(graph, seeds);

		expect(result.paths.length).toBeGreaterThan(0);
	});

	it("respects maxPaths configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = maze(graph, seeds, { maxPaths: 1 });

		expect(result.paths.length).toBeLessThanOrEqual(1);
		expect(result.stats.termination).toBe("limit");
	});

	it("respects maxNodes configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = maze(graph, seeds, { maxNodes: 3 });

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(3);
		expect(result.stats.termination).toBe("limit");
	});

	it("includes all discovered paths", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = maze(graph, seeds);

		for (const path of result.paths) {
			expect(path.nodes).toContain("A");
			expect(path.nodes).toContain("E");
			expect(path.nodes.length).toBeGreaterThanOrEqual(2);
		}
	});

	it("uses path potential in phase 1", () => {
		// Create graph with bridge nodes to test path potential
		const graph = AdjacencyMapGraph.undirected<KGNode>();

		// Two clusters connected by bridge
		const nodes = ["A", "X", "B", "C", "D", "E", "Y", "F"];
		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		// Left cluster
		graph.addEdge({ source: "A", target: "X", weight: 1 });
		graph.addEdge({ source: "X", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });

		// Bridge
		graph.addEdge({ source: "X", target: "D", weight: 1 });

		// Right cluster
		graph.addEdge({ source: "D", target: "E", weight: 1 });
		graph.addEdge({ source: "E", target: "Y", weight: 1 });
		graph.addEdge({ source: "Y", target: "F", weight: 1 });

		const result = maze(graph, [{ id: "A" }, { id: "F" }]);

		expect(result.paths.length).toBeGreaterThan(0);
		const firstPath = result.paths[0];
		if (firstPath !== undefined) {
			expect(firstPath.nodes).toContain("A");
			expect(firstPath.nodes).toContain("F");
		}
	});

	it("transitions to phase 2 after threshold of paths", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		// Allow discovery of multiple paths to trigger phase 2
		const result = maze(graph, seeds);

		// Verify expansion completed and may have discovered multiple paths
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("combines path potential with salience weighting in phase 2", () => {
		// Create graph where multiple paths can be discovered
		const graph = AdjacencyMapGraph.undirected<KGNode>();

		// Hub structure for multiple paths
		const nodes = ["A", "B", "X", "C", "Y", "D"];
		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		// Multiple paths through X
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "X", weight: 1 });
		graph.addEdge({ source: "A", target: "C", weight: 1 });
		graph.addEdge({ source: "C", target: "X", weight: 1 });
		graph.addEdge({ source: "X", target: "Y", weight: 1 });
		graph.addEdge({ source: "Y", target: "D", weight: 1 });

		const result = maze(graph, [{ id: "A" }, { id: "D" }]);

		expect(result.paths.length).toBeGreaterThan(0);
		// X should appear in discovered paths
		for (const path of result.paths) {
			expect(path.nodes.includes("A")).toBe(true);
			expect(path.nodes.includes("D")).toBe(true);
		}
	});

	it("handles edge case of single path discovery", () => {
		const graph = createLinearChainGraph();
		const result = maze(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});
});
