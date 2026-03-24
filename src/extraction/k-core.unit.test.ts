/**
 * Tests for k-core decomposition.
 */

import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph/adjacency-map";
import { extractKCore } from "./k-core";

describe("extractKCore", () => {
	describe("undirected graph", () => {
		it("extracts 3-core from simple graph", () => {
			// Create K4 (complete graph on 4 nodes) - all nodes have degree 3
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addNode({ id: "d" });
			// Complete graph K4: every node connected to every other
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "a", target: "c" });
			graph.addEdge({ source: "a", target: "d" });
			graph.addEdge({ source: "b", target: "c" });
			graph.addEdge({ source: "b", target: "d" });
			graph.addEdge({ source: "c", target: "d" });

			// 3-core: nodes with degree >= 3 (all 4 nodes in K4)
			const core3 = extractKCore(graph, 3);
			expect(core3.nodeCount).toBe(4);
			expect(core3.hasNode("a")).toBe(true);
			expect(core3.hasNode("b")).toBe(true);
			expect(core3.hasNode("c")).toBe(true);
			expect(core3.hasNode("d")).toBe(true);
		});

		it("extracts 2-core from simple graph", () => {
			// Create a triangle (3-cycle) - all nodes have degree 2
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "b", target: "c" });
			graph.addEdge({ source: "c", target: "a" });

			// 2-core: nodes with degree >= 2 (all 3 nodes in triangle)
			const core2 = extractKCore(graph, 2);
			expect(core2.nodeCount).toBe(3);
			expect(core2.hasNode("a")).toBe(true);
			expect(core2.hasNode("b")).toBe(true);
			expect(core2.hasNode("c")).toBe(true);
		});

		it("extracts 1-core from simple graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "b", target: "c" });

			// 1-core: nodes with degree >= 1
			const core1 = extractKCore(graph, 1);
			expect(core1.nodeCount).toBe(3);
		});

		it("returns empty graph for k > max degree", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addNode({ id: "d" });
			graph.addNode({ id: "e" });
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "b", target: "c" });
			graph.addEdge({ source: "c", target: "d" });
			graph.addEdge({ source: "d", target: "e" });

			// 6-core: needs degree >= 6 (impossible in this graph)
			const core6 = extractKCore(graph, 6);
			expect(core6.nodeCount).toBe(0);
		});

		it("throws for invalid k", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });

			expect(() => extractKCore(graph, -1)).toThrow("k must be non-negative");
		});
	});
});
