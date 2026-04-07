import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import {
	lace,
	laceAsync,
	laceBatchPriority,
	laceWithBatchPriority,
} from "./lace";
import type { LACEConfig } from "./lace";
import type { Seed, BatchPriorityContext } from "./types";
import { jaccard } from "../ranking/mi/jaccard";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";
import type { KGNode } from "../__test__/fixtures/types";

/**
 * Create a graph with varying neighbourhood overlap.
 *
 * Structure:
 *   A - B - C
 *   |   |   |
 *   D - E - F
 *
 * A-E and C-E have higher MI due to shared neighbours.
 */
function createOverlapGraph(): AdjacencyMapGraph<KGNode> {
	const graph = AdjacencyMapGraph.undirected<KGNode>();
	const nodes = ["A", "B", "C", "D", "E", "F"];

	for (const id of nodes) {
		graph.addNode({ id, label: `Node ${id}` });
	}

	// Horizontal edges
	graph.addEdge({ source: "A", target: "B", weight: 1 });
	graph.addEdge({ source: "B", target: "C", weight: 1 });
	graph.addEdge({ source: "D", target: "E", weight: 1 });
	graph.addEdge({ source: "E", target: "F", weight: 1 });

	// Vertical edges
	graph.addEdge({ source: "A", target: "D", weight: 1 });
	graph.addEdge({ source: "B", target: "E", weight: 1 });
	graph.addEdge({ source: "C", target: "F", weight: 1 });

	return graph;
}

