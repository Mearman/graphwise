import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import { hubPromoted } from "./hub-promoted";

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

function createTriangleGraph(): AdjacencyMapGraph<TestNode, TestEdge> {
	const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
	graph.addNode({ id: "A", label: "Node A" });
	graph.addNode({ id: "B", label: "Node B" });
	graph.addNode({ id: "C", label: "Node C" });
	graph.addEdge({ source: "A", target: "B", weight: 1 });
	graph.addEdge({ source: "B", target: "C", weight: 1 });
	graph.addEdge({ source: "C", target: "A", weight: 1 });
	return graph;
}

describe("hubPromoted MI variant", () => {
	it("returns 0 when minimum degree is 0", () => {
		// Isolated nodes have degree 0 — but we can't have an edge between them
		// An isolated node connected only to its counterpart: degree 1 after adding edge
		// Actually, to get degree 0, source/target must have no edges
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		// No edge added — degree(A) = 0, degree(B) = 0 → denominator = 0
		const result = hubPromoted(graph, "A", "B");
		expect(result).toBe(0);
	});

	it("returns value in [0, 1]", () => {
		const graph = createTriangleGraph();
		const result = hubPromoted(graph, "A", "B");
		expect(result).toBeGreaterThanOrEqual(0);
		expect(result).toBeLessThanOrEqual(1);
	});

	it("is symmetric", () => {
		const graph = createTriangleGraph();
		const forward = hubPromoted(graph, "A", "B");
		const backward = hubPromoted(graph, "B", "A");
		expect(Math.abs(forward - backward)).toBeLessThan(1e-9);
	});

	it("uses actual degree not neighbourhood set size", () => {
		// A connects to B and C; B connects to A, C, and a hub
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		for (const id of ["A", "B", "C", "Hub"]) {
			graph.addNode({ id, label: id });
		}
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "A", target: "C", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });
		graph.addEdge({ source: "B", target: "Hub", weight: 1 });

		// deg(A) = 2, deg(B) = 3
		// min(deg(A), deg(B)) = 2
		// intersection (excl each other) = {C}; |intersection| = 1
		// score = 1/2 = 0.5
		const result = hubPromoted(graph, "A", "B");
		expect(result).toBeCloseTo(0.5, 5);
	});

	it("returns epsilon for no common neighbours", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addNode({ id: "X", label: "X" });
		graph.addNode({ id: "Y", label: "Y" });
		graph.addEdge({ source: "A", target: "X", weight: 1 });
		graph.addEdge({ source: "B", target: "Y", weight: 1 });

		const result = hubPromoted(graph, "A", "B");
		expect(result).toBeGreaterThan(0);
		expect(result).toBeLessThan(0.01);
	});

	it("respects custom epsilon", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });

		const result = hubPromoted(graph, "A", "B", { epsilon: 0.4 });
		expect(result).toBeGreaterThanOrEqual(0.4);
	});
});
