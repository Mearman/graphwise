import { describe, it, expect } from "vitest";
import { edge } from "./edge";
import type { Seed } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";

describe("edge expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = edge(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = edge(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("sets algorithm name in stats", () => {
		const graph = createLinearChainGraph();
		const result = edge(graph, [{ id: "A" }, { id: "B" }]);

		// EDGE wraps BASE, which sets algorithm name
		expect(result.stats.algorithm).toBeDefined();
	});

	it("handles disconnected seeds", () => {
		const graph = createDisconnectedGraph();

		const result = edge(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("discovers paths between connected seeds", () => {
		const graph = createLinearChainGraph();
		const result = edge(graph, [{ id: "A" }, { id: "E" }]);

		expect(result.paths.length).toBeGreaterThan(0);
	});

	it("includes sampled nodes and edges in result", () => {
		const graph = createLinearChainGraph();
		const result = edge(graph, [{ id: "A" }, { id: "E" }]);

		// At least the seed nodes should be visited
		expect(result.sampledNodes.size).toBeGreaterThan(0);
	});
});
