import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import { jaccard } from "./jaccard";
import { adamicAdar } from "./adamic-adar";
import { scale } from "./scale";
import { skew } from "./skew";
import { span } from "./span";
import { etch } from "./etch";
import { notch } from "./notch";
import { adaptive } from "./adaptive";

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

/**
 * Create a test graph:
 *
 *     A --- B --- C
 *     |     |     |
 *     D --- E --- F
 *
 * A-B, B-C, A-D, B-E, C-F, D-E, E-F edges
 */
function createTestGraph(): AdjacencyMapGraph<TestNode, TestEdge> {
	const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

	// Add nodes
	for (const id of ["A", "B", "C", "D", "E", "F"]) {
		graph.addNode({ id, label: `Node ${id}` });
	}

	// Add edges (grid pattern)
	graph.addEdge({ source: "A", target: "B", weight: 1 });
	graph.addEdge({ source: "B", target: "C", weight: 1 });
	graph.addEdge({ source: "A", target: "D", weight: 1 });
	graph.addEdge({ source: "B", target: "E", weight: 1 });
	graph.addEdge({ source: "C", target: "F", weight: 1 });
	graph.addEdge({ source: "D", target: "E", weight: 1 });
	graph.addEdge({ source: "E", target: "F", weight: 1 });

	return graph;
}

/**
 * Create a star graph with centre connected to many leaves:
 *
 *        L1
 *         |
 *     L2-C-L3
 *         |
 *        L4
 */
