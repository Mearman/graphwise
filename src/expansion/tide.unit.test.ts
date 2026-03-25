import { describe, it, expect } from "vitest";
import { tide, tideAsync } from "./tide";
import type { Seed } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";

describe("tide expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = tide(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = tide(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("reports algorithm name", () => {
		const graph = createLinearChainGraph();
		const result = tide(graph, [{ id: "A" }, { id: "B" }]);

		// TIDE wraps BASE, so algorithm name is inherited
		expect(result.stats.algorithm).toBeDefined();
	});

	it("handles disconnected seeds", () => {
		const graph = createDisconnectedGraph();

		const result = tide(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("includes duration in stats", () => {
		const graph = createLinearChainGraph();
		const result = tide(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});
});

describe("tideAsync export", () => {
	it("is an async function", () => {
		// Full async equivalence requires PriorityContext refactoring (Phase 4b deferred).
		// The priority function accesses context.graph which is the sentinel in async mode.
		// This test verifies the export exists with the correct async signature.
		expect(typeof tideAsync).toBe("function");
		expect(tideAsync.constructor.name).toBe("AsyncFunction");
	});
});
