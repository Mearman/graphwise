/**
 * Unit tests for neighbourhood utilities.
 */

import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import {
	neighbourSet,
	neighbourOverlap,
	neighbourIntersection,
	countEdgesOfType,
	countNodesOfType,
} from "./neighbours";

describe("neighbourSet", () => {
	it("should return all neighbours of a node", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a" });
		graph.addNode({ id: "b" });
		graph.addNode({ id: "c" });
		graph.addNode({ id: "d" });
		graph.addEdge({ source: "a", target: "b" });
		graph.addEdge({ source: "a", target: "c" });
		graph.addEdge({ source: "a", target: "d" });

		const neighbours = neighbourSet(graph, "a");
		expect(neighbours).toEqual(new Set(["b", "c", "d"]));
	});

	it("should exclude a specified node from the result", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a" });
		graph.addNode({ id: "b" });
		graph.addNode({ id: "c" });
		graph.addEdge({ source: "a", target: "b" });
		graph.addEdge({ source: "a", target: "c" });

		const neighbours = neighbourSet(graph, "a", "b");
		expect(neighbours).toEqual(new Set(["c"]));
	});

	it("should return empty set for isolated node", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a" });

		const neighbours = neighbourSet(graph, "a");
		expect(neighbours.size).toBe(0);
	});

	it("should handle undefined exclude gracefully", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a" });
		graph.addNode({ id: "b" });
		graph.addEdge({ source: "a", target: "b" });

		const neighbours = neighbourSet(graph, "a", undefined);
		expect(neighbours).toEqual(new Set(["b"]));
	});
});

describe("neighbourOverlap", () => {
	it("should compute intersection and union correctly", () => {
		const a = new Set(["x", "y", "z"]);
		const b = new Set(["y", "z", "w"]);

		const { intersection, union } = neighbourOverlap(a, b);
		expect(intersection).toBe(2); // y, z
		expect(union).toBe(4); // x, y, z, w
	});

	it("should handle disjoint sets", () => {
		const a = new Set(["a", "b"]);
		const b = new Set(["c", "d"]);

		const { intersection, union } = neighbourOverlap(a, b);
		expect(intersection).toBe(0);
		expect(union).toBe(4);
	});

	it("should handle one set being a subset of another", () => {
		const a = new Set(["a", "b", "c"]);
		const b = new Set(["b", "c"]);

		const { intersection, union } = neighbourOverlap(a, b);
		expect(intersection).toBe(2); // b, c
		expect(union).toBe(3); // a, b, c
	});

	it("should handle identical sets", () => {
		const a = new Set(["x", "y", "z"]);
		const b = new Set(["x", "y", "z"]);

		const { intersection, union } = neighbourOverlap(a, b);
		expect(intersection).toBe(3);
		expect(union).toBe(3);
	});

	it("should handle empty sets", () => {
		const a = new Set<string>();
		const b = new Set<string>();

		const { intersection, union } = neighbourOverlap(a, b);
		expect(intersection).toBe(0);
		expect(union).toBe(0);
	});

	it("should handle one empty set", () => {
		const a = new Set(["x", "y"]);
		const b = new Set<string>();

		const { intersection, union } = neighbourOverlap(a, b);
		expect(intersection).toBe(0);
		expect(union).toBe(2);
	});
});

describe("neighbourIntersection", () => {
	it("should return the intersection set", () => {
		const a = new Set(["x", "y", "z"]);
		const b = new Set(["y", "z", "w"]);

		const intersection = neighbourIntersection(a, b);
		expect(intersection).toEqual(new Set(["y", "z"]));
	});

	it("should return empty set for disjoint sets", () => {
		const a = new Set(["a", "b"]);
		const b = new Set(["c", "d"]);

		const intersection = neighbourIntersection(a, b);
		expect(intersection.size).toBe(0);
	});

	it("should handle identical sets", () => {
		const a = new Set(["x", "y", "z"]);
		const b = new Set(["x", "y", "z"]);

		const intersection = neighbourIntersection(a, b);
		expect(intersection).toEqual(new Set(["x", "y", "z"]));
	});

	it("should handle empty sets", () => {
		const a = new Set<string>();
		const b = new Set<string>();

		const intersection = neighbourIntersection(a, b);
		expect(intersection.size).toBe(0);
	});
});

describe("countEdgesOfType", () => {
	it("should count edges of a specific type", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a" });
		graph.addNode({ id: "b" });
		graph.addNode({ id: "c" });
		graph.addEdge({ source: "a", target: "b", type: "citation" });
		graph.addEdge({ source: "b", target: "c", type: "citation" });
		graph.addEdge({ source: "a", target: "c", type: "reference" });

		const count = countEdgesOfType(graph, "citation");
		expect(count).toBe(2);
	});

	it("should return 0 for non-existent type", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a" });
		graph.addNode({ id: "b" });
		graph.addEdge({ source: "a", target: "b", type: "citation" });

		const count = countEdgesOfType(graph, "unknown");
		expect(count).toBe(0);
	});

	it("should handle edges without type", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a" });
		graph.addNode({ id: "b" });
		graph.addEdge({ source: "a", target: "b" }); // no type

		const count = countEdgesOfType(graph, "citation");
		expect(count).toBe(0);
	});

	it("should handle empty graph", () => {
		const graph = AdjacencyMapGraph.undirected();

		const count = countEdgesOfType(graph, "citation");
		expect(count).toBe(0);
	});
});

describe("countNodesOfType", () => {
	it("should count nodes of a specific type", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a", type: "author" });
		graph.addNode({ id: "b", type: "author" });
		graph.addNode({ id: "c", type: "work" });

		const count = countNodesOfType(graph, "author");
		expect(count).toBe(2);
	});

	it("should return 0 for non-existent type", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a", type: "author" });
		graph.addNode({ id: "b", type: "author" });

		const count = countNodesOfType(graph, "unknown");
		expect(count).toBe(0);
	});

	it("should handle nodes without type", () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "a" }); // no type
		graph.addNode({ id: "b", type: "author" });

		const count = countNodesOfType(graph, "author");
		expect(count).toBe(1);
	});

	it("should handle empty graph", () => {
		const graph = AdjacencyMapGraph.undirected();

		const count = countNodesOfType(graph, "author");
		expect(count).toBe(0);
	});
});
