import { describe, it, expect } from "vitest";
import { randomPriority } from "./random-priority";
import type { Seed } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";

describe("randomPriority expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = randomPriority(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = randomPriority(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("is reproducible with same seed", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result1 = randomPriority(graph, seeds, { seed: 42 });
		const result2 = randomPriority(graph, seeds, { seed: 42 });

		expect(result1.stats.nodesVisited).toBe(result2.stats.nodesVisited);
	});

	it("may produce different results with different seeds", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result1 = randomPriority(graph, seeds, { seed: 42 });
		const result2 = randomPriority(graph, seeds, { seed: 43 });

		// Both should produce valid results with no null values
		expect(result1.stats.nodesVisited).toBeGreaterThanOrEqual(0);
		expect(result2.stats.nodesVisited).toBeGreaterThanOrEqual(0);
	});

	it("handles disconnected seeds", () => {
		const graph = createDisconnectedGraph();

		const result = randomPriority(graph, [{ id: "A" }, { id: "B" }], {
			seed: 42,
		});

		expect(result.paths).toHaveLength(0);
	});

	it("respects maxNodes limit", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = randomPriority(graph, seeds, {
			maxNodes: 2,
			seed: 42,
		});

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(2);
		expect(result.stats.termination).toBe("limit");
	});
});
