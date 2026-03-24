import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph/adjacency-map";
import type { NodeData, EdgeData } from "../graph/types";
import {
	localClusteringCoefficient,
	approximateClusteringCoefficient,
	batchClusteringCoefficients,
} from "./clustering-coefficient";

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

describe("clustering-coefficient utilities", () => {
	describe("localClusteringCoefficient", () => {
		it("returns 0 for isolated node (degree 0)", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });

			expect(localClusteringCoefficient(graph, "A")).toBe(0);
		});

		it("returns 0 for node with single neighbour (degree 1)", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });

			expect(localClusteringCoefficient(graph, "A")).toBe(0);
		});

		it("returns 0 for non-existent node", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

			expect(localClusteringCoefficient(graph, "nonexistent")).toBe(0);
		});

		it("returns 0 for path of 3 nodes (no triangles)", () => {
			// A - B - C (no triangle)
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 1 });

			// B has neighbours A and C, but A-C not connected
			expect(localClusteringCoefficient(graph, "B")).toBe(0);
		});

		it("returns 1 for complete triangle", () => {
			// A - B - C - A (complete triangle)
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 1 });
			graph.addEdge({ source: "C", target: "A", weight: 1 });

			// All nodes should have CC = 1
			expect(localClusteringCoefficient(graph, "A")).toBe(1);
			expect(localClusteringCoefficient(graph, "B")).toBe(1);
			expect(localClusteringCoefficient(graph, "C")).toBe(1);
		});

		it("returns correct value for partial triangles", () => {
			// A is connected to B, C, D
			// B-C and C-D are connected, but B-D is not
			// A's neighbours: B, C, D (3 nodes = 3 possible pairs)
			// Connected pairs: B-C, C-D = 2 triangles through A
			// CC = 2/3
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addNode({ id: "D", label: "D" });

			// A connected to all
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "A", target: "C", weight: 1 });
			graph.addEdge({ source: "A", target: "D", weight: 1 });

			// Some connections among neighbours
			graph.addEdge({ source: "B", target: "C", weight: 1 });
			graph.addEdge({ source: "C", target: "D", weight: 1 });
			// B-D NOT connected

			expect(localClusteringCoefficient(graph, "A")).toBeCloseTo(2 / 3, 10);
		});

		it("returns 1 for complete graph K4", () => {
			// Complete graph with 4 nodes
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addNode({ id: "D", label: "D" });

			// All pairs connected
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "A", target: "C", weight: 1 });
			graph.addEdge({ source: "A", target: "D", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 1 });
			graph.addEdge({ source: "B", target: "D", weight: 1 });
			graph.addEdge({ source: "C", target: "D", weight: 1 });

			expect(localClusteringCoefficient(graph, "A")).toBe(1);
			expect(localClusteringCoefficient(graph, "B")).toBe(1);
			expect(localClusteringCoefficient(graph, "C")).toBe(1);
			expect(localClusteringCoefficient(graph, "D")).toBe(1);
		});

		it("returns 0.5 for star graph centre with 2 triangles", () => {
			// Star with centre A connected to B, C, D, E
			// B-C and D-E form triangles
			// A's neighbours: B, C, D, E (4 nodes = 6 possible pairs)
			// Connected pairs: B-C, D-E = 2 triangles
			// CC = 2/6 = 1/3
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addNode({ id: "D", label: "D" });
			graph.addNode({ id: "E", label: "E" });

			// A connected to all
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "A", target: "C", weight: 1 });
			graph.addEdge({ source: "A", target: "D", weight: 1 });
			graph.addEdge({ source: "A", target: "E", weight: 1 });

			// Two triangles
			graph.addEdge({ source: "B", target: "C", weight: 1 });
			graph.addEdge({ source: "D", target: "E", weight: 1 });

			expect(localClusteringCoefficient(graph, "A")).toBeCloseTo(1 / 3, 10);
		});

		it("works with directed graphs (treats edges as bidirectional for neighbours)", () => {
			// Directed graph where neighbours() returns both in and out
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });

			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "C", target: "A", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 1 });

			// A has neighbours B (out) and C (in)
			// B-C is connected
			expect(localClusteringCoefficient(graph, "A")).toBe(1);
		});
	});

	describe("approximateClusteringCoefficient", () => {
		it("returns 0 for isolated node", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });

			expect(approximateClusteringCoefficient(graph, "A")).toBe(0);
		});

		it("returns 0 for node with degree 1", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });

			expect(approximateClusteringCoefficient(graph, "A")).toBe(0);
		});

		it("delegates to exact computation when pairs <= sampleSize", () => {
			// Triangle: 3 nodes, centre has 2 neighbours = 1 possible pair
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 1 });
			graph.addEdge({ source: "C", target: "A", weight: 1 });

			// With default sampleSize (100), should use exact computation
			expect(approximateClusteringCoefficient(graph, "A")).toBe(1);
		});

		it("samples neighbour pairs for large degree nodes", () => {
			// Create a star graph with many leaves
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "centre", label: "centre" });

			// Add 20 neighbours (190 possible pairs, more than sampleSize 100)
			for (let i = 0; i < 20; i++) {
				const nodeId = `n${String(i)}`;
				graph.addNode({ id: nodeId, label: nodeId });
				graph.addEdge({ source: "centre", target: nodeId, weight: 1 });
			}

			// No connections among neighbours, so CC should be 0
			// Even with sampling, result should be 0
			const result = approximateClusteringCoefficient(graph, "centre", 50);
			expect(result).toBe(0);
		});

		it("uses custom sampleSize parameter", () => {
			// Create graph where exact computation would check many pairs
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });

			// 5 neighbours = 10 possible pairs
			for (let i = 0; i < 5; i++) {
				const nodeId = `n${String(i)}`;
				graph.addNode({ id: nodeId, label: nodeId });
				graph.addEdge({ source: "A", target: nodeId, weight: 1 });
			}

			// With sampleSize 5, only half the pairs checked
			// No connections, so should still be 0
			const result = approximateClusteringCoefficient(graph, "A", 5);
			expect(result).toBe(0);
		});

		it("returns 0 for non-existent node", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

			expect(approximateClusteringCoefficient(graph, "nonexistent")).toBe(0);
		});
	});

	describe("batchClusteringCoefficients", () => {
		it("returns empty map for empty input", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			const result = batchClusteringCoefficients(graph, []);

			expect(result.size).toBe(0);
		});

		it("computes coefficients for multiple nodes", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 1 });
			graph.addEdge({ source: "C", target: "A", weight: 1 });

			const result = batchClusteringCoefficients(graph, ["A", "B", "C"]);

			expect(result.size).toBe(3);
			expect(result.get("A")).toBe(1);
			expect(result.get("B")).toBe(1);
			expect(result.get("C")).toBe(1);
		});

		it("handles mixture of isolated and connected nodes", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addNode({ id: "isolated", label: "isolated" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 1 });
			graph.addEdge({ source: "C", target: "A", weight: 1 });

			const result = batchClusteringCoefficients(graph, [
				"A",
				"B",
				"C",
				"isolated",
			]);

			expect(result.size).toBe(4);
			expect(result.get("A")).toBe(1);
			expect(result.get("isolated")).toBe(0);
		});

		it("includes non-existent nodes with coefficient 0", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });

			const result = batchClusteringCoefficients(graph, ["A", "nonexistent"]);

			expect(result.size).toBe(2);
			expect(result.get("A")).toBe(0);
			expect(result.get("nonexistent")).toBe(0);
		});

		it("computes correct values for varied network structure", () => {
			// Create a graph with known structure:
			// Triangle: A-B-C-A
			// Plus D connected only to A
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addNode({ id: "D", label: "D" });

			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 1 });
			graph.addEdge({ source: "C", target: "A", weight: 1 });
			graph.addEdge({ source: "A", target: "D", weight: 1 });

			const result = batchClusteringCoefficients(graph, ["A", "B", "C", "D"]);

			// A has neighbours B, C, D (3 pairs)
			// Only B-C connected, so 1/3
			expect(result.get("A")).toBeCloseTo(1 / 3, 10);
			// B has neighbours A, C (1 pair), A-C connected
			expect(result.get("B")).toBe(1);
			// C has neighbours A, B (1 pair), A-B connected
			expect(result.get("C")).toBe(1);
			// D has only 1 neighbour
			expect(result.get("D")).toBe(0);
		});
	});
});
