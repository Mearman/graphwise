import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import { cosine } from "./cosine";

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

/**
 * Create a triangle graph: A-B-C-A
 */
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

/**
 * Create a graph where A and B have identical neighbours.
 *       C
 *      / \
 *     A - B
 *      \ /
 *       D
 */
function createIdenticalNeighbourGraph(): AdjacencyMapGraph<
	TestNode,
	TestEdge
> {
	const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
	for (const id of ["A", "B", "C", "D"]) {
		graph.addNode({ id, label: `Node ${id}` });
	}
	graph.addEdge({ source: "A", target: "B", weight: 1 });
	graph.addEdge({ source: "A", target: "C", weight: 1 });
	graph.addEdge({ source: "A", target: "D", weight: 1 });
	graph.addEdge({ source: "B", target: "C", weight: 1 });
	graph.addEdge({ source: "B", target: "D", weight: 1 });
	return graph;
}

describe("cosine MI variant", () => {
	it("returns 0 for nodes with no neighbours (excludes endpoint)", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });

		// After excluding each other, both have empty neighbourhood sets
		const result = cosine(graph, "A", "B");
		expect(result).toBe(0);
	});

	it("returns ~1 for nodes with identical neighbourhoods", () => {
		const graph = createIdenticalNeighbourGraph();
		// After excluding each other: A and B both connect to {C, D}
		// intersection=2, denominator=√2×√2=2, cosine=1.0
		const result = cosine(graph, "A", "B");
		expect(result).toBeCloseTo(1, 9);
	});

	it("returns value in [0, 1] for partial overlap", () => {
		const graph = createTriangleGraph();
		const result = cosine(graph, "A", "B");
		expect(result).toBeGreaterThanOrEqual(0);
		expect(result).toBeLessThanOrEqual(1);
	});

	it("is symmetric", () => {
		const graph = createTriangleGraph();
		const forward = cosine(graph, "A", "B");
		const backward = cosine(graph, "B", "A");
		expect(Math.abs(forward - backward)).toBeLessThan(1e-9);
	});

	it("returns epsilon for no common neighbours", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addNode({ id: "X", label: "X" });
		graph.addNode({ id: "Y", label: "Y" });
		graph.addEdge({ source: "A", target: "X", weight: 1 });
		graph.addEdge({ source: "B", target: "Y", weight: 1 });

		const result = cosine(graph, "A", "B");
		// No common neighbours → score = 0, returns epsilon floor
		expect(result).toBeGreaterThan(0);
		expect(result).toBeLessThan(0.01);
	});

	it("respects custom epsilon", () => {
		// Use a star graph: L1 and L2 share the centre C as a common neighbour.
		// cosine(L1, L2) = 1 (both have only {C} after excluding each other).
		// With epsilon: max(epsilon, 1) = 1 ≥ epsilon.
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "C", label: "Centre" });
		for (let i = 1; i <= 4; i++) {
			graph.addNode({ id: `L${String(i)}`, label: `Leaf ${String(i)}` });
			graph.addEdge({ source: "C", target: `L${String(i)}`, weight: 1 });
		}

		const result = cosine(graph, "L1", "L2", { epsilon: 0.5 });
		expect(result).toBeGreaterThanOrEqual(0.5);
	});
});
