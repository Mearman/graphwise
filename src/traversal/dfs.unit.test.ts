import { describe, it, expect } from "vitest";
import { dfs, dfsWithPath } from "./dfs";
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

describe("dfs", () => {
	it("should traverse a simple linear graph", () => {
		const graph = createMockGraph(
			new Map([
				["A", ["B"]],
				["B", ["A", "C"]],
				["C", ["B"]],
			]),
		);

		const result = [...dfs(graph, "A")];
		expect(result).toEqual(["A", "B", "C"]);
	});

	it("should traverse a tree in depth-first order", () => {
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

		const result = [...dfs(graph, "A")];
		// DFS goes deep first: A -> B -> D, then E, then C
		expect(result).toEqual(["A", "B", "D", "E", "C"]);
	});

	it("should handle a graph with cycles without revisiting nodes", () => {
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

		const result = [...dfs(graph, "A")];
		// Should visit each node exactly once
		expect(result).toHaveLength(4);
		expect(new Set(result).size).toBe(4);
		expect(result[0]).toBe("A");
	});

	it("should return empty for non-existent start node", () => {
		const graph = createMockGraph(new Map([["A", []]]));

		const result = [...dfs(graph, "Z")];
		expect(result).toEqual([]);
	});

	it("should handle a single-node graph", () => {
		const graph = createMockGraph(new Map([["A", []]]));

		const result = [...dfs(graph, "A")];
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

		const result = [...dfs(graph, "A")];
		expect(result).toEqual(["A", "B"]);
	});
});

describe("dfsWithPath", () => {
	it("should provide depth and parent information", () => {
		//     A
		//    / \
		//   B   C
		//  /
		// D
		const graph = createMockGraph(
			new Map([
				["A", ["B", "C"]],
				["B", ["A", "D"]],
				["C", ["A"]],
				["D", ["B"]],
			]),
		);

		const result = [...dfsWithPath(graph, "A")];

		// Check first entry (start node)
		expect(result[0]).toEqual({ node: "A", depth: 0, parent: undefined });

		// Find D's entry and verify it has correct depth and parent
		const dEntry = result.find((e) => e.node === "D");
		expect(dEntry).toEqual({ node: "D", depth: 2, parent: "B" });
	});

	it("should return empty for non-existent start node", () => {
		const graph = createMockGraph(new Map([["A", []]]));

		const result = [...dfsWithPath(graph, "Z")];
		expect(result).toEqual([]);
	});

	it("should handle a single-node graph", () => {
		const graph = createMockGraph(new Map([["A", []]]));

		const result = [...dfsWithPath(graph, "A")];
		expect(result).toEqual([{ node: "A", depth: 0, parent: undefined }]);
	});

	it("should track correct parent relationships in complex graph", () => {
		const graph = createMockGraph(
			new Map([
				["A", ["B", "C"]],
				["B", ["A", "D", "E"]],
				["C", ["A", "F"]],
				["D", ["B"]],
				["E", ["B"]],
				["F", ["C"]],
			]),
		);

		const result = [...dfsWithPath(graph, "A")];
		const parentMap = new Map(result.map((e) => [e.node, e.parent]));

		// A has no parent
		expect(parentMap.get("A")).toBeUndefined();
		// B and C should have A as parent
		expect(parentMap.get("B")).toBe("A");
		expect(parentMap.get("C")).toBe("A");
	});
});
