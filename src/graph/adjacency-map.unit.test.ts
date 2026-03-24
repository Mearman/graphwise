import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "./adjacency-map";
import type { NodeData, EdgeData } from "./types";

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

describe("AdjacencyMapGraph", () => {
	describe("directed graph", () => {
		it("creates an empty directed graph", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			expect(graph.directed).toBe(true);
			expect(graph.nodeCount).toBe(0);
			expect(graph.edgeCount).toBe(0);
		});

		it("adds and retrieves nodes", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "Node A" });
			graph.addNode({ id: "B", label: "Node B" });

			expect(graph.nodeCount).toBe(2);
			expect(graph.hasNode("A")).toBe(true);
			expect(graph.hasNode("B")).toBe(true);
			expect(graph.hasNode("C")).toBe(false);

			const nodeA = graph.getNode("A");
			expect(nodeA).toBeDefined();
			expect(nodeA?.label).toBe("Node A");
		});

		it("adds and retrieves edges", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "Node A" });
			graph.addNode({ id: "B", label: "Node B" });
			graph.addEdge({ source: "A", target: "B", weight: 1.5 });

			expect(graph.edgeCount).toBe(1);

			const edge = graph.getEdge("A", "B");
			expect(edge).toBeDefined();
			expect(edge?.weight).toBe(1.5);

			// Directed: reverse edge should not exist
			expect(graph.getEdge("B", "A")).toBeUndefined();
		});

		it("throws when adding edge with missing nodes", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			expect(() => {
				graph.addEdge({ source: "A", target: "B", weight: 1 });
			}).toThrow("Cannot add edge");
		});

		it("queries neighbours by direction", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "C", target: "A", weight: 1 });

			// Out neighbours from A
			const outNeighbours = [...graph.neighbours("A", "out")];
			expect(outNeighbours).toEqual(["B"]);

			// In neighbours to A
			const inNeighbours = [...graph.neighbours("A", "in")];
			expect(inNeighbours).toEqual(["C"]);

			// Both directions
			const bothNeighbours = [...graph.neighbours("A", "both")];
			expect(bothNeighbours.sort()).toEqual(["B", "C"]);
		});

		it("calculates degree by direction", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "C", target: "A", weight: 1 });

			expect(graph.degree("A", "out")).toBe(1);
			expect(graph.degree("A", "in")).toBe(1);
			expect(graph.degree("A", "both")).toBe(2);
		});

		it("removes nodes and incident edges", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 1 });

			expect(graph.removeNode("B")).toBe(true);
			expect(graph.nodeCount).toBe(2);
			expect(graph.edgeCount).toBe(0);
			expect(graph.hasNode("B")).toBe(false);
			expect(graph.removeNode("B")).toBe(false); // Already removed
		});

		it("removes edges", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });

			expect(graph.removeEdge("A", "B")).toBe(true);
			expect(graph.edgeCount).toBe(0);
			expect(graph.removeEdge("A", "B")).toBe(false); // Already removed
		});

		it("iterates over node IDs", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });

			const ids = [...graph.nodeIds()];
			expect(ids.sort()).toEqual(["A", "B", "C"]);
		});

		it("iterates over edges", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 2 });

			const edges = [...graph.edges()];
			expect(edges).toHaveLength(2);
			expect(edges.map((e) => e.weight)).toEqual([1, 2]);
		});

		it("returns empty iterable for missing node neighbours", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			const neighbours = [...graph.neighbours("nonexistent")];
			expect(neighbours).toEqual([]);
		});

		it("returns zero degree for missing node", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			expect(graph.degree("nonexistent")).toBe(0);
		});
	});

	describe("undirected graph", () => {
		it("creates an empty undirected graph", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

			expect(graph.directed).toBe(false);
			expect(graph.nodeCount).toBe(0);
			expect(graph.edgeCount).toBe(0);
		});

		it("treats edges as bidirectional", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });

			// Edge exists in both directions
			expect(graph.getEdge("A", "B")).toBeDefined();
			expect(graph.getEdge("B", "A")).toBeDefined();
		});

		it("neighbours ignore direction parameter", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "C", target: "A", weight: 1 });

			// Direction is ignored for undirected
			const outNeighbours = [...graph.neighbours("A", "out")];
			const inNeighbours = [...graph.neighbours("A", "in")];
			const bothNeighbours = [...graph.neighbours("A", "both")];

			expect(outNeighbours.sort()).toEqual(["B", "C"]);
			expect(inNeighbours.sort()).toEqual(["B", "C"]);
			expect(bothNeighbours.sort()).toEqual(["B", "C"]);
		});

		it("counts edges once", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });

			expect(graph.edgeCount).toBe(1);

			// edges() should return each edge once
			const edges = [...graph.edges()];
			expect(edges).toHaveLength(1);
		});

		it("removes edges in both directions", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });

			expect(graph.removeEdge("B", "A")).toBe(true);
			expect(graph.edgeCount).toBe(0);
			expect(graph.getEdge("A", "B")).toBeUndefined();
			expect(graph.getEdge("B", "A")).toBeUndefined();
		});
	});

	describe("builder pattern", () => {
		it("supports method chaining", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>()
				.addNode({ id: "A", label: "A" })
				.addNode({ id: "B", label: "B" })
				.addEdge({ source: "A", target: "B", weight: 1 });

			expect(graph.nodeCount).toBe(2);
			expect(graph.edgeCount).toBe(1);
		});
	});

	describe("edge cases", () => {
		it("handles self-loops", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addEdge({ source: "A", target: "A", weight: 1 });

			expect(graph.edgeCount).toBe(1);
			expect(graph.getEdge("A", "A")).toBeDefined();
			expect(graph.degree("A", "out")).toBe(1);
		});

		it("updates existing edge on re-add", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "A", target: "B", weight: 2 });

			expect(graph.edgeCount).toBe(1); // Still one edge
			expect(graph.getEdge("A", "B")?.weight).toBe(2); // Updated weight
		});

		it("ignores duplicate node add", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "First" });
			graph.addNode({ id: "A", label: "Second" });

			expect(graph.nodeCount).toBe(1);
			// First add wins (implementation choice)
			expect(graph.getNode("A")?.label).toBe("First");
		});
	});
});
