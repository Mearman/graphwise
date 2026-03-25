/**
 * Unit tests for sync and async runners.
 *
 * Verifies that runSync and runAsync correctly drive generator-based
 * algorithms, resolve all op tags, handle cancellation, and propagate errors.
 */

import { describe, it, expect, vi } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData, NodeId } from "../graph";
import { wrapAsync } from "../__test__/fixtures/wrap-async";
import { runSync, runAsync, resolveSyncOp } from "./runners";
import {
	opNeighbours,
	opDegree,
	opGetNode,
	opGetEdge,
	opHasNode,
	opYield,
	opProgress,
} from "./ops";
import type { GraphOp, GraphOpResponse, ProgressStats } from "./protocol";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

/**
 * Build a simple undirected chain: A — B — C
 */
function buildChain(): AdjacencyMapGraph<TestNode, TestEdge> {
	const g = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
	g.addNode({ id: "A", label: "Alpha" });
	g.addNode({ id: "B", label: "Beta" });
	g.addNode({ id: "C", label: "Gamma" });
	g.addEdge({ source: "A", target: "B", weight: 1 });
	g.addEdge({ source: "B", target: "C", weight: 2 });
	return g;
}

// ---------------------------------------------------------------------------
// resolveSyncOp — individual op tag dispatch
// ---------------------------------------------------------------------------

describe("resolveSyncOp", () => {
	const graph = buildChain();

	it("resolves neighbours", () => {
		const response = resolveSyncOp(graph, { tag: "neighbours", id: "B" });
		if (response.tag !== "neighbours") throw new Error("Unexpected tag");
		expect([...response.value].sort()).toEqual(["A", "C"]);
	});

	it("resolves degree", () => {
		const response = resolveSyncOp(graph, { tag: "degree", id: "B" });
		if (response.tag !== "degree") throw new Error("Unexpected tag");
		expect(response.value).toBe(2);
	});

	it("resolves getNode", () => {
		const response = resolveSyncOp(graph, { tag: "getNode", id: "A" });
		if (response.tag !== "getNode") throw new Error("Unexpected tag");
		expect(response.value?.label).toBe("Alpha");
	});

	it("resolves getNode for missing node as undefined", () => {
		const response = resolveSyncOp(graph, { tag: "getNode", id: "Z" });
		if (response.tag !== "getNode") throw new Error("Unexpected tag");
		expect(response.value).toBeUndefined();
	});

	it("resolves getEdge", () => {
		const response = resolveSyncOp(graph, {
			tag: "getEdge",
			source: "A",
			target: "B",
		});
		if (response.tag !== "getEdge") throw new Error("Unexpected tag");
		expect(response.value?.weight).toBe(1);
	});

	it("resolves getEdge for missing edge as undefined", () => {
		const response = resolveSyncOp(graph, {
			tag: "getEdge",
			source: "A",
			target: "C",
		});
		if (response.tag !== "getEdge") throw new Error("Unexpected tag");
		expect(response.value).toBeUndefined();
	});

	it("resolves hasNode true", () => {
		const response = resolveSyncOp(graph, { tag: "hasNode", id: "A" });
		if (response.tag !== "hasNode") throw new Error("Unexpected tag");
		expect(response.value).toBe(true);
	});

	it("resolves hasNode false", () => {
		const response = resolveSyncOp(graph, { tag: "hasNode", id: "Z" });
		if (response.tag !== "hasNode") throw new Error("Unexpected tag");
		expect(response.value).toBe(false);
	});

	it("resolves yield as tagged response", () => {
		const response = resolveSyncOp(graph, { tag: "yield" });
		expect(response.tag).toBe("yield");
	});

	it("resolves progress as tagged response", () => {
		const stats: ProgressStats = {
			iterations: 1,
			nodesVisited: 1,
			edgesTraversed: 0,
			pathsFound: 0,
			frontierSizes: [1],
			elapsedMs: 0,
		};
		const response = resolveSyncOp(graph, { tag: "progress", stats });
		expect(response.tag).toBe("progress");
	});
});

// ---------------------------------------------------------------------------
// runSync — driving a generator with a real graph
// ---------------------------------------------------------------------------

