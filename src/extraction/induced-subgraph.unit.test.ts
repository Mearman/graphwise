/**
 * Tests for induced subgraph extraction.
 */

import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph/adjacency-map";
import { extractInducedSubgraph } from "./induced-subgraph";

describe("extractInducedSubgraph", () => {
	it("extracts basic subgraph with all nodes", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a" });
		graph.addNode({ id: "b" });
		graph.addNode({ id: "c" });
		graph.addEdge({ source: "a", target: "b" });
		graph.addEdge({ source: "b", target: "c" });

		const subgraph = extractInducedSubgraph(graph, new Set(["a", "b", "c"]));

		expect(subgraph.nodeCount).toBe(3);
		expect(subgraph.edgeCount).toBe(2);
		expect(subgraph.hasNode("a")).toBe(true);
		expect(subgraph.hasNode("b")).toBe(true);
		expect(subgraph.hasNode("c")).toBe(true);
	});

	it("handles missing nodes in set", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a" });
		graph.addNode({ id: "b" });
		graph.addNode({ id: "c" });

		// Only include 'a' and 'b', which exist in the graph
		const subgraph = extractInducedSubgraph(graph, new Set(["a", "b"]));
		expect(subgraph.nodeCount).toBe(2);
		expect(subgraph.hasNode("a")).toBe(true);
		expect(subgraph.hasNode("b")).toBe(true);
		// 'c' was not in the set
		expect(subgraph.hasNode("c")).toBe(false);
	});

	it("handles empty graph", () => {
		const graph = AdjacencyMapGraph.undirected();
		const subgraph = extractInducedSubgraph(graph, new Set());
		expect(subgraph.nodeCount).toBe(0);
	});

	it("filters edges correctly", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a" });
		graph.addNode({ id: "b" });
		graph.addNode({ id: "c" });
		graph.addEdge({ source: "a", target: "b" });
		graph.addEdge({ source: "b", target: "c" });
		graph.addEdge({ source: "a", target: "c" });

		// Request subgraph with only nodes a and b
		const subgraph = extractInducedSubgraph(graph, new Set(["a", "b"]));
		expect(subgraph.nodeCount).toBe(2);
		expect(subgraph.edgeCount).toBe(1); // Only edge a-b
		expect(subgraph.getEdge("a", "b")).toBeDefined();
		expect(subgraph.getEdge("a", "c")).toBeUndefined();
		expect(subgraph.getEdge("b", "c")).toBeUndefined();
	});
});
