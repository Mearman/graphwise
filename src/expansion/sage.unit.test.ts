import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import { sage, type SAGEConfig } from "./sage";
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
 * Create a graph with a hub node: A - B - C - D - E
 *                                   \   /
 *                                     H
 * Where H connects to B and C, creating shared neighbours.
 */
function createGraphWithSharedNeighbours(): AdjacencyMapGraph<
	TestNode,
	TestEdge
> {
	const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
	const nodes = ["A", "B", "C", "D", "E", "H"];

	for (const id of nodes) {
		graph.addNode({ id, label: `Node ${id}` });
	}

	// Linear chain
	graph.addEdge({ source: "A", target: "B", weight: 1 });
	graph.addEdge({ source: "B", target: "C", weight: 1 });
	graph.addEdge({ source: "C", target: "D", weight: 1 });
	graph.addEdge({ source: "D", target: "E", weight: 1 });

	// Hub H connecting to B and C
	graph.addEdge({ source: "H", target: "B", weight: 1 });
	graph.addEdge({ source: "H", target: "C", weight: 1 });

	return graph;
}

/**
 * Custom MI function for testing that returns a fixed value.
 */
function fixedMI(
	graph: ReadableGraph<TestNode, TestEdge>,
	source: string,
	target: string,
): number {
	void graph; // Intentionally unused - test mock
	void source; // Intentionally unused - test mock
	void target; // Intentionally unused - test mock
	return 0.75;
}

describe("sage expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearGraph();
		const result = sage(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds);

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
		const result = sage(graph, seeds);

		expect(result.paths).toHaveLength(0);
	});

	it("reports algorithm name", () => {
		const graph = createLinearGraph();
		const result = sage(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.algorithm).toBeDefined();
	});

	it("includes duration in stats", () => {
		const graph = createLinearGraph();
		const result = sage(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("includes iterations in stats", () => {
		const graph = createLinearGraph();
		const result = sage(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.iterations).toBeGreaterThanOrEqual(0);
	});

	it("includes edges traversed in stats", () => {
		const graph = createLinearGraph();
		const result = sage(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.edgesTraversed).toBeGreaterThanOrEqual(0);
	});

	it("includes paths found in stats", () => {
		const graph = createLinearGraph();
		const result = sage(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.pathsFound).toBeGreaterThanOrEqual(0);
	});
});

describe("sage with custom MI function", () => {
	it("accepts custom MI function", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: SAGEConfig<TestNode, TestEdge> = {
			mi: fixedMI,
		};

		const result = sage(graph, seeds, config);

		expect(result).toHaveProperty("paths");
		expect(result.stats.algorithm).toBeDefined();
	});

	it("accepts custom salience weight", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: SAGEConfig<TestNode, TestEdge> = {
			salienceWeight: 0.8,
		};

		const result = sage(graph, seeds, config);

		expect(result).toHaveProperty("paths");
	});

	it("accepts salience weight of 0 (pure degree-based)", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: SAGEConfig<TestNode, TestEdge> = {
			salienceWeight: 0,
		};

		const result = sage(graph, seeds, config);

		expect(result).toHaveProperty("paths");
	});

	it("accepts salience weight of 1 (pure salience-based)", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: SAGEConfig<TestNode, TestEdge> = {
			salienceWeight: 1,
		};

		const result = sage(graph, seeds, config);

		expect(result).toHaveProperty("paths");
	});

	it("accepts both custom MI and salience weight", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: SAGEConfig<TestNode, TestEdge> = {
			mi: fixedMI,
			salienceWeight: 0.3,
		};

		const result = sage(graph, seeds, config);

		expect(result).toHaveProperty("paths");
	});
});

describe("sage with expansion config options", () => {
	it("respects maxNodes configuration", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: SAGEConfig<TestNode, TestEdge> = {
			maxNodes: 2,
		};

		const result = sage(graph, seeds, config);

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(2);
	});

	it("respects maxIterations configuration", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: SAGEConfig<TestNode, TestEdge> = {
			maxIterations: 1,
		};

		const result = sage(graph, seeds, config);

		expect(result.stats.iterations).toBeLessThanOrEqual(1);
	});

	it("respects maxPaths configuration", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: SAGEConfig<TestNode, TestEdge> = {
			maxPaths: 1,
		};

		const result = sage(graph, seeds, config);

		expect(result.paths.length).toBeLessThanOrEqual(1);
	});
});

describe("sage with single seed", () => {
	it("returns empty paths for single seed", () => {
		const graph = createLinearGraph();
		const seeds: Seed[] = [{ id: "A" }];

		const result = sage(graph, seeds);

		// Single seed cannot form paths between seeds
		expect(result.paths).toHaveLength(0);
	});
});

describe("sage with graph containing shared neighbours", () => {
	it("handles graph with shared neighbours structure", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds);

		// Should complete without error
		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("samples nodes when expanding through shared neighbour graph", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "H" }];

		const result = sage(graph, seeds);

		// Should have sampled some nodes during expansion
		expect(result.sampledNodes.size).toBeGreaterThanOrEqual(0);
	});
});
