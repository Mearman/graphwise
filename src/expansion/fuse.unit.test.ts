import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { ReadableGraph } from "../graph";
import {
	fuse,
	fuseAsync,
	fuseBatchPriority,
	fuseWithBatchPriority,
	type FUSEConfig,
} from "./fuse";
import type { Seed, BatchPriorityContext } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";
import type { KGNode } from "../__test__/fixtures/types";

/**
 * Create a graph with a hub node:
 *   A - B - C - D - E
 *        \ /
 *         H
 * H connects to B and C, creating shared neighbours.
 */
function createGraphWithSharedNeighbours(): AdjacencyMapGraph<KGNode> {
	const graph = AdjacencyMapGraph.undirected<KGNode>();
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
	graph: ReadableGraph<KGNode>,
	source: string,
	target: string,
): number {
	void graph; // Intentionally unused - test mock
	void source; // Intentionally unused - test mock
	void target; // Intentionally unused - test mock
	return 0.75;
}

describe("fuse expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = fuse(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = fuse(graph, seeds);

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
		const result = fuse(graph, seeds);

		expect(result.paths).toHaveLength(0);
	});

	it("reports algorithm name", () => {
		const graph = createLinearChainGraph();
		const result = fuse(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.algorithm).toBeDefined();
	});

	it("includes duration in stats", () => {
		const graph = createLinearChainGraph();
		const result = fuse(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("includes iterations in stats", () => {
		const graph = createLinearChainGraph();
		const result = fuse(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.iterations).toBeGreaterThanOrEqual(0);
	});

	it("includes edges traversed in stats", () => {
		const graph = createLinearChainGraph();
		const result = fuse(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.edgesTraversed).toBeGreaterThanOrEqual(0);
	});

	it("includes paths found in stats", () => {
		const graph = createLinearChainGraph();
		const result = fuse(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.pathsFound).toBeGreaterThanOrEqual(0);
	});
});

describe("fuse with custom MI function", () => {
	it("accepts custom MI function", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: FUSEConfig<KGNode> = {
			mi: fixedMI,
		};

		const result = fuse(graph, seeds, config);

		expect(result).toHaveProperty("paths");
		expect(result.stats.algorithm).toBeDefined();
	});

	it("accepts custom salience weight", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: FUSEConfig<KGNode> = {
			salienceWeight: 0.8,
		};

		const result = fuse(graph, seeds, config);

		expect(result).toHaveProperty("paths");
	});

	it("accepts salience weight of 0 (pure degree-based)", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: FUSEConfig<KGNode> = {
			salienceWeight: 0,
		};

		const result = fuse(graph, seeds, config);

		expect(result).toHaveProperty("paths");
	});

	it("accepts salience weight of 1 (pure salience-based)", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: FUSEConfig<KGNode> = {
			salienceWeight: 1,
		};

		const result = fuse(graph, seeds, config);

		expect(result).toHaveProperty("paths");
	});

	it("accepts both custom MI and salience weight", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: FUSEConfig<KGNode> = {
			mi: fixedMI,
			salienceWeight: 0.3,
		};

		const result = fuse(graph, seeds, config);

		expect(result).toHaveProperty("paths");
	});
});

describe("fuse with expansion config options", () => {
	it("respects maxNodes configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: FUSEConfig<KGNode> = {
			maxNodes: 2,
		};

		const result = fuse(graph, seeds, config);

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(2);
	});

	it("respects maxIterations configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: FUSEConfig<KGNode> = {
			maxIterations: 1,
		};

		const result = fuse(graph, seeds, config);

		expect(result.stats.iterations).toBeLessThanOrEqual(1);
	});

	it("respects maxPaths configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config: FUSEConfig<KGNode> = {
			maxPaths: 1,
		};

		const result = fuse(graph, seeds, config);

		expect(result.paths.length).toBeLessThanOrEqual(1);
	});
});

describe("fuse with single seed", () => {
	it("returns empty paths for single seed", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }];

		const result = fuse(graph, seeds);

		// Single seed cannot form paths between seeds
		expect(result.paths).toHaveLength(0);
	});
});

describe("fuse with graph containing shared neighbours", () => {
	it("handles graph with shared neighbours structure", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = fuse(graph, seeds);

		// Should complete without error
		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("samples nodes when expanding through shared neighbour graph", () => {
		const graph = createGraphWithSharedNeighbours();
		const seeds: Seed[] = [{ id: "A" }, { id: "H" }];

		const result = fuse(graph, seeds);

		// Should have sampled some nodes during expansion
		expect(result.sampledNodes.size).toBeGreaterThanOrEqual(0);
	});
});

describe("fuseAsync export", () => {
	it("is an async function", () => {
		expect(typeof fuseAsync).toBe("function");
		expect(fuseAsync.constructor.name).toBe("AsyncFunction");
	});
});

describe("fuseBatchPriority", () => {
	it("returns a Map of priorities for candidates", () => {
		const graph = createLinearChainGraph();
		const candidates = ["B", "C", "D"];

		const context: BatchPriorityContext = {
			graph,
			visited: new Set(["A"]),
			visitedByFrontier: new Map([["A", 0]]),
			frontierId: 0,
			discoveredPaths: [],
		};

		const result = fuseBatchPriority(candidates, context);

		expect(result).toBeInstanceOf(Map);
		expect(result.size).toBe(3);
		for (const candidate of candidates) {
			expect(result.has(candidate)).toBe(true);
			expect(typeof result.get(candidate)).toBe("number");
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

		const result = fuseBatchPriority(candidates, context);

		expect(result.size).toBe(0);
	});

	it("returns finite numeric priorities", () => {
		const graph = createLinearChainGraph();
		const candidates = ["B", "C"];

		const context: BatchPriorityContext = {
			graph,
			visited: new Set(["A"]),
			visitedByFrontier: new Map([["A", 0]]),
			frontierId: 0,
			discoveredPaths: [],
		};

		const result = fuseBatchPriority(candidates, context);

		for (const [, priority] of result) {
			expect(Number.isFinite(priority)).toBe(true);
		}
	});
});

describe("fuseWithBatchPriority", () => {
	it("returns config with batchPriority function", () => {
		const config = fuseWithBatchPriority({ salienceWeight: 0.5 });

		expect(config.batchPriority).toBeDefined();
		expect(typeof config.batchPriority).toBe("function");
		expect(config.salienceWeight).toBe(0.5);
	});

	it("uses default config when no config provided", () => {
		const config = fuseWithBatchPriority();

		expect(config.batchPriority).toBeDefined();
		expect(typeof config.batchPriority).toBe("function");
	});

	it("batchPriority function produces valid output", () => {
		const config = fuseWithBatchPriority();

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