describe("runSync", () => {
	it("retrieves neighbours and degree via generator", () => {
		const graph = buildChain();

		function* algo(): Generator<
			GraphOp,
			{ neighbours: readonly NodeId[]; degree: number },
			GraphOpResponse<TestNode, TestEdge>
		> {
			const neighbours = yield* opNeighbours<TestNode, TestEdge>("B");
			const degree = yield* opDegree<TestNode, TestEdge>("B");
			return { neighbours, degree };
		}

		const result = runSync(algo(), graph);
		expect([...result.neighbours].sort()).toEqual(["A", "C"]);
		expect(result.degree).toBe(2);
	});

	it("dispatches all op tags correctly", () => {
		const graph = buildChain();

		function* allOps(): Generator<
			GraphOp,
			void,
			GraphOpResponse<TestNode, TestEdge>
		> {
			const neighbours = yield* opNeighbours<TestNode, TestEdge>("A");
			expect([...neighbours]).toEqual(["B"]);

			const degree = yield* opDegree<TestNode, TestEdge>("A");
			expect(degree).toBe(1);

			const node = yield* opGetNode<TestNode, TestEdge>("A");
			expect(node?.label).toBe("Alpha");

			const missingNode = yield* opGetNode<TestNode, TestEdge>("Z");
			expect(missingNode).toBeUndefined();

			const edge = yield* opGetEdge<TestNode, TestEdge>("A", "B");
			expect(edge?.weight).toBe(1);

			const missingEdge = yield* opGetEdge<TestNode, TestEdge>("A", "C");
			expect(missingEdge).toBeUndefined();

			const exists = yield* opHasNode<TestNode, TestEdge>("A");
			expect(exists).toBe(true);

			const missing = yield* opHasNode<TestNode, TestEdge>("Z");
			expect(missing).toBe(false);
		}

		// Expectations are inside the generator; runSync driving it verifies them
		runSync(allOps(), graph);
	});

	it("returns the generator return value", () => {
		const graph = buildChain();

		function* sumDegrees(): Generator<
			GraphOp,
			number,
			GraphOpResponse<TestNode, TestEdge>
		> {
			const a = yield* opDegree<TestNode, TestEdge>("A");
			const b = yield* opDegree<TestNode, TestEdge>("B");
			const c = yield* opDegree<TestNode, TestEdge>("C");
			return a + b + c;
		}

		// A=1, B=2, C=1 → sum=4
		expect(runSync(sumDegrees(), graph)).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// runAsync — same results as runSync
// ---------------------------------------------------------------------------

describe("runAsync", () => {
	it("produces the same results as runSync for neighbours and degree", async () => {
		const graph = buildChain();
		const asyncGraph = wrapAsync(graph);

		function* algo(): Generator<
			GraphOp,
			{ neighbours: readonly NodeId[]; degree: number },
			GraphOpResponse<TestNode, TestEdge>
		> {
			const neighbours = yield* opNeighbours<TestNode, TestEdge>("B");
			const degree = yield* opDegree<TestNode, TestEdge>("B");
			return { neighbours, degree };
		}

		const syncResult = runSync(algo(), graph);
		const asyncResult = await runAsync(algo(), asyncGraph);

		expect([...asyncResult.neighbours].sort()).toEqual(
			[...syncResult.neighbours].sort(),
		);
		expect(asyncResult.degree).toBe(syncResult.degree);
	});

	it("dispatches all op tags asynchronously", async () => {
		const graph = buildChain();
		const asyncGraph = wrapAsync(graph);

		function* allOps(): Generator<
			GraphOp,
			void,
			GraphOpResponse<TestNode, TestEdge>
		> {
			const neighbours = yield* opNeighbours<TestNode, TestEdge>("A");
			expect([...neighbours]).toEqual(["B"]);

			const degree = yield* opDegree<TestNode, TestEdge>("A");
			expect(degree).toBe(1);

			const node = yield* opGetNode<TestNode, TestEdge>("A");
			expect(node?.label).toBe("Alpha");

			const edge = yield* opGetEdge<TestNode, TestEdge>("A", "B");
			expect(edge?.weight).toBe(1);

			const exists = yield* opHasNode<TestNode, TestEdge>("A");
			expect(exists).toBe(true);
		}

		await runAsync(allOps(), asyncGraph);
	});

	it("calls yieldStrategy when generator yields opYield", async () => {
		const graph = buildChain();
		const asyncGraph = wrapAsync(graph);
		let yieldCalled = 0;

		function* withYield(): Generator<
			GraphOp,
			number,
			GraphOpResponse<TestNode, TestEdge>
		> {
			yield* opYield<TestNode, TestEdge>();
			yield* opYield<TestNode, TestEdge>();
			return yield* opDegree<TestNode, TestEdge>("B");
		}

		const customYield = vi.fn(() => {
			yieldCalled++;
			return Promise.resolve();
		});
		const result = await runAsync(withYield(), asyncGraph, {
			yieldStrategy: customYield,
		});

		expect(result).toBe(2);
		expect(yieldCalled).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// AbortSignal cancellation
// ---------------------------------------------------------------------------

describe("runAsync cancellation", () => {
	it("throws DOMException AbortError when signal is aborted before start", async () => {
		const graph = buildChain();
		const asyncGraph = wrapAsync(graph);

		const controller = new AbortController();
		controller.abort();

		let cleanedUp = false;

		function* algo(): Generator<
			GraphOp,
			void,
			GraphOpResponse<TestNode, TestEdge>
		> {
			try {
				yield* opDegree<TestNode, TestEdge>("A");
			} finally {
				cleanedUp = true;
			}
		}

		await expect(
			runAsync(algo(), asyncGraph, { signal: controller.signal }),
		).rejects.toMatchObject({ name: "AbortError" });

		expect(cleanedUp).toBe(true);
	});

	it("throws DOMException AbortError when signal is aborted mid-run via yield", async () => {
		const graph = buildChain();
		const asyncGraph = wrapAsync(graph);

		const controller = new AbortController();

		// Use the yield strategy to trigger an abort after the first cooperative yield
		let yieldCount = 0;
		const abortingYieldStrategy = (): Promise<void> => {
			yieldCount++;
			if (yieldCount >= 1) controller.abort();
			return Promise.resolve();
		};

		function* manyOps(): Generator<
			GraphOp,
			void,
			GraphOpResponse<TestNode, TestEdge>
		> {
			yield* opDegree<TestNode, TestEdge>("A");
			yield* opYield<TestNode, TestEdge>(); // abort fires here
			yield* opDegree<TestNode, TestEdge>("B");
			yield* opDegree<TestNode, TestEdge>("C");
		}

		await expect(
			runAsync(manyOps(), asyncGraph, {
				signal: controller.signal,
				yieldStrategy: abortingYieldStrategy,
			}),
		).rejects.toMatchObject({ name: "AbortError" });
	});
});

// ---------------------------------------------------------------------------
// Progress callback
// ---------------------------------------------------------------------------

describe("runAsync progress", () => {
	it("calls onProgress with correct stats", async () => {
		const graph = buildChain();
		const asyncGraph = wrapAsync(graph);

		const receivedStats: ProgressStats[] = [];

		const stats1: ProgressStats = {
			iterations: 1,
			nodesVisited: 1,
			edgesTraversed: 0,
			pathsFound: 0,
			frontierSizes: [1],
			elapsedMs: 10,
		};
		const stats2: ProgressStats = {
			iterations: 5,
			nodesVisited: 3,
			edgesTraversed: 2,
			pathsFound: 1,
			frontierSizes: [2, 1],
			elapsedMs: 50,
		};

		function* withProgress(): Generator<
			GraphOp,
			void,
			GraphOpResponse<TestNode, TestEdge>
		> {
			yield* opProgress<TestNode, TestEdge>(stats1);
			yield* opDegree<TestNode, TestEdge>("B");
			yield* opProgress<TestNode, TestEdge>(stats2);
		}

		await runAsync(withProgress(), asyncGraph, {
			onProgress: (s) => {
				receivedStats.push(s);
			},
		});

		expect(receivedStats).toHaveLength(2);
		expect(receivedStats[0]).toStrictEqual(stats1);
		expect(receivedStats[1]).toStrictEqual(stats2);
	});

	it("awaits async onProgress for backpressure", async () => {
		const graph = buildChain();
		const asyncGraph = wrapAsync(graph);

		const order: string[] = [];

		const stats: ProgressStats = {
			iterations: 1,
			nodesVisited: 1,
			edgesTraversed: 0,
			pathsFound: 0,
			frontierSizes: [],
			elapsedMs: 0,
		};

		function* gen(): Generator<
			GraphOp,
			void,
			GraphOpResponse<TestNode, TestEdge>
		> {
			yield* opProgress<TestNode, TestEdge>(stats);
			order.push("after-progress");
		}

		await runAsync(gen(), asyncGraph, {
			onProgress: async () => {
				order.push("in-progress");
				await new Promise((r) => setTimeout(r, 0));
				order.push("after-await");
			},
		});

		// Backpressure: runner must await the callback before resuming the generator
		expect(order).toEqual(["in-progress", "after-await", "after-progress"]);
	});
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("runAsync error handling", () => {
	it("forwards graph errors into the generator via gen.throw()", async () => {
		const graph = buildChain();
		const asyncGraph = wrapAsync(graph);

		const injectedError = new Error("graph fetch failed");

		// Create a faulty async graph that throws on getNode("B")
		const faultyGraph = {
			...asyncGraph,
			getNode: (id: NodeId) => {
				if (id === "B") return Promise.reject(injectedError);
				return asyncGraph.getNode(id);
			},
		};

		let caughtError: unknown;
		let cleanedUp = false;

		function* algo(): Generator<
			GraphOp,
			string,
			GraphOpResponse<TestNode, TestEdge>
		> {
			try {
				yield* opGetNode<TestNode, TestEdge>("B");
				return "no error";
			} catch (e) {
				caughtError = e;
				return "caught";
			} finally {
				cleanedUp = true;
			}
		}

		const result = await runAsync(algo(), faultyGraph);

		expect(result).toBe("caught");
		expect(caughtError).toBe(injectedError);
		expect(cleanedUp).toBe(true);
	});

	it("propagates unhandled graph errors to caller", async () => {
		const graph = buildChain();
		const asyncGraph = wrapAsync(graph);
		const injectedError = new Error("unhandled graph error");

		const faultyGraph = {
			...asyncGraph,
			degree: () => Promise.reject(injectedError),
		};

		function* algo(): Generator<
			GraphOp,
			void,
			GraphOpResponse<TestNode, TestEdge>
		> {
			// No try/catch — error should propagate to caller
			yield* opDegree<TestNode, TestEdge>("A");
		}

		await expect(runAsync(algo(), faultyGraph)).rejects.toBe(injectedError);
	});
});