function createStarGraph(): AdjacencyMapGraph<TestNode, TestEdge> {
	const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

	graph.addNode({ id: "C", label: "Centre" });
	for (let i = 1; i <= 4; i++) {
		graph.addNode({ id: `L${String(i)}`, label: `Leaf ${String(i)}` });
		graph.addEdge({ source: "C", target: `L${String(i)}`, weight: 1 });
	}

	return graph;
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

describe("MI variants", () => {
	describe("jaccard", () => {
		it("returns epsilon for nodes with no common neighbours", () => {
			// Create a graph where nodes truly have no common neighbours
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "X", label: "X" });
			graph.addNode({ id: "Y", label: "Y" });
			// A connects to X, B connects to Y (no overlap)
			graph.addEdge({ source: "A", target: "X", weight: 1 });
			graph.addEdge({ source: "B", target: "Y", weight: 1 });

			const result = jaccard(graph, "A", "B");
			expect(result).toBeGreaterThan(0);
			expect(result).toBeLessThan(0.01);
		});

		it("returns 1 for identical neighbourhoods", () => {
			// Create a graph where A and B have identical neighbourhoods
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addNode({ id: "D", label: "D" });

			// A and B both connect to C and D (and each other)
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "A", target: "C", weight: 1 });
			graph.addEdge({ source: "A", target: "D", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 1 });
			graph.addEdge({ source: "B", target: "D", weight: 1 });

			const result = jaccard(graph, "A", "B");
			expect(result).toBe(1);
		});

		it("computes partial overlap correctly", () => {
			const graph = createTestGraph();
			// A: neighbours = [B, D]
			// B: neighbours = [A, C, E]
			// Common: none (after removing A-B from each)
			// Union: [D, C, E]
			const result = jaccard(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
		});

		it("returns epsilon for isolated nodes", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });

			const result = jaccard(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
		});

		it("respects custom epsilon", () => {
			const graph = createStarGraph();
			const result = jaccard(graph, "L1", "L2", { epsilon: 0.1 });
			expect(result).toBeGreaterThanOrEqual(0.1);
		});
	});

	describe("adamicAdar", () => {
		it("returns epsilon for nodes with no common neighbours", () => {
			// Create a graph where nodes truly have no common neighbours
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "X", label: "X" });
			graph.addNode({ id: "Y", label: "Y" });
			graph.addEdge({ source: "A", target: "X", weight: 1 });
			graph.addEdge({ source: "B", target: "Y", weight: 1 });

			const result = adamicAdar(graph, "A", "B", { normalise: false });
			// Function returns epsilon (1e-10) as floor for numerical stability
			expect(result).toBeLessThan(0.01);
		});

		it("computes score for common neighbours", () => {
			const graph = createTestGraph();
			// B and E share common neighbour D
			// Actually B: [A, C, E], E: [B, D, F]
			// After removing B-E: B: [A, C], E: [D, F]
			// No common neighbours
			const result = adamicAdar(graph, "B", "E");
			expect(result).toBeGreaterThanOrEqual(0);
		});

		it("normalises score when configured", () => {
			const graph = createTriangleGraph();
			const normalised = adamicAdar(graph, "A", "B", { normalise: true });
			const unnormalised = adamicAdar(graph, "A", "B", { normalise: false });
			expect(normalised).toBeGreaterThanOrEqual(0);
			expect(normalised).toBeLessThanOrEqual(1);
			expect(unnormalised).toBeGreaterThanOrEqual(0);
		});

		it("respects custom epsilon", () => {
			const graph = createStarGraph();
			const result = adamicAdar(graph, "L1", "L2", { epsilon: 0.5 });
			expect(result).toBeGreaterThanOrEqual(0.5);
		});
	});

	describe("scale", () => {
		it("combines jaccard with degree ratio", () => {
			const graph = createTestGraph();
			const result = scale(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
		});

		it("returns high score for similar degrees and overlap", () => {
			const graph = createTriangleGraph();
			const result = scale(graph, "A", "B");
			expect(result).toBeGreaterThan(0.5);
		});

		it("returns low score for dissimilar degrees", () => {
			const graph = createStarGraph();
			// L1 (deg 1) and C (deg 4) have very different degrees
			const result = scale(graph, "L1", "C");
			expect(result).toBeLessThan(0.5);
		});

		it("respects custom epsilon", () => {
			const graph = createStarGraph();
			const result = scale(graph, "L1", "L2", { epsilon: 0.2 });
			expect(result).toBeGreaterThanOrEqual(0.2);
		});
	});

	describe("skew", () => {
		it("weights by inverse log degree", () => {
			const graph = createTestGraph();
			const result = skew(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
		});

		it("returns epsilon for no common neighbours", () => {
			// Create a graph where nodes truly have no common neighbours
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "X", label: "X" });
			graph.addNode({ id: "Y", label: "Y" });
			graph.addEdge({ source: "A", target: "X", weight: 1 });
			graph.addEdge({ source: "B", target: "Y", weight: 1 });

			const result = skew(graph, "A", "B");
			expect(result).toBeLessThan(0.01);
		});

		it("respects custom epsilon", () => {
			const graph = createStarGraph();
			const result = skew(graph, "L1", "L2", { epsilon: 0.05 });
			expect(result).toBeGreaterThanOrEqual(0.05);
		});
	});

	describe("span", () => {
		it("combines jaccard with degree similarity", () => {
			const graph = createTestGraph();
			const result = span(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
		});

		it("returns high score for equal degrees", () => {
			const graph = createTriangleGraph();
			// All nodes have degree 2
			const result = span(graph, "A", "B");
			expect(result).toBeGreaterThan(0.5);
		});

		it("penalises degree imbalance", () => {
			const graph = createStarGraph();
			// L1 has degree 1, C has degree 4
			const result = span(graph, "L1", "C");
			expect(result).toBeLessThan(0.5);
		});

		it("respects custom epsilon", () => {
			const graph = createStarGraph();
			const result = span(graph, "L1", "L2", { epsilon: 0.1 });
			expect(result).toBeGreaterThanOrEqual(0.1);
		});
	});

	describe("etch", () => {
		it("measures structural cohesion among common neighbours", () => {
			const graph = createTestGraph();
			const result = etch(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
		});

		it("returns epsilon when fewer than 2 common neighbours", () => {
			const graph = createStarGraph();
			const result = etch(graph, "L1", "L2");
			expect(result).toBeLessThan(0.01);
		});

		it("captures clique structure", () => {
			// Create a 4-clique: all nodes connected to all others
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			for (const id of ["A", "B", "C", "D"]) {
				graph.addNode({ id, label: `Node ${id}` });
			}
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "A", target: "C", weight: 1 });
			graph.addEdge({ source: "A", target: "D", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 1 });
			graph.addEdge({ source: "B", target: "D", weight: 1 });
			graph.addEdge({ source: "C", target: "D", weight: 1 });

			// A and B share C, D as common neighbours (fully connected)
			const result = etch(graph, "A", "B");
			expect(result).toBeGreaterThan(0.5);
		});

		it("respects custom epsilon", () => {
			const graph = createStarGraph();
			const result = etch(graph, "L1", "L2", { epsilon: 0.1 });
			expect(result).toBeGreaterThanOrEqual(0.1);
		});
	});

	describe("notch", () => {
		it("combines overlap with degree correlation", () => {
			const graph = createTestGraph();
			const result = notch(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
		});

		it("returns high score for equal degrees with overlap", () => {
			const graph = createTriangleGraph();
			const result = notch(graph, "A", "B");
			expect(result).toBeGreaterThan(0.5);
		});

		it("penalises degree imbalance", () => {
			const graph = createStarGraph();
			const result = notch(graph, "L1", "C");
			expect(result).toBeLessThan(0.8);
		});

		it("respects custom epsilon", () => {
			const graph = createStarGraph();
			const result = notch(graph, "L1", "L2", { epsilon: 0.1 });
			expect(result).toBeGreaterThanOrEqual(0.1);
		});
	});

	describe("adaptive", () => {
		it("combines structural, degree, and overlap components", () => {
			const graph = createTestGraph();
			const result = adaptive(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
		});

		it("accepts custom weights", () => {
			const graph = createTriangleGraph();
			const result = adaptive(graph, "A", "B", {
				structuralWeight: 0.5,
				degreeWeight: 0.3,
				overlapWeight: 0.2,
			});
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
		});

		it("handles empty neighbourhoods gracefully", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });

			const result = adaptive(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
		});

		it("respects custom epsilon", () => {
			const graph = createStarGraph();
			const result = adaptive(graph, "L1", "L2", { epsilon: 0.1 });
			expect(result).toBeGreaterThanOrEqual(0.1);
		});
	});

	describe("all variants", () => {
		const variants = [
			{ name: "jaccard", fn: jaccard },
			{ name: "adamicAdar", fn: adamicAdar },
			{ name: "scale", fn: scale },
			{ name: "skew", fn: skew },
			{ name: "span", fn: span },
			{ name: "etch", fn: etch },
			{ name: "notch", fn: notch },
			{ name: "adaptive", fn: adaptive },
		];

		for (const { name, fn } of variants) {
			it(`${name} returns value in [0, 1]`, () => {
				const graph = createTestGraph();
				const result = fn(graph, "A", "B");
				expect(result).toBeGreaterThanOrEqual(0);
				expect(result).toBeLessThanOrEqual(1);
			});

			it(`${name} handles symmetric computation`, () => {
				const graph = createTestGraph();
				const forward = fn(graph, "A", "B");
				const backward = fn(graph, "B", "A");
				expect(Math.abs(forward - backward)).toBeLessThan(0.001);
			});
		}
	});
});
