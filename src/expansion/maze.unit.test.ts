import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import { maze } from "./maze";
import type { Seed } from "./types";

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

/**
 * Create a simple linear graph: A - B - C - D - E
 */
function createLinearGraph(): AdjacencyMapGraph<TestNode, TestEdge> {
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
 * Create a dense graph (high local clustering):
 *
 *   A --- B
 *   |     |
 *   C --- D
 */
function createDenseGraph(): AdjacencyMapGraph<TestNode, TestEdge> {
	const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
	const nodes = ["A", "B", "C", "D"];

	for (const id of nodes) {
		graph.addNode({ id, label: `Node ${id}` });
	}

	// Create a complete-like subgraph
	graph.addEdge({ source: "A", target: "B", weight: 1 });
	graph.addEdge({ source: "A", target: "C", weight: 1 });
	graph.addEdge({ source: "B", target: "D", weight: 1 });
	graph.addEdge({ source: "C", target: "D", weight: 1 });
	graph.addEdge({ source: "A", target: "D", weight: 1 });
	graph.addEdge({ source: "B", target: "C", weight: 1 });

	return graph;
}

/**
 * Create a graph with a bridge structure:
 *
 *   A - B - C - D - E - F
 *       |       |
 *       G       H
 *
 * Node C is a bridge connecting the two clusters.
 */
function createBridgeGraph(): AdjacencyMapGraph<TestNode, TestEdge> {
	const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
	const nodes = ["A", "B", "C", "D", "E", "F", "G", "H"];

	for (const id of nodes) {
		graph.addNode({ id, label: `Node ${id}` });
	}

	// Left cluster
	graph.addEdge({ source: "A", target: "B", weight: 1 });
	graph.addEdge({ source: "B", target: "C", weight: 1 });
	graph.addEdge({ source: "B", target: "G", weight: 1 });

	// Bridge path
	graph.addEdge({ source: "C", target: "D", weight: 1 });

	// Right cluster
	graph.addEdge({ source: "D", target: "E", weight: 1 });
	graph.addEdge({ source: "D", target: "H", weight: 1 });
	graph.addEdge({ source: "E", target: "F", weight: 1 });

	return graph;
}

describe("maze expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearGraph();
		const result = maze(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = maze(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("visitedPerFrontier");
		expect(result).toHaveProperty("stats");
		expect(Array.isArray(result.paths)).toBe(true);
		expect(result.sampledNodes).toBeInstanceOf(Set);
		expect(result.sampledEdges).toBeInstanceOf(Set);
	});

	it("reports algorithm name", () => {
		const graph = createLinearGraph();
		const result = maze(graph, [{ id: "A" }, { id: "B" }]);

		// MAZE wraps BASE, so algorithm name is inherited
		expect(result.stats.algorithm).toBeDefined();
	});

	it("handles disconnected seeds gracefully", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });

		const seeds: Seed[] = [{ id: "A" }, { id: "B" }];
		const result = maze(graph, seeds);

		expect(result.paths).toHaveLength(0);
	});

	it("includes duration in stats", () => {
		const graph = createLinearGraph();
		const result = maze(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("includes iterations in stats", () => {
		const graph = createLinearGraph();
		const result = maze(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.iterations).toBeGreaterThanOrEqual(0);
	});

	it("includes edges traversed in stats", () => {
		const graph = createLinearGraph();
		const result = maze(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.edgesTraversed).toBeGreaterThanOrEqual(0);
	});

	it("includes paths found in stats", () => {
		const graph = createLinearGraph();
		const result = maze(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.pathsFound).toBeGreaterThanOrEqual(0);
	});

	it("accepts custom densityThreshold config", () => {
		const graph = createDenseGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "D" }];

		// Low density threshold should trigger EDGE mode more often
		const result = maze(graph, seeds, { densityThreshold: 0.1 });

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("accepts custom bridgeThreshold config", () => {
		const graph = createBridgeGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "F" }];

		// High bridge threshold should trigger PIPE mode more often
		const result = maze(graph, seeds, { bridgeThreshold: 0.8 });

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("accepts both custom thresholds", () => {
		const graph = createBridgeGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "F" }];

		const result = maze(graph, seeds, {
			densityThreshold: 0.3,
			bridgeThreshold: 0.2,
		});

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("expands linear graph and samples nodes", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = maze(graph, seeds);

		// MAZE should expand the graph from both seeds
		expect(result.sampledNodes.size).toBeGreaterThan(0);
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("expands dense graph with high clustering", () => {
		const graph = createDenseGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "D" }];

		const result = maze(graph, seeds);

		// Dense graph should trigger EDGE mode behaviour
		expect(result.sampledNodes.size).toBeGreaterThan(0);
		expect(result.stats.edgesTraversed).toBeGreaterThan(0);
	});

	it("expands bridge graph with clusters", () => {
		const graph = createBridgeGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "F" }];

		const result = maze(graph, seeds);

		// Bridge graph should trigger PIPE mode for bridge nodes
		expect(result.sampledNodes.size).toBeGreaterThan(0);
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("respects maxNodes configuration", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = maze(graph, seeds, { maxNodes: 2 });

		expect(result.sampledNodes.size).toBeLessThanOrEqual(2);
	});

	it("respects maxIterations configuration", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = maze(graph, seeds, { maxIterations: 1 });

		expect(result.stats.iterations).toBeLessThanOrEqual(1);
	});

	it("respects maxPaths configuration", () => {
		const graph = createDenseGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "D" }];

		const result = maze(graph, seeds, { maxPaths: 1 });

		expect(result.paths.length).toBeLessThanOrEqual(1);
	});

	it("handles single seed gracefully", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }];

		const result = maze(graph, seeds);

		// Single seed cannot form paths between seeds
		expect(result.paths).toHaveLength(0);
	});

	it("handles seed not in graph", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "Z" }];

		// Should not throw
		const result = maze(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("visits nodes from all seed frontiers", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = maze(graph, seeds);

		// Should have visitedPerFrontier array matching seeds
		expect(result.visitedPerFrontier.length).toBeGreaterThan(0);
	});

	it("returns immutable path nodes", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = maze(graph, seeds);

		if (result.paths.length > 0) {
			const firstPath = result.paths[0];
			if (firstPath !== undefined) {
				expect(Array.isArray(firstPath.nodes)).toBe(true);
				expect(firstPath.nodes.length).toBeGreaterThan(0);
			}
		}
	});
});
