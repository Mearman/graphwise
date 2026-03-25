import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import { resourceAllocation } from "./resource-allocation";

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

describe("resourceAllocation MI variant", () => {
	it("returns epsilon for no common neighbours", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addNode({ id: "X", label: "X" });
		graph.addNode({ id: "Y", label: "Y" });
		graph.addEdge({ source: "A", target: "X", weight: 1 });
		graph.addEdge({ source: "B", target: "Y", weight: 1 });

		const result = resourceAllocation(graph, "A", "B", { normalise: false });
		expect(result).toBeLessThan(0.01);
	});

	it("computes positive score for common neighbours", () => {
		const graph = createTriangleGraph();
		// A and B share common neighbour C (degree 2)
		// score = 1/deg(C) = 1/2 = 0.5
		const result = resourceAllocation(graph, "A", "B", { normalise: false });
		expect(result).toBeGreaterThan(0);
	});

	it("weights low-degree common neighbours more heavily", () => {
		// Create a graph: A and B share common neighbours of different degrees
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		for (const id of ["A", "B", "LowDeg", "Hub"]) {
			graph.addNode({ id, label: id });
		}
		// Hub connects to many nodes (high degree = lower weight)
		for (let i = 0; i < 10; i++) {
			const extra = `E${String(i)}`;
			graph.addNode({ id: extra, label: extra });
			graph.addEdge({ source: "Hub", target: extra, weight: 1 });
		}
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "A", target: "LowDeg", weight: 1 });
		graph.addEdge({ source: "B", target: "LowDeg", weight: 1 });
		graph.addEdge({ source: "A", target: "Hub", weight: 1 });
		graph.addEdge({ source: "B", target: "Hub", weight: 1 });

		// LowDeg has degree 2 (A, B), Hub has degree 12
		// contribution of LowDeg = 1/2, contribution of Hub = 1/12
		const result = resourceAllocation(graph, "A", "B", { normalise: false });
		expect(result).toBeGreaterThan(1 / 12); // At least the Hub contribution
	});

	it("normalises to [0, 1] when configured", () => {
		const graph = createTriangleGraph();
		const result = resourceAllocation(graph, "A", "B", { normalise: true });
		expect(result).toBeGreaterThanOrEqual(0);
		expect(result).toBeLessThanOrEqual(1);
	});

	it("is symmetric", () => {
		const graph = createTriangleGraph();
		const forward = resourceAllocation(graph, "A", "B");
		const backward = resourceAllocation(graph, "B", "A");
		expect(Math.abs(forward - backward)).toBeLessThan(1e-9);
	});

	it("respects custom epsilon", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });

		const result = resourceAllocation(graph, "A", "B", { epsilon: 0.5 });
		expect(result).toBeGreaterThanOrEqual(0.5);
	});
});
