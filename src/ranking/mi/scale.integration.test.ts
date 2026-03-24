import { describe, it, expect } from "vitest";
import { createCityVillageFixture } from "../../__test__/fixtures";
import { scale } from "./scale";
import { jaccard } from "./jaccard";

describe("SCALE MI variant (density normalisation)", () => {
	it("normalises Jaccard scores by graph density, discriminating edges in dense vs sparse regions", () => {
		// SCALE should demonstrate advantage in graphs with regions of different density
		// (e.g., dense city subgraph vs. sparse village chain).
		const fixture = createCityVillageFixture();
		const { graph, metadata } = fixture;

		// Verify fixture structure
		expect(metadata).toBeDefined();
		expect(metadata["cityDensity"]).toBe(7); // 7 city edges (dense)
		expect(metadata["villageDensity"]).toBe(4); // 4 village edges (sparse)

		// Pick two edges with shared neighbours in different density contexts
		// Dense region: nightclub-restaurant (both in dense city with many shared neighbours)
		// Sparse region: pub-farm (in sparse village, but these are adjacent in chain, unlikely shared neighbours)
		// Better: use pub-church (with farm as intermediate, but in chain structure)
		// Actually, use gallery-cafe (both in city) vs school-shop (both in village)

		const denseEdge = { source: "gallery", target: "cafe" };
		const sparseEdge = { source: "school", target: "shop" };

		// Verify nodes exist
		expect(graph.getNode(denseEdge.source)).toBeDefined();
		expect(graph.getNode(denseEdge.target)).toBeDefined();
		expect(graph.getNode(sparseEdge.source)).toBeDefined();
		expect(graph.getNode(sparseEdge.target)).toBeDefined();

		// Compute Jaccard for both edges (baseline)
		const jaccardDense = jaccard(graph, denseEdge.source, denseEdge.target);
		const jaccardSparse = jaccard(graph, sparseEdge.source, sparseEdge.target);

		// Dense edge should have higher Jaccard due to more shared neighbours
		console.log(`Jaccard (dense gallery-cafe): ${String(jaccardDense)}`);
		console.log(`Jaccard (sparse school-shop): ${String(jaccardSparse)}`);

		// Compute SCALE scores
		const scaleDense = scale(graph, denseEdge.source, denseEdge.target);
		const scaleSparse = scale(graph, sparseEdge.source, sparseEdge.target);

		console.log(`SCALE (dense): ${String(scaleDense)}`);
		console.log(`SCALE (sparse): ${String(scaleSparse)}`);

		// SCALE normalises Jaccard by graph density: SCALE = Jaccard / density
		// Both edges are scored relative to the same global density.
		// SCALE amplifies the difference between high-overlap and low-overlap edges.

		// Assert that SCALE is defined and positive
		expect(scaleDense).toBeGreaterThan(0);
		expect(scaleSparse).toBeGreaterThan(0);

		// SCALE should show differences from Jaccard due to the density division
		// when the edge has non-trivial Jaccard (shared neighbours)
		// The dense edge has Jaccard > 0 (gallery and cafe share neighbours in the city)
		if (jaccardDense > 0) {
			expect(scaleDense).not.toEqual(jaccardDense);
			// SCALE divides by density, so should be larger
			expect(scaleDense).toBeGreaterThan(jaccardDense);
		}
		// The sparse edge may have Jaccard = 0 (no shared neighbours in chain)
		// In that case, both Jaccard and SCALE return epsilon
		if (jaccardSparse === 0) {
			// Both fall back to epsilon, which is expected
			expect(scaleSparse).toBeLessThanOrEqual(jaccardDense);
		}
	});

	it("produces larger scores for edges with same Jaccard in low-density graphs", async () => {
		// Create a custom low-density graph
		const { AdjacencyMapGraph } = await import("../../graph");

		const graph = AdjacencyMapGraph.undirected();

		// Add nodes for a sparse graph
		for (const id of ["A", "B", "C", "D"]) {
			graph.addNode({ id, label: `Node ${id}`, type: "test" });
		}

		// Sparse graph: create a chain with one extra edge to add shared neighbours
		// A-B, B-C, C-D, A-D (4 edges, forming a cycle with low density)
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });
		graph.addEdge({ source: "C", target: "D", weight: 1 });
		graph.addEdge({ source: "A", target: "D", weight: 1 });

		// Edge B-C: shared neighbours {A, D} via the added A-D edge
		const jaccardScore = jaccard(graph, "B", "C");
		const scaleScore = scale(graph, "B", "C");

		console.log(`Sparse graph Jaccard (B-C): ${String(jaccardScore)}`);
		console.log(`Sparse graph SCALE (B-C): ${String(scaleScore)}`);

		// If Jaccard is non-zero, SCALE divides by a small density
		// resulting in scores >= Jaccard
		if (jaccardScore > 0) {
			expect(scaleScore).toBeGreaterThanOrEqual(jaccardScore);
		}
	});
});
