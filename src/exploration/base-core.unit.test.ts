/**
 * Unit tests for the baseCore generator and baseAsync() entry point.
 *
 * Verifies that:
 * - baseCore driven via runSync produces identical results to base()
 * - baseAsync() produces identical results to base() on the standard fixtures
 * - AbortSignal cancellation works in baseAsync()
 */

import { describe, it, expect } from "vitest";
import { base, baseAsync } from "./base";
import { baseCore } from "./base-core";
import { runSync } from "../async/runners";
import { wrapAsync } from "../__test__/fixtures/wrap-async";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";
import { createThreeCommunityFixture } from "../__test__/fixtures/graphs/three-community";
import type { Seed } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Drive baseCore via runSync and return the result.
 * Passes the real graph as graphRef so priority functions can access context.graph.
 */
function runBaseCore(
	graph: Parameters<typeof base>[0],
	seeds: readonly Seed[],
	config?: Parameters<typeof base>[2],
): ReturnType<typeof base> {
	const gen = baseCore(
		{
			directed: graph.directed,
			nodeCount: graph.nodeCount,
			edgeCount: graph.edgeCount,
		},
		seeds,
		config,
		graph,
	);
	return runSync(gen, graph);
}

// ---------------------------------------------------------------------------
// Structural equivalence with base()
// ---------------------------------------------------------------------------

describe("baseCore via runSync", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = runBaseCore(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
		expect(result.stats.algorithm).toBe("base");
	});

	it("returns correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const result = runBaseCore(graph, seeds);

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
		const result = runBaseCore(graph, seeds);

		expect(result.paths).toHaveLength(0);
	});

	it("matches base() path count on linear chain", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const expected = base(graph, seeds);
		const actual = runBaseCore(graph, seeds);

		expect(actual.paths).toHaveLength(expected.paths.length);
	});

	it("matches base() sampled node count on linear chain", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const expected = base(graph, seeds);
		const actual = runBaseCore(graph, seeds);

		expect(actual.sampledNodes.size).toBe(expected.sampledNodes.size);
	});

	it("matches base() stats (except durationMs) on linear chain", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const expected = base(graph, seeds);
		const actual = runBaseCore(graph, seeds);

		expect(actual.stats.iterations).toBe(expected.stats.iterations);
		expect(actual.stats.nodesVisited).toBe(expected.stats.nodesVisited);
		expect(actual.stats.edgesTraversed).toBe(expected.stats.edgesTraversed);
		expect(actual.stats.pathsFound).toBe(expected.stats.pathsFound);
		expect(actual.stats.termination).toBe(expected.stats.termination);
		expect(actual.stats.algorithm).toBe(expected.stats.algorithm);
	});

	it("matches base() path nodes on linear chain", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const expected = base(graph, seeds);
		const actual = runBaseCore(graph, seeds);

		// Sort paths by node sequence for stable comparison
		const sortPaths = (
			paths: readonly { nodes: readonly string[] }[],
		): string[] => [...paths].map((p) => [...p.nodes].join(",")).sort();

		expect(sortPaths(actual.paths)).toEqual(sortPaths(expected.paths));
	});

	it("matches base() on three-community fixture", () => {
		const { graph, seeds } = createThreeCommunityFixture();

		const expected = base(graph, seeds);
		const actual = runBaseCore(graph, seeds);

		expect(actual.stats.iterations).toBe(expected.stats.iterations);
		expect(actual.stats.nodesVisited).toBe(expected.stats.nodesVisited);
		expect(actual.stats.edgesTraversed).toBe(expected.stats.edgesTraversed);
		expect(actual.stats.pathsFound).toBe(expected.stats.pathsFound);
		expect(actual.stats.termination).toBe(expected.stats.termination);
		expect(actual.sampledNodes.size).toBe(expected.sampledNodes.size);
		expect(actual.paths).toHaveLength(expected.paths.length);
	});

	it("respects maxPaths limit", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config = { maxPaths: 1 };

		const expected = base(graph, seeds, config);
		const actual = runBaseCore(graph, seeds, config);

		expect(actual.stats.termination).toBe(expected.stats.termination);
	});

	it("respects maxNodes limit", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const config = { maxNodes: 3 };

		const expected = base(graph, seeds, config);
		const actual = runBaseCore(graph, seeds, config);

		expect(actual.stats.nodesVisited).toBeLessThanOrEqual(
			expected.stats.nodesVisited + 1,
		);
	});

	it("reports correct algorithm name", () => {
		const graph = createLinearChainGraph();
		const result = runBaseCore(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.algorithm).toBe("base");
	});
});

