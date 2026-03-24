/**
 * Tests for filtered subgraph extraction.
 */

import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph/adjacency-map";
import { filterSubgraph } from "./node-filter";

describe("filterSubgraph", () => {
	describe("node predicate", () => {
		it("filters nodes by predicate", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a", weight: 1 });
			graph.addNode({ id: "b", weight: 2 });
			graph.addNode({ id: "c", weight: 3 });
			graph.addEdge({ source: "a", target: "b" });
			graph.addEdge({ source: "b", target: "c" });

			const filtered = filterSubgraph(graph, {
				nodePredicate: (node) => (node.weight ?? 0) > 0.5,
			});

			expect(filtered.nodeCount).toBe(3);
			expect(filtered.hasNode("a")).toBe(true);
			expect(filtered.hasNode("b")).toBe(true);
			expect(filtered.hasNode("c")).toBe(true);
		});

		it("removes isolated nodes when requested", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" }); // Isolated node - no edges
			graph.addEdge({ source: "a", target: "b" });

			const filtered = filterSubgraph(graph, {
				nodePredicate: () => true,
				removeIsolated: true,
			});

			// c is isolated (no edges), so it should be removed
			expect(filtered.nodeCount).toBe(2);
			expect(filtered.hasNode("a")).toBe(true);
			expect(filtered.hasNode("b")).toBe(true);
			expect(filtered.hasNode("c")).toBe(false);
		});
	});

	describe("edge predicate", () => {
		it("filters edges by predicate", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addEdge({ source: "a", target: "b", weight: 2 }); // Passes predicate
			graph.addEdge({ source: "b", target: "c", weight: 1 }); // Fails predicate

			const filtered = filterSubgraph(graph, {
				edgePredicate: (edge) => (edge.weight ?? 0) > 1,
			});

			expect(filtered.edgeCount).toBe(1);
			expect(filtered.getEdge("a", "b")).toBeDefined();
			expect(filtered.getEdge("b", "c")).toBeUndefined();
		});

		it("removes isolated nodes after edge filtering", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			graph.addNode({ id: "b" });
			graph.addNode({ id: "c" });
			graph.addNode({ id: "d" });
			graph.addEdge({ source: "a", target: "b", weight: 2 }); // Passes predicate
			graph.addEdge({ source: "c", target: "d", weight: 1 }); // Fails predicate

			const filtered = filterSubgraph(graph, {
				edgePredicate: (edge) => (edge.weight ?? 0) > 1,
				removeIsolated: true,
			});

			// Only a-b edge passes, c and d become isolated
			expect(filtered.nodeCount).toBe(2);
			expect(filtered.hasNode("a")).toBe(true);
			expect(filtered.hasNode("b")).toBe(true);
			expect(filtered.hasNode("c")).toBe(false);
			expect(filtered.hasNode("d")).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("returns empty graph for empty input", () => {
			const graph = AdjacencyMapGraph.undirected();
			const filtered = filterSubgraph(graph);
			expect(filtered.nodeCount).toBe(0);
		});

		it("handles empty options", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "a" });
			const filtered = filterSubgraph(graph, {});
			expect(filtered.nodeCount).toBe(1);
		});
	});
});
