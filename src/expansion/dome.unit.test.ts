import { describe, it, expect } from "vitest";
import { dome, domeAsync, domeHighDegree, domeHighDegreeAsync } from "./dome";
import type { Seed } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";
import { wrapAsync } from "../__test__/fixtures/wrap-async";

describe("dome expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = dome(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = dome(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("reports algorithm name", () => {
		const graph = createLinearChainGraph();
		const result = dome(graph, [{ id: "A" }, { id: "B" }]);

		// DOME wraps BASE, so algorithm name is inherited
		expect(result.stats.algorithm).toBeDefined();
	});

	it("handles disconnected seeds", () => {
		const graph = createDisconnectedGraph();
		const result = dome(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});
});

describe("domeHighDegree expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = domeHighDegree(graph, []);

		expect(result.paths).toHaveLength(0);
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = domeHighDegree(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("reports algorithm name", () => {
		const graph = createLinearChainGraph();
		const result = domeHighDegree(graph, [{ id: "A" }, { id: "B" }]);

		// DOME high-degree wraps BASE, so algorithm name is inherited
		expect(result.stats.algorithm).toBeDefined();
	});
});

describe("domeAsync expansion", () => {
	it("produces the same path count as dome", async () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const syncResult = dome(graph, seeds);
		const asyncResult = await domeAsync(wrapAsync(graph), seeds);

		expect(asyncResult.paths.length).toBe(syncResult.paths.length);
		expect(asyncResult.stats.nodesVisited).toBe(syncResult.stats.nodesVisited);
	});

	it("returns empty result for no seeds", async () => {
		const graph = createLinearChainGraph();

		const result = await domeAsync(wrapAsync(graph), []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("handles disconnected seeds", async () => {
		const graph = createDisconnectedGraph();

		const result = await domeAsync(wrapAsync(graph), [
			{ id: "A" },
			{ id: "B" },
		]);

		expect(result.paths).toHaveLength(0);
	});
});

describe("domeHighDegreeAsync expansion", () => {
	it("produces the same path count as domeHighDegree", async () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const syncResult = domeHighDegree(graph, seeds);
		const asyncResult = await domeHighDegreeAsync(wrapAsync(graph), seeds);

		expect(asyncResult.paths.length).toBe(syncResult.paths.length);
		expect(asyncResult.stats.nodesVisited).toBe(syncResult.stats.nodesVisited);
	});

	it("returns empty result for no seeds", async () => {
		const graph = createLinearChainGraph();

		const result = await domeHighDegreeAsync(wrapAsync(graph), []);

		expect(result.paths).toHaveLength(0);
	});
});
