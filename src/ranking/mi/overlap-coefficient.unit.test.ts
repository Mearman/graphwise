import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import { overlapCoefficient } from "./overlap-coefficient";

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

describe("overlapCoefficient MI variant", () => {
	it("returns 0 when minimum neighbourhood size is 0", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });

		// After excluding each other, both neighbourhood sets are empty
		const result = overlapCoefficient(graph, "A", "B");
		expect(result).toBe(0);
	});

	it("returns 1 when one neighbourhood is a subset of the other", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		for (const id of ["A", "B", "C", "D"]) {
			graph.addNode({ id, label: `Node ${id}` });
		}
		// A connects to C, D; B connects to C, D, and more
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "A", target: "C", weight: 1 });
		graph.addEdge({ source: "A", target: "D", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });
		graph.addEdge({ source: "B", target: "D", weight: 1 });

		// After excluding each other: A sees {C,D}, B sees {C,D}
		// min = 2, intersection = 2 → score = 1
		const result = overlapCoefficient(graph, "A", "B");
		expect(result).toBe(1);
	});

	it("returns value in [0, 1] for partial overlap", () => {
		const graph = createTriangleGraph();
		const result = overlapCoefficient(graph, "A", "B");
		expect(result).toBeGreaterThanOrEqual(0);
		expect(result).toBeLessThanOrEqual(1);
	});

	it("is symmetric", () => {
		const graph = createTriangleGraph();
		const forward = overlapCoefficient(graph, "A", "B");
		const backward = overlapCoefficient(graph, "B", "A");
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

		const result = overlapCoefficient(graph, "A", "B");
		expect(result).toBeGreaterThan(0);
		expect(result).toBeLessThan(0.01);
	});

	it("respects custom epsilon", () => {
		// Use a star graph: L1 and L2 share the centre C as a common neighbour.
		// Both have {C} as neighbourhood after excluding each other.
		// min(|N(L1)|, |N(L2)|) = 1, intersection = 1 → score = 1 ≥ 0.2.
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "C", label: "Centre" });
		for (let i = 1; i <= 4; i++) {
			graph.addNode({ id: `L${String(i)}`, label: `Leaf ${String(i)}` });
			graph.addEdge({ source: "C", target: `L${String(i)}`, weight: 1 });
		}

		const result = overlapCoefficient(graph, "L1", "L2", { epsilon: 0.2 });
		expect(result).toBeGreaterThanOrEqual(0.2);
	});
});
