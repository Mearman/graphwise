/**
 * Tests for k-truss decomposition.
 */

import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph/adjacency-map";
import { extractKTruss } from "./truss";

describe("extractKTruss", () => {
	describe("undirected graph", () => {
		it("extracts 3-truss from triangle", () => {
			// Triangle: each edge is in 1 triangle
			// 3-truss requires k-2 = 1 triangle per edge
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "b", target: "c" });
			graph.addEdge({ source: "c", target: "a" });

			// 3-truss: edges must be in >= 1 triangle (all edges qualify)
			const truss3 = extractKTruss(graph, 3);
			expect(truss3.nodeCount).toBe(3);
			expect(truss3.hasNode("a")).toBe(true);
			expect(truss3.hasNode("b")).toBe(true);
			expect(truss3.hasNode("c")).toBe(true);
		});

		it("extracts 4-truss from K4 (complete graph on 4 nodes)", () => {
			// K4: each edge is in 2 triangles
			// 4-truss requires k-2 = 2 triangles per edge
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addNode({ id: "d" });
			// Complete graph K4
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "a", target: "c" });
			graph.addEdge({ source: "a", target: "d" });
			graph.addEdge({ source: "b", target: "c" });
			graph.addEdge({ source: "b", target: "d" });
			graph.addEdge({ source: "c", target: "d" });

			const truss4 = extractKTruss(graph, 4);
			expect(truss4.nodeCount).toBe(4);
			expect(truss4.hasNode("a")).toBe(true);
			expect(truss4.hasNode("b")).toBe(true);
			expect(truss4.hasNode("c")).toBe(true);
			expect(truss4.hasNode("d")).toBe(true);
		});

		it("returns empty graph for 4-truss of triangle", () => {
			// Triangle edges are in only 1 triangle
			// 4-truss needs 2 triangles per edge - triangle doesn't qualify
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "b", target: "c" });
			graph.addEdge({ source: "c", target: "a" });

			const truss4 = extractKTruss(graph, 4);
			expect(truss4.nodeCount).toBe(0);
		});
	});

	describe("edge cases", () => {
		it("throws for k < 2", () => {
			const graph = AdjacencyMapGraph.undirected();
			expect(() => extractKTruss(graph, 1)).toThrow("k must be at least 2");
		});

		it("handles empty graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			const truss = extractKTruss(graph, 3);
			expect(truss.nodeCount).toBe(0);
		});
	});
});
