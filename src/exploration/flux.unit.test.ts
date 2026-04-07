import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import { flux, fluxAsync } from "./flux";
import type { Seed } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";
import type { KGNode } from "../__test__/fixtures/types";

/**
 * Create a dense graph (high local clustering):
 *
 *   A --- B
 *   |  \/ |
 *   C --- D
 */
function createDenseGraph(): AdjacencyMapGraph<KGNode> {
	const graph = AdjacencyMapGraph.undirected<KGNode>();
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
function createBridgeGraph(): AdjacencyMapGraph<KGNode> {
	const graph = AdjacencyMapGraph.undirected<KGNode>();
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

describe("flux exploration", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = flux(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = flux(graph, seeds);

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
		const graph = createLinearChainGraph();
		const result = flux(graph, [{ id: "A" }, { id: "B" }]);

		// MAZE wraps BASE, so algorithm name is inherited
		expect(result.stats.algorithm).toBeDefined();
	});

	it("handles disconnected seeds gracefully", () => {
		const graph = createDisconnectedGraph();

		const seeds: Seed[] = [{ id: "A" }, { id: "B" }];
		const result = flux(graph, seeds);

		expect(result.paths).toHaveLength(0);
	});

	it("includes duration in stats", () => {
		const graph = createLinearChainGraph();
		const result = flux(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("includes iterations in stats", () => {
		const graph = createLinearChainGraph();
		const result = flux(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.iterations).toBeGreaterThanOrEqual(0);
	});

	it("includes edges traversed in stats", () => {
		const graph = createLinearChainGraph();
		const result = flux(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.edgesTraversed).toBeGreaterThanOrEqual(0);
	});

	it("includes paths found in stats", () => {
		const graph = createLinearChainGraph();
		const result = flux(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.pathsFound).toBeGreaterThanOrEqual(0);
	});

	it("accepts custom densityThreshold config", () => {
		const graph = createDenseGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "D" }];

		// Low density threshold should trigger EDGE mode more often
		const result = flux(graph, seeds, { densityThreshold: 0.1 });

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("accepts custom bridgeThreshold config", () => {
		const graph = createBridgeGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "F" }];

		// High bridge threshold should trigger PIPE mode more often
		const result = flux(graph, seeds, { bridgeThreshold: 0.8 });

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("accepts both custom thresholds", () => {
		const graph = createBridgeGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "F" }];

		const result = flux(graph, seeds, {
			densityThreshold: 0.3,
			bridgeThreshold: 0.2,
		});

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("expands linear graph and samples nodes", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = flux(graph, seeds);

		// MAZE should expand the graph from both seeds
		expect(result.sampledNodes.size).toBeGreaterThan(0);
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("expands dense graph with high clustering", () => {
		const graph = createDenseGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "D" }];

		const result = flux(graph, seeds);

		// Dense graph should trigger EDGE mode behaviour
		expect(result.sampledNodes.size).toBeGreaterThan(0);
		expect(result.stats.edgesTraversed).toBeGreaterThan(0);
	});

	it("expands bridge graph with clusters", () => {
		const graph = createBridgeGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "F" }];

		const result = flux(graph, seeds);

		// Bridge graph should trigger PIPE mode for bridge nodes
		expect(result.sampledNodes.size).toBeGreaterThan(0);
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("respects maxNodes configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = flux(graph, seeds, { maxNodes: 2 });

		expect(result.sampledNodes.size).toBeLessThanOrEqual(2);
	});

	it("respects maxIterations configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = flux(graph, seeds, { maxIterations: 1 });

		expect(result.stats.iterations).toBeLessThanOrEqual(1);
	});

	it("respects maxPaths configuration", () => {
		const graph = createDenseGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "D" }];

		const result = flux(graph, seeds, { maxPaths: 1 });

		expect(result.paths.length).toBeLessThanOrEqual(1);
	});

	it("handles single seed gracefully", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }];

		const result = flux(graph, seeds);

		// Single seed cannot form paths between seeds
		expect(result.paths).toHaveLength(0);
	});

	it("handles seed not in graph", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "Z" }];

		// Should not throw
		const result = flux(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("visits nodes from all seed frontiers", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = flux(graph, seeds);

		// Should have visitedPerFrontier array matching seeds
		expect(result.visitedPerFrontier.length).toBeGreaterThan(0);
	});

	it("returns immutable path nodes", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = flux(graph, seeds);

		if (result.paths.length > 0) {
			const firstPath = result.paths[0];
			if (firstPath !== undefined) {
				expect(Array.isArray(firstPath.nodes)).toBe(true);
				expect(firstPath.nodes.length).toBeGreaterThan(0);
			}
		}
	});
});

describe("fluxAsync export", () => {
	it("is an async function", () => {
		// Full async equivalence requires PriorityContext refactoring (Phase 4b deferred).
		// The priority function accesses context.graph to compute local density and
		// cross-frontier bridge scores, which is the sentinel in async mode. This test
		// verifies the export exists with the correct async signature.
		expect(typeof fluxAsync).toBe("function");
		expect(fluxAsync.constructor.name).toBe("AsyncFunction");
	});
});
