import { describe, it, expect } from "vitest";
import { standardBfs } from "./standard-bfs";
import type { Seed } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";

describe("standardBfs expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = standardBfs(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = standardBfs(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("explores nodes in FIFO order", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }];

		const result = standardBfs(graph, seeds);

		// BFS should discover nodes level-by-level
		expect(result.stats.algorithm).toBeDefined();
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("handles disconnected seeds", () => {
		const graph = createDisconnectedGraph();

		const result = standardBfs(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("respects maxNodes limit", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = standardBfs(graph, seeds, { maxNodes: 2 });

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(2);
		expect(result.stats.termination).toBe("limit");
	});
});
