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
});
