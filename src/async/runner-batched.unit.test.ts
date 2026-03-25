import { describe, it, expect, vi } from "vitest";
import { runBatched } from "./runner-batched";
import type { GraphOp, GraphOpResponse } from "./protocol";

// Mock async graph for testing
class MockAsyncGraph {
	private nodes = new Map<string, { id: string; neighbours: string[] }>();
	private neighbourCalls: string[] = [];
	private degreeCalls: string[] = [];

	constructor(nodes: { id: string; neighbours: string[] }[]) {
		nodes.forEach((n) => this.nodes.set(n.id, n));
	}

	getCalls(): { neighbours: string[]; degree: string[] } {
		return {
			neighbours: this.neighbourCalls,
			degree: this.degreeCalls,
		};
	}

	reset(): void {
		this.neighbourCalls = [];
		this.degreeCalls = [];
	}

	readonly directed = false;

	get nodeCount(): Promise<number> {
		return Promise.resolve(this.nodes.size);
	}

	get edgeCount(): Promise<number> {
		let count = 0;
		for (const node of this.nodes.values()) {
			count += node.neighbours.length;
		}
		return Promise.resolve(count);
	}

	async hasNode(id: string): Promise<boolean> {
		return Promise.resolve(this.nodes.has(id));
	}

	async getNode(
		id: string,
	): Promise<{ id: string; neighbours: string[] } | undefined> {
		return Promise.resolve(this.nodes.get(id));
	}

	async *nodeIds(): AsyncIterable<string> {
		for (const id of this.nodes.keys()) {
			yield id;
			await Promise.resolve();
		}
	}

	async *neighbours(id: string): AsyncIterable<string> {
		this.neighbourCalls.push(id);
		const node = this.nodes.get(id);
		if (node) {
			for (const neighbour of node.neighbours) {
				yield neighbour;
				await Promise.resolve();
			}
		}
	}

	async degree(id: string): Promise<number> {
		this.degreeCalls.push(id);
		const node = this.nodes.get(id);
		return Promise.resolve(node?.neighbours.length ?? 0);
	}

	async getEdge(): Promise<undefined> {
		return Promise.resolve(undefined);
	}

	async *edges(): AsyncIterable<never> {
		// No edges
	}
}

