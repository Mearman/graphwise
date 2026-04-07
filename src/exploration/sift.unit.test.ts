import { describe, it, expect } from "vitest";
import {
	sift,
	siftAsync,
	siftBatchPriority,
	siftWithBatchPriority,
} from "./sift";
import type { Seed, BatchPriorityContext } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";

describe("sift exploration", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = sift(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sift(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("reports algorithm name", () => {
		const graph = createLinearChainGraph();
		const result = sift(graph, [{ id: "A" }, { id: "B" }]);

		// REACH wraps BASE, so algorithm name is inherited
		expect(result.stats.algorithm).toBeDefined();
	});

	it("handles disconnected seeds", () => {
		const graph = createDisconnectedGraph();

		const result = sift(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("uses custom MI threshold", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sift(graph, seeds, { miThreshold: 0.5 });

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("uses custom MI function", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		// Custom MI function that returns constant value
		const customMi = (): number => 0.5;

		const result = sift(graph, seeds, { mi: customMi });

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("stats");
	});

	it("respects maxNodes configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sift(graph, seeds, { maxNodes: 3 });

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(3);
	});

	it("respects maxIterations configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sift(graph, seeds, { maxIterations: 2 });

		expect(result.stats.iterations).toBeLessThanOrEqual(2);
	});

	it("respects maxPaths configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sift(graph, seeds, { maxPaths: 1 });

		expect(result.paths.length).toBeLessThanOrEqual(1);
	});

	it("handles single seed", () => {
		const graph = createLinearChainGraph();
		const result = sift(graph, [{ id: "A" }]);

		// Single seed cannot discover paths between seeds
		expect(result.paths).toHaveLength(0);
	});

	it("handles seed not in graph", () => {
		const graph = createLinearChainGraph();
		const result = sift(graph, [{ id: "NONEXISTENT" }, { id: "A" }]);

		// Should handle gracefully without throwing
		expect(result).toHaveProperty("paths");
	});

	it("returns visitedPerFrontier array", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sift(graph, seeds);

		expect(result.visitedPerFrontier).toBeDefined();
		expect(Array.isArray(result.visitedPerFrontier)).toBe(true);
	});
});

describe("siftAsync export", () => {
	it("is an async function", () => {
		expect(typeof siftAsync).toBe("function");
		expect(siftAsync.constructor.name).toBe("AsyncFunction");
	});
});

describe("siftBatchPriority", () => {
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

		const result = siftBatchPriority(candidates, context);

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

		const result = siftBatchPriority(candidates, context);

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

		const result = siftBatchPriority(candidates, context);

		for (const [, priority] of result) {
			expect(Number.isFinite(priority)).toBe(true);
		}
	});
});

describe("siftWithBatchPriority", () => {
	it("returns config with batchPriority function", () => {
		const config = siftWithBatchPriority({ miThreshold: 0.3 });

		expect(config.batchPriority).toBeDefined();
		expect(typeof config.batchPriority).toBe("function");
		expect(config.miThreshold).toBe(0.3);
	});

	it("uses default config when no config provided", () => {
		const config = siftWithBatchPriority();

		expect(config.batchPriority).toBeDefined();
		expect(typeof config.batchPriority).toBe("function");
	});

	it("batchPriority function produces valid output", () => {
		const config = siftWithBatchPriority();

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
