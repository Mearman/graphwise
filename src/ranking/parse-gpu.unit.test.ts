/**
 * Unit tests for GPU-accelerated PARSE ranking.
 */

import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import { parseGpu } from "./parse-gpu";
import type { ExplorationPath } from "../exploration/types";

describe("GPU PARSE ranking", () => {
	it("ranks paths by geometric mean of edge MI scores", async () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "A" });
		graph.addNode({ id: "B" });
		graph.addNode({ id: "C" });
		graph.addNode({ id: "D" });
		graph.addEdge({ source: "A", target: "B" });
		graph.addEdge({ source: "B", target: "C" });
		graph.addEdge({ source: "C", target: "D" });
		graph.addEdge({ source: "A", target: "C" }); // Shared neighbour between A and B

		// Graph structure:
		// A: {B, C}, B: {A, C}, C: {A, B, D}, D: {C}
		// MI(A,B): intersection = {C} = 1, sizes = 2,2 → Jaccard = 1/3
		// MI(B,C): intersection = {A} = 1, sizes = 2,3 → Jaccard = 1/5
		// MI(C,D): intersection = {} = 0, sizes = 3,1 → Jaccard = 0

		const paths: ExplorationPath[] = [
			{
				nodes: ["A", "B", "C"],
				fromSeed: { id: "A" },
				toSeed: { id: "C" },
			},
			{
				nodes: ["A", "C", "D"],
				fromSeed: { id: "A" },
				toSeed: { id: "D" },
			},
		];

		const result = await parseGpu(graph, paths, {
			mi: "jaccard",
			backend: "cpu",
		});

		expect(result.paths.length).toBe(2);
		expect(result.stats.pathsRanked).toBe(2);

		// Both paths should have valid salience scores
		expect(result.paths[0]?.salience).toBeGreaterThan(0);
		expect(result.paths[1]?.salience).toBeGreaterThan(0);

		// Path A-B-C should outrank A-C-D because edge C-D has 0 intersection
		expect(result.paths[0]?.salience).toBeGreaterThan(
			result.paths[1]?.salience ?? 0,
		);
	});

	it("handles empty path array", async () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "A" });

		const result = await parseGpu(graph, [], { backend: "cpu" });

		expect(result.paths.length).toBe(0);
		expect(result.stats.pathsRanked).toBe(0);
		expect(result.stats.meanSalience).toBe(0);
	});

	it("handles single-edge paths", async () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "A" });
		graph.addNode({ id: "B" });
		graph.addNode({ id: "C" });
		graph.addEdge({ source: "A", target: "B" });
		graph.addEdge({ source: "A", target: "C" });
		graph.addEdge({ source: "B", target: "C" });

		const paths: ExplorationPath[] = [
			{
				nodes: ["A", "B"],
				fromSeed: { id: "A" },
				toSeed: { id: "B" },
			},
		];

		const result = await parseGpu(graph, paths, {
			mi: "jaccard",
			backend: "cpu",
		});

		expect(result.paths.length).toBe(1);
		// Single-edge path salience equals the edge MI
		// A: {B, C}, B: {A, C} → intersection = {C} = 1, union = 3 → 1/3
		expect(result.paths[0]?.salience).toBeCloseTo(0.333, 2);
	});

	it("deduplicates shared edges across paths", async () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "A" });
		graph.addNode({ id: "B" });
		graph.addNode({ id: "C" });
		graph.addEdge({ source: "A", target: "B" });
		graph.addEdge({ source: "A", target: "C" });
		graph.addEdge({ source: "B", target: "C" });

		// Two paths sharing the same edge A-B
		const paths: ExplorationPath[] = [
			{
				nodes: ["A", "B"],
				fromSeed: { id: "A" },
				toSeed: { id: "B" },
			},
			{
				nodes: ["A", "B", "C"],
				fromSeed: { id: "A" },
				toSeed: { id: "C" },
			},
		];

		const result = await parseGpu(graph, paths, { backend: "cpu" });

		expect(result.paths.length).toBe(2);
		// Both paths should have valid scores
		expect(result.paths[0]?.salience).toBeGreaterThan(0);
		expect(result.paths[1]?.salience).toBeGreaterThan(0);
	});

	it("supports different MI variants", async () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "A" });
		graph.addNode({ id: "B" });
		graph.addNode({ id: "C" });
		graph.addEdge({ source: "A", target: "B" });
		graph.addEdge({ source: "A", target: "C" });
		graph.addEdge({ source: "B", target: "C" });

		const paths: ExplorationPath[] = [
			{
				nodes: ["A", "B"],
				fromSeed: { id: "A" },
				toSeed: { id: "B" },
			},
		];

		// Test with cosine variant
		const cosineResult = await parseGpu(graph, paths, {
			mi: "cosine",
			backend: "cpu",
		});

		// Cosine(A,B) = 1 / sqrt(2*2) = 0.5
		expect(cosineResult.paths[0]?.salience).toBeCloseTo(0.5, 2);

		// Test with sorensen variant
		const sorensenResult = await parseGpu(graph, paths, {
			mi: "sorensen",
			backend: "cpu",
		});

		// Sorensen(A,B) = 2*1 / (2+2) = 0.5
		expect(sorensenResult.paths[0]?.salience).toBeCloseTo(0.5, 2);
	});

	it("includes statistics in result", async () => {
		const graph = AdjacencyMapGraph.undirected();
		graph.addNode({ id: "A" });
		graph.addNode({ id: "B" });
		graph.addNode({ id: "C" });
		graph.addEdge({ source: "A", target: "B" });
		graph.addEdge({ source: "B", target: "C" });

		const paths: ExplorationPath[] = [
			{
				nodes: ["A", "B", "C"],
				fromSeed: { id: "A" },
				toSeed: { id: "C" },
			},
		];

		const result = await parseGpu(graph, paths, { backend: "cpu" });

		expect(result.stats.pathsRanked).toBe(1);
		expect(result.stats.meanSalience).toBeGreaterThan(0);
		expect(result.stats.medianSalience).toBeGreaterThan(0);
		expect(result.stats.maxSalience).toBeGreaterThan(0);
		expect(result.stats.minSalience).toBeGreaterThanOrEqual(0);
		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});
});
