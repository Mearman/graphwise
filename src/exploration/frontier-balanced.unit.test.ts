import { describe, it, expect } from "vitest";
import { frontierBalanced, frontierBalancedAsync } from "./frontier-balanced";
import type { Seed } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";
import { wrapAsync } from "../__test__/fixtures/wrap-async";

describe("frontierBalanced exploration", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = frontierBalanced(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = frontierBalanced(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("balances exploration across frontiers", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = frontierBalanced(graph, seeds);

		// Both frontiers should be visited
		expect(result.visitedPerFrontier.length).toBe(2);
		if (
			result.visitedPerFrontier[0] !== undefined &&
			result.visitedPerFrontier[1] !== undefined
		) {
			// Both should have some nodes visited
			expect(result.visitedPerFrontier[0].size).toBeGreaterThan(0);
			expect(result.visitedPerFrontier[1].size).toBeGreaterThan(0);
		}
	});

	it("handles disconnected seeds", () => {
		const graph = createDisconnectedGraph();

		const result = frontierBalanced(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("respects maxIterations limit", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = frontierBalanced(graph, seeds, { maxIterations: 3 });

		expect(result.stats.iterations).toBeLessThanOrEqual(3);
		expect(result.stats.termination).toBe("limit");
	});
});

describe("frontierBalancedAsync exploration", () => {
	it("produces the same path count as frontierBalanced", async () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const syncResult = frontierBalanced(graph, seeds);
		const asyncResult = await frontierBalancedAsync(wrapAsync(graph), seeds);

		expect(asyncResult.paths.length).toBe(syncResult.paths.length);
		expect(asyncResult.stats.nodesVisited).toBe(syncResult.stats.nodesVisited);
	});

	it("returns empty result for no seeds", async () => {
		const graph = createLinearChainGraph();

		const result = await frontierBalancedAsync(wrapAsync(graph), []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("handles disconnected seeds", async () => {
		const graph = createDisconnectedGraph();

		const result = await frontierBalancedAsync(wrapAsync(graph), [
			{ id: "A" },
			{ id: "B" },
		]);

		expect(result.paths).toHaveLength(0);
	});
});