describe("lace exploration", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = lace(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = lace(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("reports algorithm name", () => {
		const graph = createLinearChainGraph();
		const result = lace(graph, [{ id: "A" }, { id: "B" }]);

		// LACE wraps BASE, so algorithm name is inherited
		expect(result.stats.algorithm).toBeDefined();
	});

	it("handles disconnected seeds", () => {
		const graph = createDisconnectedGraph();

		const result = lace(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("includes duration in stats", () => {
		const graph = createLinearChainGraph();
		const result = lace(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("accepts custom MI function", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		// Custom MI function that returns fixed values
		const customMi = (): number => 0.5;

		const result = lace(graph, seeds, { mi: customMi });

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("accepts LACEConfig with MI function", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const config: LACEConfig<KGNode> = {
			mi: jaccard,
			maxIterations: 10,
		};

		const result = lace(graph, seeds, config);

		expect(result).toHaveProperty("paths");
	});

	it("respects maxIterations config", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = lace(graph, seeds, { maxIterations: 2 });

		// Should stop early due to iteration limit
		expect(result.stats.iterations).toBeLessThanOrEqual(2);
	});

	it("respects maxNodes config", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = lace(graph, seeds, { maxNodes: 3 });

		// Should stop when node limit reached
		expect(result.sampledNodes.size).toBeLessThanOrEqual(3);
	});

	it("uses default jaccard MI when no MI function provided", () => {
		const graph = createOverlapGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "C" }];

		// Should not throw when using default jaccard
		const result = lace(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("stats");
	});

	it("handles graph with no edges", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });

		const result = lace(graph, [{ id: "A" }, { id: "B" }]);

		// No paths possible without edges
		expect(result.paths).toHaveLength(0);
	});

	it("handles single node graph", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		graph.addNode({ id: "A", label: "A" });

		const result = lace(graph, [{ id: "A" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("returns paths with seed endpoints when paths discovered", () => {
		const graph = createOverlapGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "F" }];

		const result = lace(graph, seeds);

		// If paths are found, they should have correct structure
		for (const path of result.paths) {
			expect(path).toHaveProperty("fromSeed");
			expect(path).toHaveProperty("toSeed");
			expect(path).toHaveProperty("nodes");
			expect(path.nodes.length).toBeGreaterThan(0);
		}
	});

	it("produces deterministic results with same seeds", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result1 = lace(graph, seeds);
		const result2 = lace(graph, seeds);

		expect(result1.stats.nodesVisited).toBe(result2.stats.nodesVisited);
		expect(result1.paths.length).toBe(result2.paths.length);
	});
});

describe("laceAsync export", () => {
	it("is an async function", () => {
		// Full async equivalence requires PriorityContext refactoring (Phase 4b deferred).
		// The priority function accesses context.graph via avgFrontierMI which is the
		// sentinel in async mode. This test verifies the export exists with the correct
		// async signature.
		expect(typeof laceAsync).toBe("function");
		expect(laceAsync.constructor.name).toBe("AsyncFunction");
	});
});

describe("laceBatchPriority", () => {
	it("returns a Map of priorities for candidates", () => {
		const graph = createLinearChainGraph();
		const candidates = ["B", "C", "D"];
		const visited = new Set<string>(["A"]);
		const visitedByFrontier = new Map<string, number>([["A", 0]]);

		const context: BatchPriorityContext = {
			graph,
			visited,
			visitedByFrontier,
			frontierId: 0,
			discoveredPaths: [],
		};

		const result = laceBatchPriority(candidates, context);

		expect(result).toBeInstanceOf(Map);
		expect(result.size).toBe(3);
		for (const candidate of candidates) {
			expect(result.has(candidate)).toBe(true);
			expect(typeof result.get(candidate)).toBe("number");
		}
	});

	it("returns priorities between 0 and 1", () => {
		const graph = createLinearChainGraph();
		const candidates = ["B", "C"];

		const context: BatchPriorityContext = {
			graph,
			visited: new Set(["A"]),
			visitedByFrontier: new Map([["A", 0]]),
			frontierId: 0,
			discoveredPaths: [],
		};

		const result = laceBatchPriority(candidates, context);

		for (const [, priority] of result) {
			expect(priority).toBeGreaterThanOrEqual(0);
			expect(priority).toBeLessThanOrEqual(1);
		}
	});

	it("handles empty candidates", () => {
		const graph = createLinearChainGraph();
		const candidates: string[] = [];

		const context: BatchPriorityContext = {
			graph,
			visited: new Set(["A"]),
			visitedByFrontier: new Map([["A", 0]]),
			frontierId: 0,
			discoveredPaths: [],
		};

		const result = laceBatchPriority(candidates, context);

		expect(result.size).toBe(0);
	});

	it("assigns priorities based on MI to same-frontier visited nodes", () => {
		const graph = createOverlapGraph();
		const candidates = ["B", "E"];

		const context: BatchPriorityContext<KGNode> = {
			graph,
			visited: new Set(["A"]),
			visitedByFrontier: new Map([["A", 0]]),
			frontierId: 0,
			discoveredPaths: [],
		};

		const result = laceBatchPriority(candidates, context);

		expect(result.get("B")).toBeDefined();
		expect(result.get("E")).toBeDefined();
	});
});

describe("laceWithBatchPriority", () => {
	it("returns config with batchPriority function", () => {
		const config = laceWithBatchPriority({ maxIterations: 10 });

		expect(config.batchPriority).toBeDefined();
		expect(typeof config.batchPriority).toBe("function");
		expect(config.maxIterations).toBe(10);
	});

	it("uses default config when no config provided", () => {
		const config = laceWithBatchPriority();

		expect(config.batchPriority).toBeDefined();
		expect(typeof config.batchPriority).toBe("function");
	});

	it("batchPriority function produces valid output", () => {
		const config = laceWithBatchPriority();

		const graph = createLinearChainGraph();
		const candidates = ["B"];
		const context: BatchPriorityContext = {
			graph,
			visited: new Set(["A"]),
			visitedByFrontier: new Map([["A", 0]]),
			frontierId: 0,
			discoveredPaths: [],
		};

		const result = config.batchPriority(candidates, context);
		expect(result.size).toBe(1);
		expect(result.has("B")).toBe(true);
	});
});
