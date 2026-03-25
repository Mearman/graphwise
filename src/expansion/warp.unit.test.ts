import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import { warp, warpAsync } from "./warp";
import type { Seed } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";
import type { KGNode } from "../__test__/fixtures/types";

/**
 * Create a bridge graph:
 *
 *   A - B - C
 *       |
 *   D - E - F
 *
 * G is a bridge node connecting the two clusters via B and E.
 */
function createBridgeGraph(): AdjacencyMapGraph<KGNode> {
	const graph = AdjacencyMapGraph.undirected<KGNode>();

	// Left cluster
	graph.addNode({ id: "A", label: "A" });
	graph.addNode({ id: "B", label: "B" });
	graph.addNode({ id: "C", label: "C" });

	// Right cluster
	graph.addNode({ id: "D", label: "D" });
	graph.addNode({ id: "E", label: "E" });
	graph.addNode({ id: "F", label: "F" });

	// Bridge node
	graph.addNode({ id: "G", label: "G" });

	// Left cluster edges
	graph.addEdge({ source: "A", target: "B", weight: 1 });
	graph.addEdge({ source: "B", target: "C", weight: 1 });

	// Right cluster edges
	graph.addEdge({ source: "D", target: "E", weight: 1 });
	graph.addEdge({ source: "E", target: "F", weight: 1 });

	// Bridge connections
	graph.addEdge({ source: "B", target: "G", weight: 1 });
	graph.addEdge({ source: "E", target: "G", weight: 1 });

	return graph;
}

describe("warp expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = warp(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = warp(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("visitedPerFrontier");
		expect(result).toHaveProperty("stats");
		expect(Array.isArray(result.paths)).toBe(true);
		expect(result.sampledNodes).toBeInstanceOf(Set);
		expect(result.sampledEdges).toBeInstanceOf(Set);
	});

	it("handles disconnected seeds gracefully", () => {
		const graph = createDisconnectedGraph();

		const seeds: Seed[] = [{ id: "A" }, { id: "B" }];
		const result = warp(graph, seeds);

		expect(result.paths).toHaveLength(0);
	});

	it("reports algorithm name", () => {
		const graph = createLinearChainGraph();
		const result = warp(graph, [{ id: "A" }, { id: "B" }]);

		// PIPE wraps BASE, so algorithm name is inherited
		expect(result.stats.algorithm).toBeDefined();
	});

	it("includes duration in stats", () => {
		const graph = createLinearChainGraph();
		const result = warp(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("includes iterations in stats", () => {
		const graph = createLinearChainGraph();
		const result = warp(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.iterations).toBeGreaterThanOrEqual(0);
	});

	it("includes edges traversed in stats", () => {
		const graph = createLinearChainGraph();
		const result = warp(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.edgesTraversed).toBeGreaterThanOrEqual(0);
	});

	it("includes paths found in stats", () => {
		const graph = createLinearChainGraph();
		const result = warp(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.pathsFound).toBeGreaterThanOrEqual(0);
	});

	it("discovers paths between connected seeds", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = warp(graph, seeds);

		expect(result.paths.length).toBeGreaterThan(0);
		expect(result.stats.pathsFound).toBeGreaterThan(0);
	});

	it("discovers paths through bridge nodes", () => {
		const graph = createBridgeGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "F" }];

		const result = warp(graph, seeds);

		// Should find a path from A to F through G (bridge)
		expect(result.paths.length).toBeGreaterThan(0);

		// At least one path should contain the bridge node G
		const hasBridgeNode = result.paths.some((path) => path.nodes.includes("G"));
		expect(hasBridgeNode).toBe(true);
	});

	it("samples nodes during expansion", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = warp(graph, seeds);

		expect(result.sampledNodes.size).toBeGreaterThan(0);
		expect(result.sampledNodes.has("A")).toBe(true);
		expect(result.sampledNodes.has("E")).toBe(true);
	});

	it("samples edges during expansion", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = warp(graph, seeds);

		expect(result.sampledEdges.size).toBeGreaterThan(0);
	});

	it("respects maxNodes configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = warp(graph, seeds, { maxNodes: 3 });

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(3);
	});

	it("respects maxIterations configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = warp(graph, seeds, { maxIterations: 2 });

		expect(result.stats.iterations).toBeLessThanOrEqual(2);
	});

	it("respects maxPaths configuration", () => {
		const graph = createBridgeGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "C" }, { id: "D" }, { id: "F" }];

		const result = warp(graph, seeds, { maxPaths: 1 });

		expect(result.paths.length).toBeLessThanOrEqual(1);
	});

	it("handles single seed", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }];

		const result = warp(graph, seeds);

		// Single seed cannot discover paths (no target)
		expect(result.paths).toHaveLength(0);
	});

	it("handles seeds with roles", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [
			{ id: "A", role: "source" },
			{ id: "E", role: "target" },
		];

		const result = warp(graph, seeds);

		expect(result.paths.length).toBeGreaterThan(0);
	});
});

describe("warpAsync export", () => {
	it("is an async function", () => {
		// Full async equivalence requires PriorityContext refactoring (Phase 4b deferred).
		// The priority function accesses context.graph via countCrossFrontierNeighbours
		// which is the sentinel in async mode. This test verifies the export exists with
		// the correct async signature.
		expect(typeof warpAsync).toBe("function");
		expect(warpAsync.constructor.name).toBe("AsyncFunction");
	});
});
