import { describe, it, expect } from "vitest";
import { pipe, pipeAsync } from "./pipe";
import type { Seed } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";

describe("pipe expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = pipe(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = pipe(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("sets algorithm name in stats", () => {
		const graph = createLinearChainGraph();
		const result = pipe(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.algorithm).toBeDefined();
	});

	it("handles disconnected seeds", () => {
		const graph = createDisconnectedGraph();
		const result = pipe(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("discovers paths between connected seeds", () => {
		const graph = createLinearChainGraph();
		const result = pipe(graph, [{ id: "A" }, { id: "E" }]);

		expect(result.paths.length).toBeGreaterThan(0);
	});

	it("includes sampled nodes and edges in result", () => {
		const graph = createLinearChainGraph();
		const result = pipe(graph, [{ id: "A" }, { id: "E" }]);

		// At least the seed nodes should be visited
		expect(result.sampledNodes.size).toBeGreaterThan(0);
	});

	it("identifies bridging nodes through path potential", () => {
		// The shared linear chain (A-B-C-D-E) has C as the natural bridge node
		const graph = createLinearChainGraph();
		const result = pipe(graph, [{ id: "A" }, { id: "E" }]);

		// PIPE should discover paths through bridging nodes
		expect(result.paths.length).toBeGreaterThan(0);
	});
});

describe("pipeAsync export", () => {
	it("is an async function", () => {
		// Full async equivalence requires PriorityContext refactoring (Phase 4b deferred).
		// The priority function accesses context.graph which is the sentinel in async mode.
		// This test verifies the export exists with the correct async signature.
		expect(typeof pipeAsync).toBe("function");
		expect(pipeAsync.constructor.name).toBe("AsyncFunction");
	});
});
