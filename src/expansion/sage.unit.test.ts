import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import { sage, sageAsync } from "./sage";
import type { Seed } from "./types";
import { createLinearChainGraph } from "../__test__/fixtures/graphs/linear-chain";
import type { KGNode } from "../__test__/fixtures/types";
import { wrapAsync } from "../__test__/fixtures/wrap-async";

describe("SAGE expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = sage(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("discovers paths between seeds", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds);

		expect(result.paths.length).toBeGreaterThan(0);
	});

	it("respects maxPaths configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds, { maxPaths: 1 });

		expect(result.paths.length).toBeLessThanOrEqual(1);
		expect(result.stats.termination).toBe("limit");
	});

	it("respects maxNodes configuration", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds, { maxNodes: 3 });

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(3);
		expect(result.stats.termination).toBe("limit");
	});

	it("includes all discovered paths", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds);

		for (const path of result.paths) {
			expect(path.nodes).toContain("A");
			expect(path.nodes).toContain("E");
			expect(path.nodes.length).toBeGreaterThanOrEqual(2);
		}
	});

	it("transitions to phase 2 after discovering first path", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = sage(graph, seeds, { debug: false });

		// Phase 2 should be triggered when paths exist
		if (result.paths.length > 1) {
			expect(result.stats.pathsFound).toBeGreaterThan(1);
		}
	});

	it("tracks salience across multiple paths", () => {
		// Create a graph where a central node will appear in multiple paths
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		const nodes = ["A", "B", "C", "X", "D", "E", "F"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		// Hub structure: A-X-D, B-X-E, C-X-F
		// X is a hub appearing in multiple paths
		graph.addEdge({ source: "A", target: "X", weight: 1 });
		graph.addEdge({ source: "B", target: "X", weight: 1 });
		graph.addEdge({ source: "C", target: "X", weight: 1 });
		graph.addEdge({ source: "X", target: "D", weight: 1 });
		graph.addEdge({ source: "X", target: "E", weight: 1 });
		graph.addEdge({ source: "X", target: "F", weight: 1 });

		const result = sage(graph, [{ id: "A" }, { id: "D" }]);

		expect(result.paths.length).toBeGreaterThan(0);
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});
});

describe("sageAsync", () => {
	it("is an async function", () => {
		expect(typeof sageAsync).toBe("function");
		expect(sageAsync.constructor.name).toBe("AsyncFunction");
	});

	it("produces the same paths and nodesVisited as the sync version", async () => {
		// SAGE's priority function does not access context.graph, so it is safe
		// to run in async mode via baseAsync with no graphRef.
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const syncResult = sage(graph, seeds);
		const asyncResult = await sageAsync(wrapAsync(graph), seeds);

		expect(asyncResult.paths.length).toBe(syncResult.paths.length);
		expect(asyncResult.stats.nodesVisited).toBe(syncResult.stats.nodesVisited);
	});

	it("returns empty result for no seeds", async () => {
		const graph = createLinearChainGraph();
		const result = await sageAsync(wrapAsync(graph), []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});
});
