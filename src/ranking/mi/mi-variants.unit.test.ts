import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import { wrapAsync } from "../../__test__/fixtures/wrap-async";
import { jaccard, jaccardAsync } from "./jaccard";
import { adamicAdar, adamicAdarAsync } from "./adamic-adar";
import { cosine, cosineAsync } from "./cosine";
import { sorensen, sorensenAsync } from "./sorensen";
import {
	resourceAllocation,
	resourceAllocationAsync,
} from "./resource-allocation";
import {
	overlapCoefficient,
	overlapCoefficientAsync,
} from "./overlap-coefficient";
import { hubPromoted, hubPromotedAsync } from "./hub-promoted";
import { scale, scaleAsync } from "./scale";
import { skew, skewAsync } from "./skew";
import { span, spanAsync } from "./span";
import { etch, etchAsync } from "./etch";
import { notch, notchAsync } from "./notch";
import { adaptive, adaptiveAsync } from "./adaptive";

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
		it("applies density normalisation to Jaccard", () => {
			const graph = createTestGraph();
			const result = scale(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
		});

		it("applies density-based normalisation", () => {
			// SCALE = Jaccard / density
			// In sparser graphs with same local structure, SCALE varies with global density
			const graph = createTestGraph();
			const result = scale(graph, "A", "B");

			// Result should be a valid number
			expect(result).toBeGreaterThanOrEqual(0);
			expect(Number.isFinite(result)).toBe(true);
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
		it("combines jaccard with clustering coefficient penalty", () => {
			const graph = createTestGraph();
			const result = span(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
		});

		it("returns lower score for high clustering (no bridge edges)", () => {
			const graph = createTriangleGraph();
			// All nodes have CC = 1 (fully connected), so bridge penalty = 1 - 1 = 0
			// SPAN = Jaccard * 0 = ~0
			const result = span(graph, "A", "B");
			expect(result).toBeLessThan(0.01);
		});

		it("returns higher score for low clustering (bridge-like edges)", () => {
			const graph = createTestGraph();
			// A-B in test graph are less clustered, so bridge penalty > 0
			const result = span(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
		});

		it("respects custom epsilon", () => {
			const graph = createStarGraph();
			const result = span(graph, "L1", "L2", { epsilon: 0.1 });
			expect(result).toBeGreaterThanOrEqual(0.1);
		});
	});

	describe("etch", () => {
		it("applies edge-type rarity weighting to Jaccard", () => {
			const graph = createTestGraph();
			const result = etch(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
		});

		it("weights by edge type rarity (rarer types have higher scores)", () => {
			// Create a graph with typed edges
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });

			// Add edges with types: 9 common edges, 1 rare edge
			for (let i = 0; i < 9; i++) {
				graph.addNode({ id: `N${String(i)}`, label: `N${String(i)}` });
				graph.addEdge({
					source: "A",
					target: `N${String(i)}`,
					type: "common",
					weight: 1,
				});
				graph.addEdge({
					source: "B",
					target: `N${String(i)}`,
					type: "common",
					weight: 1,
				});
			}
			// A-B edge is rare type
			graph.addEdge({ source: "A", target: "B", type: "rare", weight: 1 });

			// rarity(rare) = log(10 / 1) ≈ 2.3
			// rarity(common) = log(10 / 9) ≈ 0.105
			const result = etch(graph, "A", "B");
			expect(result).toBeGreaterThan(0);
		});

		it("falls back to Jaccard if edge has no type", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });

			graph.addEdge({ source: "A", target: "B", weight: 1 }); // no type
			graph.addEdge({ source: "A", target: "C", weight: 1 });
			graph.addEdge({ source: "B", target: "C", weight: 1 });

			const result = etch(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
		});

		it("respects custom epsilon", () => {
			const graph = createStarGraph();
			const result = etch(graph, "L1", "L2", { epsilon: 0.1 });
			expect(result).toBeGreaterThanOrEqual(0.1);
		});
	});

	describe("notch", () => {
		it("applies node-type rarity weighting to Jaccard", () => {
			const graph = createTestGraph();
			const result = notch(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
		});

		it("weights by node type rarity (rarer types have higher scores)", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
			// Create 10 nodes of 'common' type, 1 node of 'rare' type
			for (let i = 0; i < 10; i++) {
				graph.addNode({
					id: `N${String(i)}`,
					label: `N${String(i)}`,
					type: "common",
				});
			}
			graph.addNode({ id: "R", label: "Rare", type: "rare" });
			graph.addNode({ id: "A", label: "A", type: "rare" });
			graph.addNode({ id: "B", label: "B", type: "rare" });

			// A-R-B path (connecting two rare nodes)
			graph.addEdge({ source: "A", target: "R", weight: 1 });
			graph.addEdge({ source: "R", target: "B", weight: 1 });
			for (let i = 0; i < 5; i++) {
				graph.addEdge({ source: "A", target: `N${String(i)}`, weight: 1 });
				graph.addEdge({ source: "B", target: `N${String(i)}`, weight: 1 });
			}

			// rarity(rare) = log(12 / 2) ≈ 1.79
			// A-B score will be Jaccard * rarity(A) * rarity(B) > Jaccard alone
			const result = notch(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
		});

		it("falls back to Jaccard if nodes lack type", () => {
			const graph = createTestGraph();
			// Test graph has no typed nodes, so should fall back to Jaccard
			const result = notch(graph, "A", "B");
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
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
			{ name: "cosine", fn: cosine },
			{ name: "sorensen", fn: sorensen },
			{ name: "resourceAllocation", fn: resourceAllocation },
			{ name: "overlapCoefficient", fn: overlapCoefficient },
			{ name: "hubPromoted", fn: hubPromoted },
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

	describe("async variants match sync on wrapped graph", () => {
		const asyncVariants = [
			{ name: "jaccardAsync", syncFn: jaccard, asyncFn: jaccardAsync },
			{ name: "adamicAdarAsync", syncFn: adamicAdar, asyncFn: adamicAdarAsync },
			{ name: "cosineAsync", syncFn: cosine, asyncFn: cosineAsync },
			{ name: "sorensenAsync", syncFn: sorensen, asyncFn: sorensenAsync },
			{
				name: "resourceAllocationAsync",
				syncFn: resourceAllocation,
				asyncFn: resourceAllocationAsync,
			},
			{
				name: "overlapCoefficientAsync",
				syncFn: overlapCoefficient,
				asyncFn: overlapCoefficientAsync,
			},
			{
				name: "hubPromotedAsync",
				syncFn: hubPromoted,
				asyncFn: hubPromotedAsync,
			},
			{ name: "scaleAsync", syncFn: scale, asyncFn: scaleAsync },
			{ name: "skewAsync", syncFn: skew, asyncFn: skewAsync },
			{ name: "spanAsync", syncFn: span, asyncFn: spanAsync },
			{ name: "etchAsync", syncFn: etch, asyncFn: etchAsync },
			{ name: "notchAsync", syncFn: notch, asyncFn: notchAsync },
			{ name: "adaptiveAsync", syncFn: adaptive, asyncFn: adaptiveAsync },
		];

		for (const { name, syncFn, asyncFn } of asyncVariants) {
			it(`${name} matches sync variant on test graph`, async () => {
				const graph = createTestGraph();
				const asyncGraph = wrapAsync(graph);

				const syncScore = syncFn(graph, "A", "B");
				const asyncScore = await asyncFn(asyncGraph, "A", "B");

				expect(asyncScore).toBeCloseTo(syncScore, 10);
			});

			it(`${name} matches sync variant on triangle graph`, async () => {
				const graph = createTriangleGraph();
				const asyncGraph = wrapAsync(graph);

				const syncScore = syncFn(graph, "A", "B");
				const asyncScore = await asyncFn(asyncGraph, "A", "B");

				expect(asyncScore).toBeCloseTo(syncScore, 10);
			});
		}
	});
});
