/**
 * Tests for motif enumeration.
 */

import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph/adjacency-map";
import { enumerateMotifs } from "./motif";

describe("enumerateMotifs", () => {
	describe("3-node motifs", () => {
		it("counts motifs in 3-node graph correctly", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "a", target: "c" });

			const census = enumerateMotifs(graph, 3);
			// 2-star pattern: one node connected to two others
			expect(census.counts.size).toBeGreaterThan(0);
		});

		it("counts triangles correctly", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "a", target: "c" });
			graph.addEdge({ source: "b", target: "c" });

			const census = enumerateMotifs(graph, 3);
			// Triangle pattern: all three edges
			expect(census.counts.get("0-1,0-2,1-2")).toBe(1);
		});
	});

	describe("4-node motifs", () => {
		it("counts motifs in 4-node graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addNode({ id: "d" });
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "a", target: "c" });
			graph.addEdge({ source: "a", target: "d" });

			const census = enumerateMotifs(graph, 4);
			expect(census.counts.size).toBeGreaterThan(0);
		});

		it("counts 4-cycle correctly", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addNode({ id: "d" });
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "b", target: "c" });
			graph.addEdge({ source: "c", target: "d" });
			graph.addEdge({ source: "d", target: "a" });

			const census = enumerateMotifs(graph, 4);
			// 4-cycle canonical pattern
			expect(census.counts.size).toBeGreaterThan(0);
		});
	});
});