// ---------------------------------------------------------------------------
// baseAsync() — equivalence with base() and cancellation
// ---------------------------------------------------------------------------

describe("baseAsync", () => {
	it("produces same path count as base() on linear chain", async () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const sync = base(graph, seeds);
		const async_ = await baseAsync(wrapAsync(graph), seeds);

		expect(async_.paths).toHaveLength(sync.paths.length);
	});

	it("produces same sampled node count as base() on linear chain", async () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const sync = base(graph, seeds);
		const async_ = await baseAsync(wrapAsync(graph), seeds);

		expect(async_.sampledNodes.size).toBe(sync.sampledNodes.size);
	});

	it("matches base() stats (except durationMs) on linear chain", async () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const sync = base(graph, seeds);
		const async_ = await baseAsync(wrapAsync(graph), seeds);

		expect(async_.stats.iterations).toBe(sync.stats.iterations);
		expect(async_.stats.nodesVisited).toBe(sync.stats.nodesVisited);
		expect(async_.stats.edgesTraversed).toBe(sync.stats.edgesTraversed);
		expect(async_.stats.pathsFound).toBe(sync.stats.pathsFound);
		expect(async_.stats.termination).toBe(sync.stats.termination);
		expect(async_.stats.algorithm).toBe(sync.stats.algorithm);
	});

	it("matches base() path nodes on linear chain", async () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const sync = base(graph, seeds);
		const async_ = await baseAsync(wrapAsync(graph), seeds);

		const sortPaths = (
			paths: readonly { nodes: readonly string[] }[],
		): string[] => [...paths].map((p) => [...p.nodes].join(",")).sort();

		expect(sortPaths(async_.paths)).toEqual(sortPaths(sync.paths));
	});

	it("matches base() on three-community fixture", async () => {
		const { graph, seeds } = createThreeCommunityFixture();

		const sync = base(graph, seeds);
		const async_ = await baseAsync(wrapAsync(graph), seeds);

		expect(async_.stats.iterations).toBe(sync.stats.iterations);
		expect(async_.stats.nodesVisited).toBe(sync.stats.nodesVisited);
		expect(async_.stats.edgesTraversed).toBe(sync.stats.edgesTraversed);
		expect(async_.stats.pathsFound).toBe(sync.stats.pathsFound);
		expect(async_.stats.termination).toBe(sync.stats.termination);
		expect(async_.sampledNodes.size).toBe(sync.sampledNodes.size);
		expect(async_.paths).toHaveLength(sync.paths.length);
	});

	it("returns empty result for no seeds", async () => {
		const graph = createLinearChainGraph();
		const result = await baseAsync(wrapAsync(graph), []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
		expect(result.stats.algorithm).toBe("base");
	});

	it("throws AbortError when signal is already aborted", async () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const controller = new AbortController();
		controller.abort();

		await expect(
			baseAsync(wrapAsync(graph), seeds, { signal: controller.signal }),
		).rejects.toMatchObject({ name: "AbortError" });
	});

	it("cancels immediately when signal is aborted before second op", async () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];
		const controller = new AbortController();

		// Use a custom async graph that aborts on the first neighbour call,
		// simulating cancellation mid-exploration.
		const base_ = wrapAsync(graph);
		let callCount = 0;
		const abortingGraph = {
			...base_,
			degree: (id: string) => {
				callCount++;
				// Abort after a few degree calls (seed initialisation)
				if (callCount > 2) controller.abort();
				return base_.degree(id);
			},
		};

		await expect(
			baseAsync(abortingGraph, seeds, { signal: controller.signal }),
		).rejects.toMatchObject({ name: "AbortError" });
	});
});
