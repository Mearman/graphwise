import { describe, it, expect } from "vitest";
import { bfs, bfsWithPath } from "./bfs";
import type { ReadableGraph, NodeId } from "../graph";

/**
 * Creates a simple adjacency list graph for testing.
 */
function createMockGraph(
	adjacencyList: Map<NodeId, NodeId[]>,
	directed = false,
): ReadableGraph {
	return {
		directed,
		get nodeCount() {
			return adjacencyList.size;
		},
		get edgeCount() {
			let count = 0;
			for (const neighbours of adjacencyList.values()) {
				count += neighbours.length;
			}
			return directed ? count : Math.floor(count / 2);
		},
		hasNode(id: NodeId): boolean {
			return adjacencyList.has(id);
		},
		getNode(id: NodeId) {
			return adjacencyList.has(id) ? { id } : undefined;
		},
		nodeIds(): Iterable<NodeId> {
			return adjacencyList.keys();
		},
		neighbours(id: NodeId): Iterable<NodeId> {
			return adjacencyList.get(id) ?? [];
		},
		degree(id: NodeId): number {
			return (adjacencyList.get(id) ?? []).length;
		},
		getEdge() {
			return undefined;
		},
		edges(): Iterable<never> {
			return [];
		},
	};
}

describe("bfs", () => {
	it("should traverse a simple linear graph", () => {
		const graph = createMockGraph(
			new Map([
				["A", ["B"]],
				["B", ["A", "C"]],
				["C", ["B"]],
			]),
		);

		const result = [...bfs(graph, "A")];
		expect(result).toEqual(["A", "B", "C"]);
	});

	it("should traverse a tree in level order", () => {
		//     A
		//    / \
		//   B   C
		//  / \
		// D   E
		const graph = createMockGraph(
			new Map([
				["A", ["B", "C"]],
				["B", ["A", "D", "E"]],
				["C", ["A"]],
				["D", ["B"]],
				["E", ["B"]],
			]),
		);

		const result = [...bfs(graph, "A")];
		expect(result).toEqual(["A", "B", "C", "D", "E"]);
	});

	it("should handle a graph with cycles", () => {
		// A -> B <-> C
		//      |
		//      v
		//      D
		const graph = createMockGraph(
			new Map([
				["A", ["B"]],
				["B", ["A", "C", "D"]],
				["C", ["B"]],
				["D", ["B"]],
			]),
		);

		const result = [...bfs(graph, "A")];
		expect(result).toEqual(["A", "B", "C", "D"]);
	});

	it("should return empty for non-existent start node", () => {
		const graph = createMockGraph(new Map([["A", []]]));

		const result = [...bfs(graph, "Z")];
		expect(result).toEqual([]);
	});

	it("should handle a single-node graph", () => {
		const graph = createMockGraph(new Map([["A", []]]));

		const result = [...bfs(graph, "A")];
		expect(result).toEqual(["A"]);
	});

	it("should handle disconnected graphs by only traversing connected component", () => {
		const graph = createMockGraph(
			new Map([
				["A", ["B"]],
				["B", ["A"]],
				["C", ["D"]],
				["D", ["C"]],
			]),
		);

		const result = [...bfs(graph, "A")];
		expect(result).toEqual(["A", "B"]);
	});
});

describe("bfsWithPath", () => {
	it("should provide depth and parent information", () => {
		const graph = createMockGraph(
			new Map([
				["A", ["B", "C"]],
				["B", ["A", "D"]],
				["C", ["A"]],
				["D", ["B"]],
			]),
		);

		const result = [...bfsWithPath(graph, "A")];

		expect(result).toEqual([
			{ node: "A", depth: 0, parent: undefined },
			{ node: "B", depth: 1, parent: "A" },
			{ node: "C", depth: 1, parent: "A" },
			{ node: "D", depth: 2, parent: "B" },
		]);
	});

	it("should return empty for non-existent start node", () => {
		const graph = createMockGraph(new Map([["A", []]]));

		const result = [...bfsWithPath(graph, "Z")];
		expect(result).toEqual([]);
	});

	it("should handle a single-node graph", () => {
		const graph = createMockGraph(new Map([["A", []]]));

		const result = [...bfsWithPath(graph, "A")];
		expect(result).toEqual([{ node: "A", depth: 0, parent: undefined }]);
	});
});
