import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import { sorensen } from "./sorensen";

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

describe("sorensen MI variant", () => {
	it("returns 0 when both nodes have empty neighbourhoods", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });

		// After excluding each other, both neighbourhood sets are empty
		const result = sorensen(graph, "A", "B");
		expect(result).toBe(0);
	});

	it("returns 1 for identical neighbourhoods", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		for (const id of ["A", "B", "C", "D"]) {
			graph.addNode({ id, label: `Node ${id}` });
		}
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "A", target: "C", weight: 1 });
		graph.addEdge({ source: "A", target: "D", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });
		graph.addEdge({ source: "B", target: "D", weight: 1 });

		// After excluding each other: both see {C, D}
		const result = sorensen(graph, "A", "B");
		expect(result).toBe(1);
	});

	it("returns value in [0, 1] for partial overlap", () => {
		const graph = createTriangleGraph();
		const result = sorensen(graph, "A", "B");
		expect(result).toBeGreaterThanOrEqual(0);
		expect(result).toBeLessThanOrEqual(1);
	});

	it("is symmetric", () => {
		const graph = createTriangleGraph();
		const forward = sorensen(graph, "A", "B");
		const backward = sorensen(graph, "B", "A");
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

		const result = sorensen(graph, "A", "B");
		expect(result).toBeGreaterThan(0);
		expect(result).toBeLessThan(0.01);
	});

	it("respects custom epsilon", () => {
		// Use a star graph: L1 and L2 share the centre C as a common neighbour.
		// Both have {C} as neighbourhood after excluding each other.
		// sorensen = 2*1/(1+1) = 1 ≥ 0.3.
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "C", label: "Centre" });
		for (let i = 1; i <= 4; i++) {
			graph.addNode({ id: `L${String(i)}`, label: `Leaf ${String(i)}` });
			graph.addEdge({ source: "C", target: `L${String(i)}`, weight: 1 });
		}

		const result = sorensen(graph, "L1", "L2", { epsilon: 0.3 });
		expect(result).toBeGreaterThanOrEqual(0.3);
	});

	it("computes formula correctly: 2*|intersection| / (|N(u)| + |N(v)|)", () => {
		const graph = createTriangleGraph();
		// A: neighbours excl B = {C}; B: neighbours excl A = {C}
		// intersection = 1, |N(A)| = 1, |N(B)| = 1
		// sorensen = 2*1 / (1+1) = 1
		const result = sorensen(graph, "A", "B");
		expect(result).toBeCloseTo(1, 9);
	});
});
