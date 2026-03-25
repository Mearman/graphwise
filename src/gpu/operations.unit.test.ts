/**
 * Unit tests for GPU operations.
 */

import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import {
	gpuSpmv,
	gpuPageRank,
	gpuJaccardBatch,
	gpuBfsLevels,
	gpuDegreeHistogram,
	gpuMIBatch,
} from "./operations";

describe("GPU Operations (CPU backend)", () => {
	describe("gpuSpmv", () => {
		it("computes matrix-vector multiplication", async () => {
			const graph = AdjacencyMapGraph.undirected<
				{ id: string },
				{ source: string; target: string; weight: number }
			>();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B", weight: 2 });
			graph.addEdge({ source: "B", target: "C", weight: 3 });

			const x = new Float32Array([1, 2, 3]);
			const result = await gpuSpmv(graph, x, { backend: "cpu" });

			expect(result.backend).toBe("cpu");
			expect(result.value).toHaveLength(3);
			// For undirected graph, each edge is stored in both directions
			// A: 1 neighbor (B), weight 2 → 2 * 2 = 4
			// B: 2 neighbors (A: 2, C: 3) → 2 * 1 + 3 * 3 = 11
			// C: 1 neighbor (B), weight 3 → 3 * 2 = 6
			// Note: x = [1, 2, 3] and edge B-C has weight 3
			expect(result.value[0]).toBeCloseTo(4);
			expect(result.value[1]).toBeCloseTo(11);
			expect(result.value[2]).toBeCloseTo(6);
		});

		it("throws when input vector length mismatches node count", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });

			const x = new Float32Array([1, 2]); // Wrong length

			await expect(gpuSpmv(graph, x, { backend: "cpu" })).rejects.toThrow(
				"Input vector length (2) must match node count (1)",
			);
		});
	});

	describe("gpuPageRank", () => {
		it("computes PageRank scores", async () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "B", target: "C" });
			graph.addEdge({ source: "C", target: "A" });

			const result = await gpuPageRank(graph, {
				backend: "cpu",
				iterations: 10,
			});

			expect(result.backend).toBe("cpu");
			expect(result.value).toHaveLength(3);

			// All nodes should have similar rank in this cycle
			const sum = result.value.reduce((a, b) => a + b, 0);
			expect(sum).toBeCloseTo(1, 1); // Should sum to ~1
		});

		it("respects damping factor", async () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const result = await gpuPageRank(graph, {
				backend: "cpu",
				damping: 0.5,
				iterations: 5,
			});

			expect(result.value).toHaveLength(2);
			expect(result.value[0]).toBeGreaterThan(0);
			expect(result.value[1]).toBeGreaterThan(0);
		});
	});

	describe("gpuJaccardBatch", () => {
		it("computes Jaccard similarity for node pairs", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "B", target: "C" });

			const pairs: [string, string][] = [
				["A", "B"],
				["A", "C"],
				["B", "C"],
			];

			const result = await gpuJaccardBatch(graph, pairs, { backend: "cpu" });

			expect(result.backend).toBe("cpu");
			expect(result.value).toHaveLength(3);

			// A-B: neighbours {B} ∩ {A,C} = ∅, union = {A,B,C}, J = 0
			// A-C: neighbours {B} ∩ {B} = {B}, union = {B}, J = 1
			// B-C: neighbours {A,C} ∩ {B} = ∅, union = {A,B,C}, J = 0
			expect(result.value[0]).toBeCloseTo(0);
			expect(result.value[1]).toBeCloseTo(1);
			expect(result.value[2]).toBeCloseTo(0);
		});

		it("returns 0 for disconnected nodes", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });

			const result = await gpuJaccardBatch(graph, [["A", "B"]], {
				backend: "cpu",
			});

			expect(result.value[0]).toBe(0);
		});
	});

	describe("gpuBfsLevels", () => {
		it("computes BFS levels from source", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addNode({ id: "D" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "B", target: "C" });
			graph.addEdge({ source: "C", target: "D" });

			const result = await gpuBfsLevels(graph, "A", { backend: "cpu" });

			expect(result.backend).toBe("cpu");
			expect(result.value).toHaveLength(4);
			expect(result.value[0]).toBe(0); // A
			expect(result.value[1]).toBe(1); // B
			expect(result.value[2]).toBe(2); // C
			expect(result.value[3]).toBe(3); // D
		});

		it("marks unreachable nodes as -1", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });
			// C is disconnected

			const result = await gpuBfsLevels(graph, "A", { backend: "cpu" });

			expect(result.value[2]).toBe(-1);
		});

		it("throws for non-existent source", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });

			await expect(
				gpuBfsLevels(graph, "NONEXISTENT", { backend: "cpu" }),
			).rejects.toThrow("Source node NONEXISTENT not found");
		});
	});

	describe("gpuDegreeHistogram", () => {
		it("computes degree statistics", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addNode({ id: "D" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });
			graph.addEdge({ source: "A", target: "D" });
			// A has degree 3, B/C/D have degree 1

			const result = await gpuDegreeHistogram(graph, { backend: "cpu" });

			expect(result.backend).toBe("cpu");
			expect(result.value.min).toBe(1);
			expect(result.value.max).toBe(3);
			expect(result.value.mean).toBeCloseTo(1.5); // (3+1+1+1)/4
			expect(result.value.histogram[1]).toBe(3); // 3 nodes with degree 1
			expect(result.value.histogram[3]).toBe(1); // 1 node with degree 3
		});

		it("handles empty graph", async () => {
			const graph = AdjacencyMapGraph.undirected();

			const result = await gpuDegreeHistogram(graph, { backend: "cpu" });

			expect(result.value.min).toBe(0);
			expect(result.value.max).toBe(0);
			expect(result.value.mean).toBe(0);
			expect(result.value.histogram).toEqual([0]);
		});

		it("handles single node", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });

			const result = await gpuDegreeHistogram(graph, { backend: "cpu" });

			expect(result.value.min).toBe(0);
			expect(result.value.max).toBe(0);
			expect(result.value.mean).toBe(0);
		});
	});

	describe("gpuMIBatch", () => {
		it("computes Jaccard for multiple pairs", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addNode({ id: "D" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });
			graph.addEdge({ source: "B", target: "C" });
			graph.addEdge({ source: "C", target: "D" });

			// A: {B, C}, B: {A, C}, C: {A, B, D}, D: {C}
			const pairs: (readonly [string, string])[] = [
				["A", "B"], // intersection: {C} = 1, union: {A, B, C} = 3 → 1/3
				["A", "C"], // intersection: {B} = 1, union: {A, B, C, D} = 4 → 1/4
				["B", "D"], // intersection: {C} = 1, union: {A, C} = 2 → 0.5
			];

			const result = await gpuMIBatch(graph, pairs, "jaccard", {
				backend: "cpu",
			});

			expect(result.backend).toBe("cpu");
			expect(result.value.scores.length).toBe(3);

			// Jaccard(A,B) = 1/3 ≈ 0.333
			expect(result.value.scores[0]).toBeCloseTo(0.333, 2);

			// Jaccard(A,C) = 1/4 = 0.25
			expect(result.value.scores[1]).toBeCloseTo(0.25, 2);

			// Jaccard(B,D) = 1/2 = 0.5
			expect(result.value.scores[2]).toBeCloseTo(0.5, 2);
		});

		it("computes Cosine similarity for multiple pairs", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addNode({ id: "D" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });
			graph.addEdge({ source: "A", target: "D" });
			graph.addEdge({ source: "B", target: "C" });
			graph.addEdge({ source: "C", target: "D" });

			// A: {B, C, D} (deg 3), B: {A, C} (deg 2), C: {A, B, D} (deg 3), D: {A, C} (deg 2)
			// Intersection(A,B): {C} = 1 (C is in both)
			// Intersection(B,D): {} = 0 (B has {A,C}, D has {A,C} - A and C are in both!)
			const pairs: (readonly [string, string])[] = [
				["A", "B"], // intersection: {C} = 1
				["B", "D"], // intersection: {A, C} = 2
			];

			const result = await gpuMIBatch(graph, pairs, "cosine", {
				backend: "cpu",
			});

			expect(result.backend).toBe("cpu");
			expect(result.value.scores.length).toBe(2);

			// Cosine(A,B) = 1 / sqrt(3*2) = 1 / sqrt(6) ≈ 0.408
			expect(result.value.scores[0]).toBeCloseTo(0.408, 2);

			// Cosine(B,D) = 2 / sqrt(2*2) = 2 / 2 = 1.0
			expect(result.value.scores[1]).toBeCloseTo(1.0, 2);
		});

		it("computes Sorensen-Dice for multiple pairs", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });
			graph.addEdge({ source: "B", target: "C" });

			// A: {B, C}, B: {A, C}, C: {A, B}
			const pairs: (readonly [string, string])[] = [["A", "B"]];

			const result = await gpuMIBatch(graph, pairs, "sorensen", {
				backend: "cpu",
			});

			// Sorensen-Dice(A,B) = 2*1 / (2+2) = 2/4 = 0.5
			expect(result.value.scores[0]).toBeCloseTo(0.5, 2);
		});

		it("computes Overlap coefficient for multiple pairs", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addNode({ id: "D" });
			graph.addNode({ id: "E" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });
			graph.addEdge({ source: "A", target: "D" });
			graph.addEdge({ source: "A", target: "E" });
			graph.addEdge({ source: "B", target: "C" });

			// A: {B, C, D, E} (deg 4), B: {A, C} (deg 2), intersection: {C} = 1
			const pairs: (readonly [string, string])[] = [["A", "B"]];

			const result = await gpuMIBatch(graph, pairs, "overlap-coefficient", {
				backend: "cpu",
			});

			// Overlap(A,B) = 1 / min(4, 2) = 1/2 = 0.5
			expect(result.value.scores[0]).toBeCloseTo(0.5, 2);
		});

		it("handles empty pairs array", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });

			const result = await gpuMIBatch(graph, [], "jaccard", {
				backend: "cpu",
			});

			expect(result.value.scores.length).toBe(0);
			expect(result.value.intersections.length).toBe(0);
		});

		it("handles nodes with no neighbours", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });

			// A: {B}, B: {A}, C: {}
			const pairs: (readonly [string, string])[] = [
				["A", "C"], // A has neighbours, C has none → 0
				["C", "C"], // Self-intersection of empty → 0
			];

			const result = await gpuMIBatch(graph, pairs, "jaccard", {
				backend: "cpu",
			});

			expect(result.value.scores[0]).toBe(0);
			expect(result.value.scores[1]).toBe(0);
		});

		it("handles invalid node IDs gracefully", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const pairs: (readonly [string, string])[] = [
				["A", "NONEXISTENT"], // Invalid pair
			];

			const result = await gpuMIBatch(graph, pairs, "jaccard", {
				backend: "cpu",
			});

			// Invalid pairs should return 0
			expect(result.value.scores[0]).toBe(0);
		});

		it("returns raw intersection data alongside scores", async () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });
			graph.addEdge({ source: "B", target: "C" });

			const pairs: (readonly [string, string])[] = [["A", "B"]];

			const result = await gpuMIBatch(graph, pairs, "jaccard", {
				backend: "cpu",
			});

			// Intersection: {C} = 1
			expect(result.value.intersections[0]).toBe(1);
			// Size A: 2, Size B: 2
			expect(result.value.sizeUs[0]).toBe(2);
			expect(result.value.sizeVs[0]).toBe(2);
		});
	});
});
