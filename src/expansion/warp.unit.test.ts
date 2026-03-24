import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import { warp } from "./warp";
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
 * Create a bridge graph:
 *
 *   A - B - C
 *       |
 *   D - E - F
 *
 * E is a bridge node connecting two clusters
 */
function createBridgeGraph(): AdjacencyMapGraph<TestNode, TestEdge> {
	const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

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
		const graph = createLinearGraph();
		const result = warp(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearGraph();
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
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });

		const seeds: Seed[] = [{ id: "A" }, { id: "B" }];
		const result = warp(graph, seeds);

		expect(result.paths).toHaveLength(0);
	});

	it("reports algorithm name", () => {
		const graph = createLinearGraph();
		const result = warp(graph, [{ id: "A" }, { id: "B" }]);

		// PIPE wraps BASE, so algorithm name is inherited
		expect(result.stats.algorithm).toBeDefined();
	});

	it("includes duration in stats", () => {
		const graph = createLinearGraph();
		const result = warp(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("includes iterations in stats", () => {
		const graph = createLinearGraph();
		const result = warp(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.iterations).toBeGreaterThanOrEqual(0);
	});

	it("includes edges traversed in stats", () => {
		const graph = createLinearGraph();
		const result = warp(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.edgesTraversed).toBeGreaterThanOrEqual(0);
	});

	it("includes paths found in stats", () => {
		const graph = createLinearGraph();
		const result = warp(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.pathsFound).toBeGreaterThanOrEqual(0);
	});

	it("discovers paths between connected seeds", () => {
		const graph = createLinearGraph();
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
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = warp(graph, seeds);

		expect(result.sampledNodes.size).toBeGreaterThan(0);
		expect(result.sampledNodes.has("A")).toBe(true);
		expect(result.sampledNodes.has("E")).toBe(true);
	});

	it("samples edges during expansion", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = warp(graph, seeds);

		expect(result.sampledEdges.size).toBeGreaterThan(0);
	});

	it("respects maxNodes configuration", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = warp(graph, seeds, { maxNodes: 3 });

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(3);
	});

	it("respects maxIterations configuration", () => {
		const graph = createLinearGraph();
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
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }];

		const result = warp(graph, seeds);

		// Single seed cannot discover paths (no target)
		expect(result.paths).toHaveLength(0);
	});

	it("handles seeds with roles", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [
			{ id: "A", role: "source" },
			{ id: "E", role: "target" },
		];

		const result = warp(graph, seeds);

		expect(result.paths.length).toBeGreaterThan(0);
	});
});
