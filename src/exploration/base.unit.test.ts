import { describe, it, expect } from "vitest";
import { base } from "./base";
import type { Seed } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";

describe("base exploration", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = base(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = base(graph, seeds);

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
		const result = base(graph, seeds);

		expect(result.paths).toHaveLength(0);
	});

	it("reports correct algorithm name", () => {
		const graph = createLinearChainGraph();
		const result = base(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.algorithm).toBe("base");
	});

	it("includes duration in stats", () => {
		const graph = createLinearChainGraph();
		const result = base(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("includes iterations in stats", () => {
		const graph = createLinearChainGraph();
		const result = base(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.iterations).toBeGreaterThanOrEqual(0);
	});

	it("includes edges traversed in stats", () => {
		const graph = createLinearChainGraph();
		const result = base(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.edgesTraversed).toBeGreaterThanOrEqual(0);
	});

	it("includes paths found in stats", () => {
		const graph = createLinearChainGraph();
		const result = base(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.pathsFound).toBeGreaterThanOrEqual(0);
	});
});