describe("runBatched", () => {
	it("should handle single neighbours ops", async () => {
		const graph = new MockAsyncGraph([
			{ id: "A", neighbours: ["B", "C"] },
			{ id: "B", neighbours: ["A", "D"] },
			{ id: "C", neighbours: ["A"] },
		]);

		interface Result {
			v1: string[];
			v2: string[];
			v3: string[];
		}

		function* gen(): Generator<GraphOp, Result, GraphOpResponse> {
			const r1 = yield { tag: "neighbours", id: "A" };
			const r2 = yield { tag: "neighbours", id: "B" };
			const r3 = yield { tag: "neighbours", id: "C" };
			return {
				v1: r1.tag === "neighbours" ? [...r1.value] : [],
				v2: r2.tag === "neighbours" ? [...r2.value] : [],
				v3: r3.tag === "neighbours" ? [...r3.value] : [],
			};
		}

		const result = await runBatched(gen(), graph);
		expect(result.v1).toEqual(expect.arrayContaining(["B", "C"]));
		expect(result.v2).toEqual(expect.arrayContaining(["A", "D"]));
		expect(result.v3).toEqual(expect.arrayContaining(["A"]));

		// Verify calls were made
		const calls = graph.getCalls();
		expect(calls.neighbours).toEqual(["A", "B", "C"]);
	});

	it("should handle single degree ops", async () => {
		const graph = new MockAsyncGraph([
			{ id: "A", neighbours: ["B", "C"] },
			{ id: "B", neighbours: ["A"] },
		]);

		interface Result {
			d1: number;
			d2: number;
		}

		function* gen(): Generator<GraphOp, Result, GraphOpResponse> {
			const r1 = yield { tag: "degree", id: "A" };
			const r2 = yield { tag: "degree", id: "B" };
			return {
				d1: r1.tag === "degree" ? r1.value : 0,
				d2: r2.tag === "degree" ? r2.value : 0,
			};
		}

		const result = await runBatched(gen(), graph);
		expect(result.d1).toBe(2);
		expect(result.d2).toBe(1);

		const calls = graph.getCalls();
		expect(calls.degree).toEqual(["A", "B"]);
	});

	it("should handle mixed op types", async () => {
		const graph = new MockAsyncGraph([
			{ id: "A", neighbours: ["B"] },
			{ id: "B", neighbours: ["A"] },
		]);

		interface Result {
			n1: string[];
			d1: number;
			n2: string[];
		}

		function* gen(): Generator<GraphOp, Result, GraphOpResponse> {
			const r1 = yield { tag: "neighbours", id: "A" };
			const r2 = yield { tag: "degree", id: "A" };
			const r3 = yield { tag: "neighbours", id: "B" };
			return {
				n1: r1.tag === "neighbours" ? [...r1.value] : [],
				d1: r2.tag === "degree" ? r2.value : 0,
				n2: r3.tag === "neighbours" ? [...r3.value] : [],
			};
		}

		const result = await runBatched(gen(), graph);
		expect(result.n1).toEqual(["B"]);
		expect(result.d1).toBe(1);
		expect(result.n2).toEqual(["A"]);

		// neighbours and degree should be tracked separately
		const calls = graph.getCalls();
		expect(calls.neighbours).toEqual(["A", "B"]);
		expect(calls.degree).toEqual(["A"]);
	});

	it("should handle yield and progress ops", async () => {
		const graph = new MockAsyncGraph([{ id: "A", neighbours: [] }]);

		type Result = string[];

		function* gen(): Generator<GraphOp, Result, GraphOpResponse> {
			yield { tag: "yield" };
			yield {
				tag: "progress",
				stats: {
					iterations: 1,
					nodesVisited: 1,
					edgesTraversed: 0,
					pathsFound: 0,
					frontierSizes: [1],
					elapsedMs: 0,
				},
			};
			const r1 = yield { tag: "neighbours", id: "A" };
			return r1.tag === "neighbours" ? [...r1.value] : [];
		}

		const onProgress = vi.fn();
		const result = await runBatched(gen(), graph, { onProgress });
		expect(onProgress).toHaveBeenCalledOnce();
		expect(result).toEqual([]);
	});

	it("should support cancellation", async () => {
		const graph = new MockAsyncGraph([{ id: "A", neighbours: [] }]);

		function* gen(): Generator<GraphOp, never, GraphOpResponse> {
			yield { tag: "neighbours", id: "A" };
			throw new Error("Should not reach here");
		}

		const controller = new AbortController();
		controller.abort();

		await expect(
			runBatched(gen(), graph, { signal: controller.signal }),
		).rejects.toThrow("Aborted");
	});

	it("should handle explicit batch ops from generator", async () => {
		const graph = new MockAsyncGraph([
			{ id: "A", neighbours: ["B"] },
			{ id: "B", neighbours: ["A"] },
		]);

		type Result = Map<string, string[]>;

		function* gen(): Generator<GraphOp, Result, GraphOpResponse> {
			const r = yield {
				tag: "batchNeighbours",
				ids: ["A", "B"],
			};
			if (r.tag === "batchNeighbours") {
				const map = new Map<string, string[]>();
				for (const [k, v] of r.value) {
					map.set(k, [...v]);
				}
				return map;
			}
			return new Map();
		}

		const result = await runBatched(gen(), graph);
		expect(result.size).toBe(2);
		expect(result.get("A")).toEqual(["B"]);
		expect(result.get("B")).toEqual(["A"]);

		// Should only make one call (batch op)
		const calls = graph.getCalls();
		expect(calls.neighbours).toEqual(["A", "B"]);
	});

	it("should handle neighbours with direction", async () => {
		const graph = new MockAsyncGraph([
			{ id: "A", neighbours: ["B"] },
			{ id: "B", neighbours: ["A"] },
		]);

		interface Result {
			v1: string[];
			v2: string[];
		}

		function* gen(): Generator<GraphOp, Result, GraphOpResponse> {
			const r1 = yield { tag: "neighbours", id: "A", direction: "out" };
			const r2 = yield { tag: "neighbours", id: "B", direction: "in" };
			return {
				v1: r1.tag === "neighbours" ? [...r1.value] : [],
				v2: r2.tag === "neighbours" ? [...r2.value] : [],
			};
		}

		const result = await runBatched(gen(), graph);
		expect(result.v1).toEqual(["B"]);
		expect(result.v2).toEqual(["A"]);
	});

	it("should handle degree with direction", async () => {
		const graph = new MockAsyncGraph([
			{ id: "A", neighbours: ["B", "C"] },
			{ id: "B", neighbours: ["A"] },
		]);

		interface Result {
			d1: number;
			d2: number;
		}

		function* gen(): Generator<GraphOp, Result, GraphOpResponse> {
			const r1 = yield { tag: "degree", id: "A", direction: "out" };
			const r2 = yield { tag: "degree", id: "B", direction: "in" };
			return {
				d1: r1.tag === "degree" ? r1.value : 0,
				d2: r2.tag === "degree" ? r2.value : 0,
			};
		}

		const result = await runBatched(gen(), graph);
		expect(result.d1).toBe(2);
		expect(result.d2).toBe(1);
	});
});
