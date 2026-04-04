import { describe, expect, it } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import { basil } from "./basil";
import { brisk } from "./brisk";
import { omnia } from "./omnia";
import { prism } from "./prism";

function createClusteredGraph(): AdjacencyMapGraph {
	const graph = AdjacencyMapGraph.undirected();

	const clusterA = ["A1", "A2", "A3", "A4"];
	const clusterB = ["B1", "B2", "B3", "B4"];
	const clusterC = ["C1", "C2", "C3", "C4"];

	for (const id of [...clusterA, ...clusterB, ...clusterC]) {
		graph.addNode({ id });
	}

	for (const cluster of [clusterA, clusterB, clusterC]) {
		for (let i = 0; i < cluster.length; i++) {
			for (let j = i + 1; j < cluster.length; j++) {
				const source = cluster[i];
				const target = cluster[j];
				if (source !== undefined && target !== undefined) {
					graph.addEdge({ source, target });
				}
			}
		}
	}

	graph.addEdge({ source: "A2", target: "B2" });
	graph.addEdge({ source: "B3", target: "C2" });
	graph.addEdge({ source: "A4", target: "C1" });

	return graph;
}

describe("hybrid seed ensembles", () => {
	it("BRISK returns bounded pairs with metadata", () => {
		const graph = createClusteredGraph();
		const result = brisk(graph, {
			nPairs: 6,
			rngSeed: 42,
			includeGrasp: false,
		});

		expect(result.pairs.length).toBeLessThanOrEqual(6);
		expect(result.pairs.length).toBeGreaterThan(0);
		for (const pair of result.pairs) {
			expect(pair.source.id).not.toBe(pair.target.id);
			expect(Number.isFinite(pair.score)).toBe(true);
			expect(pair.support).toBeGreaterThanOrEqual(0);
		}
	});

	it("BASIL is reproducible with fixed seed", () => {
		const graph = createClusteredGraph();
		const r1 = basil(graph, { nPairs: 8, rngSeed: 123 });
		const r2 = basil(graph, { nPairs: 8, rngSeed: 123 });

		expect(r1.pairs.length).toBe(r2.pairs.length);
		for (let i = 0; i < r1.pairs.length; i++) {
			const p1 = r1.pairs[i];
			const p2 = r2.pairs[i];
			if (p1 !== undefined && p2 !== undefined) {
				expect(p1.source.id).toBe(p2.source.id);
				expect(p1.target.id).toBe(p2.target.id);
			}
		}
	});

	it("PRISM returns non-empty output on connected graphs", () => {
		const graph = createClusteredGraph();
		const result = prism(graph, { nPairs: 7, rngSeed: 77 });
		expect(result.pairs.length).toBeGreaterThan(0);
		expect(result.pairs.length).toBeLessThanOrEqual(7);
	});

	it("OMNIA integrates global-structure components", () => {
		const graph = createClusteredGraph();
		const result = omnia(graph, { nPairs: 8, rngSeed: 99 });

		expect(result.pairs.length).toBeGreaterThan(0);
		expect(result.pairs.length).toBeLessThanOrEqual(8);
		expect(
			result.pairs.some(
				(pair) =>
					pair.components.includes("community_bridge") ||
					pair.components.includes("max_distance"),
			),
		).toBe(true);
	});
});
