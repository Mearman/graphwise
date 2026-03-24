/**
 * Tests for ego-network extraction.
 */

import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph/adjacency-map";
import { extractEgoNetwork } from "./ego-network";

describe("extractEgoNetwork", () => {
	describe("undirected graph", () => {
		it("extracts 1-hop neighbourhood", () => {
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

			const ego1 = extractEgoNetwork(graph, "a", { hops: 1 });
			// 1-hop from 'a' = {a, b}
			expect(ego1.nodeCount).toBe(2);
			expect(ego1.edgeCount).toBe(1);
			expect(ego1.hasNode("a")).toBe(true);
			expect(ego1.hasNode("b")).toBe(true);
			expect(ego1.hasNode("c")).toBe(false);
			expect(ego1.hasNode("d")).toBe(false);
		});

		it("extracts 2-hop neighbourhood", () => {
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

			const ego2 = extractEgoNetwork(graph, "a", { hops: 2 });
			// 2-hop from 'a' = {a, b, c}
			expect(ego2.nodeCount).toBe(3);
			expect(ego2.hasNode("a")).toBe(true);
			expect(ego2.hasNode("b")).toBe(true);
			expect(ego2.hasNode("c")).toBe(true);
			expect(ego2.hasNode("d")).toBe(false);
			expect(ego2.hasNode("e")).toBe(false);
		});
	});

	describe("directed graph", () => {
		it("extracts 1-hop neighbourhood (out direction)", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "b", target: "c" });

			const ego1 = extractEgoNetwork(graph, "a", { hops: 1 });
			expect(ego1.nodeCount).toBe(2);
			expect(ego1.hasNode("a")).toBe(true);
			expect(ego1.hasNode("b")).toBe(true);
			expect(ego1.hasNode("c")).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("throws for non-existent centre node", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });

			expect(() =>
				extractEgoNetwork(graph, "nonexistent", { hops: 1 }),
			).toThrow("Centre node 'nonexistent' does not exist in the graph");
		});

		it("throws for negative hops", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });

			expect(() => extractEgoNetwork(graph, "a", { hops: -1 })).toThrow(
				"Hops must be non-negative",
			);
		});
	});
});
